
'use client';

import { useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useAuth, useUser, useFirestore, useFunctions } from '@/firebase';
import { httpsCallable } from 'firebase/functions';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';


import { InvestmentApplicationSchema, type InvestmentApplicationValues } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/Spinner';
import Link from 'next/link';

export default function ApplyPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const functions = useFunctions();
  const router = useRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const storage = getStorage();

  const form = useForm<InvestmentApplicationValues>({
    resolver: zodResolver(InvestmentApplicationSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phoneNumber: '',
      country: 'Nigeria',
      investmentAmount: 1000,
      currency: 'NGN',
      referralCode: '',
      notes: '',
      acceptTerms: false,
      acceptPrivacy: false,
      acceptRisks: false,
    },
  });

  // Pre-populate form with user data if available
  useEffect(() => {
    if (user) {
      form.reset({
        ...form.getValues(),
        fullName: user.displayName || '',
        email: user.email || '',
      });
    }
  }, [user, form]);
  
  const { formState: { isSubmitting } } = form;

  const processForm: SubmitHandler<InvestmentApplicationValues> = async (data) => {
    if (!user || !functions) {
        toast({ title: "Error", description: "You must be logged in to submit.", variant: "destructive"});
        return;
    }
    
    try {
      // 1. Upload files and get URLs
      const uploadFile = async (file: File, pathSuffix: string): Promise<string> => {
        const storageRef = ref(storage, `investment-uploads/${user.uid}/${pathSuffix}-${file.name}`);
        await uploadBytes(storageRef, file);
        return getDownloadURL(storageRef);
      };

      const govIdUrl = await uploadFile(data.govIdFile, 'gov-id');
      const proofOfAddressUrl = await uploadFile(data.proofOfAddressFile, 'proof-of-address');
      const passportPhotoUrl = await uploadFile(data.passportPhotoFile, 'passport-photo');

      // 2. Prepare payload for cloud function
      const payload = {
        fullName: data.fullName,
        email: data.email,
        phoneNumber: data.phoneNumber,
        country: data.country,
        investmentPlan: data.investmentPlan,
        investmentAmount: data.investmentAmount,
        currency: data.currency,
        expectedDuration: data.expectedDuration,
        govIdType: data.govIdType,
        govIdUrl,
        proofOfAddressUrl,
        passportPhotoUrl,
        referralCode: data.referralCode,
        notes: data.notes,
      };
      
      // 3. Call the cloud function
      const submitInvestmentApplication = httpsCallable(functions, 'submitInvestmentApplication');
      const result = await submitInvestmentApplication(payload);
      const resultData = result.data as { success: boolean; message?: string; applicationId?: string };

      if (!resultData.success) {
        throw new Error(resultData.message || 'The application could not be submitted.');
      }

      toast({
        title: "Application Submitted!",
        description: "Redirecting you to the confirmation page.",
      });
      
      router.push('/apply/thank-you');

    } catch (err: any) {
      console.error("SUBMISSION ERROR:", err);
      toast({
        title: "Submission Failed",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center"><Spinner size="large" /></div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col bg-secondary/50">
        <Header />
        <main className="flex-1 py-12 md:py-24">
          <div className="container">
            <Card className="mx-auto max-w-2xl text-center">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">Please Log In</CardTitle>
                <CardDescription>You need to be logged in to access the application form.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild size="lg">
                  <Link href="/login?redirect=/apply">Log In or Sign Up</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-secondary/50">
      <Header />
      <main className="flex-1 py-12 md:py-24">
        <div className="container">
          <Card className="mx-auto max-w-4xl shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-2xl md:text-3xl text-primary">
                Investment Application Form
              </CardTitle>
              <CardDescription>
                Please fill out the form below to start your investment journey with us.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(processForm)}
                  method="POST"
                  className="space-y-8"
                >
                  {/* Identity Section */}
                  <section>
                    <h3 className="text-xl font-headline font-semibold mb-4 border-b pb-2 text-primary">Personal Information</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <FormField name="fullName" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField name="email" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl><Input type="email" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField name="phoneNumber" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl><Input type="tel" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField name="country" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country / Location</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </section>
                  
                  {/* Investment Details Section */}
                  <section>
                    <h3 className="text-xl font-headline font-semibold mb-4 border-b pb-2 text-primary">Investment Details</h3>
                     <div className="grid md:grid-cols-2 gap-6">
                        <FormField name="investmentPlan" control={form.control} render={({ field }) => (
                            <FormItem>
                            <FormLabel>Investment Plan</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select a plan" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="Gold">Gold</SelectItem>
                                    <SelectItem value="Platinum">Platinum</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )} />
                        <FormField name="investmentAmount" control={form.control} render={({ field }) => (
                            <FormItem>
                            <FormLabel>Investment Amount</FormLabel>
                            <FormControl><Input type="number" min="1000" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                         <FormField name="currency" control={form.control} render={({ field }) => (
                            <FormItem>
                            <FormLabel>Preferred Currency</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="NGN">NGN (Nigerian Naira)</SelectItem>
                                    <SelectItem value="USD">USD (United States Dollar)</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )} />
                        <FormField name="expectedDuration" control={form.control} render={({ field }) => (
                            <FormItem>
                            <FormLabel>Expected Duration</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select duration" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="6 Months">6 Months</SelectItem>
                                    <SelectItem value="1 Year">1 Year</SelectItem>
                                    <SelectItem value="2 Years">2 Years</SelectItem>
                                    <SelectItem value="3+ Years">3+ Years</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                  </section>

                  {/* Verification Section */}
                  <section>
                    <h3 className="text-xl font-headline font-semibold mb-4 border-b pb-2 text-primary">Verification Documents</h3>
                    <div className="space-y-6">
                        <FormField name="govIdType" control={form.control} render={({ field }) => (
                            <FormItem>
                            <FormLabel>Government ID Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select ID Type" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="National ID (NIN)">National ID (NIN)</SelectItem>
                                    <SelectItem value="Driver's License">Driver's License</SelectItem>
                                    <SelectItem value="International Passport">International Passport</SelectItem>
                                    <SelectItem value="Voter's Card">Voter's Card</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )} />
                        <FormField name="govIdFile" control={form.control} render={({ field: { onChange, ...props } }) => (
                            <FormItem>
                                <FormLabel>Government ID Upload</FormLabel>
                                <FormControl><Input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={e => onChange(e.target.files?.[0])} /></FormControl>
                                <FormDescription>JPG, PNG, or PDF. Max 5MB.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField name="proofOfAddressFile" control={form.control} render={({ field: { onChange, ...props } }) => (
                            <FormItem>
                                <FormLabel>Proof of Address Upload</FormLabel>
                                <FormControl><Input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={e => onChange(e.target.files?.[0])} /></FormControl>
                                <FormDescription>Utility bill or bank statement. Max 5MB.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField name="passportPhotoFile" control={form.control} render={({ field: { onChange, ...props } }) => (
                            <FormItem>
                                <FormLabel>Passport Photograph / Selfie</FormLabel>
                                <FormControl><Input type="file" accept=".jpg,.jpeg,.png" onChange={e => onChange(e.target.files?.[0])} /></FormControl>
                                <FormDescription>A clear, recent photo of yourself. Max 5MB.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                  </section>

                   {/* Optional Section */}
                  <section>
                    <h3 className="text-xl font-headline font-semibold mb-4 border-b pb-2 text-primary">Additional Information</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <FormField name="referralCode" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Referral Code (Optional)</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                       <FormField name="notes" control={form.control} render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Notes / Additional Info (Optional)</FormLabel>
                          <FormControl><Textarea {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </section>
                  
                  {/* Legal Section */}
                  <section>
                      <h3 className="text-xl font-headline font-semibold mb-4 border-b pb-2 text-primary">Agreements</h3>
                      <div className="space-y-4">
                        <FormField name="acceptTerms" control={form.control} render={({ field }) => (
                           <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                <div className="space-y-1 leading-none">
                                    <FormLabel>I agree to the <Link href="/terms-of-service" target="_blank" className="underline text-primary">Terms and Conditions</Link>.</FormLabel>
                                    <FormMessage />
                                </div>
                           </FormItem>
                        )} />
                        <FormField name="acceptPrivacy" control={form.control} render={({ field }) => (
                           <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                <div className="space-y-1 leading-none">
                                    <FormLabel>I have read and agree to the <Link href="/privacy-policy" target="_blank" className="underline text-primary">Privacy Policy</Link>.</FormLabel>
                                    <FormMessage />
                                </div>
                           </FormItem>
                        )} />
                         <FormField name="acceptRisks" control={form.control} render={({ field }) => (
                           <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                <div className="space-y-1 leading-none">
                                    <FormLabel>I understand the risks associated with investment products.</FormLabel>
                                    <FormMessage />
                                </div>
                           </FormItem>
                        )} />
                      </div>
                  </section>
                  
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    size="lg"
                    className="w-full md:w-auto"
                  >
                    {isSubmitting ? <><Spinner size="small" /> Submitting...</> : "Submit Application"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
