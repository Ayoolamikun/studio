
'use client';

import { useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useAuth, useUser, useStorage } from '@/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';

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
  const storage = useStorage();
  const router = useRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();

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

  const { formState: { isSubmitting } } = form;

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

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const fileRef = ref(storage, path);
    const snapshot = await uploadBytes(fileRef, file);
    return getDownloadURL(snapshot.ref);
  };

  const processForm: SubmitHandler<InvestmentApplicationValues> = async (data) => {
    // STEP 1 & 3 from your guide: Prove the handler is firing and isolate from Firebase.
    console.log("SUBMIT CLICKED: Starting test to isolate UI from Firebase.");
    
    // This test waits for 2 seconds then shows an alert.
    // If you see the alert, the form's UI and event handling are working correctly.
    // The problem would then be with the Firebase logic that was here.
    await new Promise(res => setTimeout(res, 2000));
  
    console.log("TEST END");
    alert("FORM SUBMISSION HANDLER WORKS! The problem is with Firebase or file uploads.");


    // Original Firebase logic is commented out below for this test.
    /*
    if (!user) {
      toast({ variant: 'destructive', title: 'Not Authenticated', description: 'You must be logged in to apply.' });
      return;
    }

    try {
      // 1. Upload files in parallel
      const uploadPath = `investment-uploads/${user.uid}/${Date.now()}`;
      const [govIdUrl, proofOfAddressUrl, passportPhotoUrl] = await Promise.all([
        uploadFile(data.govIdFile, `${uploadPath}-id`),
        uploadFile(data.proofOfAddressFile, `${uploadPath}-address`),
        uploadFile(data.passportPhotoFile, `${uploadPath}-passport`),
      ]);

      // 2. Prepare data for backend function (omitting file objects)
      const { govIdFile, proofOfAddressFile, passportPhotoFile, ...formData } = data;
      const applicationData = {
        ...formData,
        govIdUrl,
        proofOfAddressUrl,
        passportPhotoUrl,
      };

      // 3. Call the secure Cloud Function
      const functions = getFunctions(auth.app);
      const submitApplication = httpsCallable(functions, 'submitInvestmentApplication');
      const result = await submitApplication(applicationData);

      const resultData = result.data as { success: boolean; applicationId?: string; message?: string; };
      if (!resultData.success) {
          throw new Error(resultData.message || 'An unknown error occurred on the server.');
      }
      
      // 4. Handle success
      toast({
        title: 'Application Submitted!',
        description: 'Your investment application has been received.',
      });

      router.push('/apply/thank-you');

    } catch (error: any) {
      console.error("Submission Error:", error);
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: error.message || 'An unexpected error occurred. Please try again.',
      });
    }
    */
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
                  encType="multipart/form-data"
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
                  
                  <Button type="submit" size="lg" className="w-full md:w-auto" disabled={isSubmitting}>
                    {isSubmitting ? <><Spinner size="small" /> Submitting...</> : 'Submit Application'}
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
    