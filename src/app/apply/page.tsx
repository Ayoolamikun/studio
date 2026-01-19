
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { InvestmentApplicationSchema, type InvestmentApplicationValues } from '@/lib/schemas';
import { useRouter } from 'next/navigation';
import { useAuth, useFunctions } from '@/firebase';
import { httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/Spinner';
import Link from 'next/link';

export default function ApplyPage() {
  const auth = useAuth();
  const functions = useFunctions();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<InvestmentApplicationValues>({
    resolver: zodResolver(InvestmentApplicationSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phoneNumber: '',
      country: '',
      investmentPlan: undefined,
      investmentAmount: 0,
      currency: undefined,
      expectedDuration: '',
      govIdType: '',
      referralCode: '',
      notes: '',
      acceptTerms: false,
      acceptPrivacy: false,
      acceptRisks: false,
    },
  });

  const processForm = async (data: InvestmentApplicationValues) => {
    if (!auth?.currentUser) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to submit an application.',
      });
      return;
    }
    if (!functions) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not connect to backend services.' });
        return;
    }

    setIsSubmitting(true);

    try {
      // NOTE: File uploads are temporarily disabled for debugging.
      // This is a placeholder for the real URLs.
      const placeholderFileUrl = "https://example.com/placeholder.pdf";

      const sanitizedData = {
        fullName: data.fullName,
        email: data.email,
        phoneNumber: data.phoneNumber,
        country: data.country,
        investmentPlan: data.investmentPlan,
        investmentAmount: data.investmentAmount,
        currency: data.currency,
        expectedDuration: data.expectedDuration,
        govIdType: data.govIdType,
        govIdUrl: placeholderFileUrl, 
        proofOfAddressUrl: placeholderFileUrl,
        passportPhotoUrl: placeholderFileUrl,
        referralCode: data.referralCode || '',
        notes: data.notes || '',
      };
      
      const submitApplication = httpsCallable(functions, 'submitInvestmentApplication');
      await submitApplication(sanitizedData);

      toast({
        title: 'Success!',
        description: 'Your application has been submitted.',
      });

      router.push('/apply/thank-you');

    } catch (error: any) {
      console.error("Submission Error:", error);
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: error.message || 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-secondary/50">
      <Header />
      <main className="flex-1 container py-12 md:py-24">
        <Card className="mx-auto max-w-4xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-primary">Investment Application</CardTitle>
            <CardDescription>Fill out the form below to start your investment journey with us. All fields marked with an asterisk (*) are required.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(processForm)} className="space-y-8">
                
                {/* Personal Information */}
                <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-primary border-b pb-2">Personal Information</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="fullName" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Full Name *</FormLabel>
                                <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="email" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email Address *</FormLabel>
                                <FormControl><Input type="email" placeholder="you@example.com" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Phone Number *</FormLabel>
                                <FormControl><Input placeholder="+234..." {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="country" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Country of Residence *</FormLabel>
                                <FormControl><Input placeholder="Nigeria" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                </div>

                {/* Investment Details */}
                <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-primary border-b pb-2">Investment Details</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                       <FormField control={form.control} name="investmentPlan" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Investment Plan *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a plan" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Gold">Gold (₦0 - ₦10M)</SelectItem>
                                        <SelectItem value="Platinum">Platinum (₦10M+)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                         <FormField control={form.control} name="investmentAmount" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Investment Amount (₦) *</FormLabel>
                                <FormControl><Input type="number" placeholder="500000" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="currency" render={({ field }) => (
                             <FormItem>
                                <FormLabel>Currency *</FormLabel>
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
                         <FormField control={form.control} name="expectedDuration" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Expected Investment Duration *</FormLabel>
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
                </div>

                {/* Document Uploads */}
                <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-primary border-b pb-2">Document Uploads</h3>
                     <p className="text-sm text-muted-foreground font-bold">NOTE: File uploads are temporarily disabled for testing. You can proceed without selecting files.</p>
                    <div className="grid md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="govIdType" render={({ field }) => (
                             <FormItem>
                                <FormLabel>Government Issued ID Type *</FormLabel>
                                 <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select ID Type" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="NIN">NIN</SelectItem>
                                        <SelectItem value="DriversLicense">Driver's License</SelectItem>
                                        <SelectItem value="Passport">International Passport</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                         <FormField control={form.control} name="govIdFile" render={({ field }) => (
                             <FormItem>
                                <FormLabel>Government ID Upload *</FormLabel>
                                <FormControl><Input type="file" disabled {...form.register('govIdFile')} /></FormControl>
                                <FormMessage />
                            </FormItem>
                         )} />
                          <FormField control={form.control} name="proofOfAddressFile" render={({ field }) => (
                             <FormItem>
                                <FormLabel>Proof of Address Upload *</FormLabel>
                                <FormControl><Input type="file" disabled {...form.register('proofOfAddressFile')} /></FormControl>
                                <FormMessage />
                            </FormItem>
                         )} />
                          <FormField control={form.control} name="passportPhotoFile" render={({ field }) => (
                             <FormItem>
                                <FormLabel>Passport Photograph *</FormLabel>
                                <FormControl><Input type="file" disabled {...form.register('passportPhotoFile')} /></FormControl>
                                <FormMessage />
                            </FormItem>
                         )} />
                    </div>
                </div>

                 {/* Additional Information */}
                <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-primary border-b pb-2">Additional Information</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="referralCode" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Referral Code (Optional)</FormLabel>
                                <FormControl><Input placeholder="MAGNATE2024" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                     <FormField control={form.control} name="notes" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Notes (Optional)</FormLabel>
                            <FormControl><Textarea placeholder="Any additional information you'd like to provide..." {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
                
                 {/* Agreements */}
                <div className="space-y-4">
                     <h3 className="text-xl font-semibold text-primary border-b pb-2">Agreements</h3>
                    <FormField control={form.control} name="acceptTerms" render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                           <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                           <div className="space-y-1 leading-none">
                                <FormLabel>I agree to the <Link href="/terms-of-service" className="underline text-primary" target="_blank">Terms and Conditions</Link>. *</FormLabel>
                                <FormMessage />
                           </div>
                        </FormItem>
                    )} />
                     <FormField control={form.control} name="acceptPrivacy" render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                           <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                           <div className="space-y-1 leading-none">
                                <FormLabel>I have read and accept the <Link href="/privacy-policy" className="underline text-primary" target="_blank">Privacy Policy</Link>. *</FormLabel>
                                <FormMessage />
                           </div>
                        </FormItem>
                    )} />
                     <FormField control={form.control} name="acceptRisks" render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                           <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                           <div className="space-y-1 leading-none">
                                <FormLabel>I acknowledge the risks associated with investments. *</FormLabel>
                                <FormMessage />
                           </div>
                        </FormItem>
                    )} />
                </div>


                <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? <><Spinner size="small" /> Submitting...</> : 'Submit Application'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

    