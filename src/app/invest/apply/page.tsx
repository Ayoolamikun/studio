
'use client';

import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { InvestmentApplicationSchema, type InvestmentApplicationValues } from '@/lib/schemas';
import { useAuth, useUser, useFirestore, useStorage, errorEmitter, FirestorePermissionError } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/Spinner';
import Link from 'next/link';

export default function InvestmentApplyPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const storage = useStorage();
  const { user, isUserLoading } = useUser();
  const [uploadProgress, setUploadProgress] = useState('');

  const form = useForm<InvestmentApplicationValues>({
    resolver: zodResolver(InvestmentApplicationSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phoneNumber: '',
      country: 'Nigeria',
      investmentAmount: 1000,
      currency: 'NGN',
      notes: '',
      referralCode: '',
      acceptTerms: false,
      acceptPrivacy: false,
      acceptRisks: false,
    },
  });
  
  useEffect(() => {
    if (!isUserLoading) {
      if (user) {
        form.setValue('email', user.email || '');
        form.setValue('fullName', user.displayName || '');
      } else {
        router.push('/login?redirect=/invest/apply');
      }
    }
  }, [user, isUserLoading, router, form]);

  const uploadFile = async (file: File, path: string): Promise<string> => {
    if (!storage) throw new Error("Firebase Storage is not available.");
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };
  
  const onSubmit: SubmitHandler<InvestmentApplicationValues> = async (data) => {
    if (!user || !auth || !firestore) {
      toast.error('Authentication Error', { description: 'You must be logged in to submit.' });
      return;
    }
    form.clearErrors();

    try {
      const basePath = `investment-uploads/${user.uid}/${Date.now()}`;
      
      setUploadProgress('Uploading Government ID...');
      const govIdUrl = await uploadFile(data.govIdFile[0], `${basePath}_govId`);
      
      setUploadProgress('Uploading Proof of Address...');
      const proofOfAddressUrl = await uploadFile(data.proofOfAddressFile[0], `${basePath}_proofOfAddress`);
      
      setUploadProgress('Uploading Passport Photo...');
      const passportPhotoUrl = await uploadFile(data.passportPhotoFile[0], `${basePath}_passport`);

      setUploadProgress('Saving application...');

      const newDocRef = doc(collection(firestore, 'investmentApplications'));

      const submissionData = {
        userId: user.uid,
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
        referralCode: data.referralCode || "",
        notes: data.notes || "",
        status: "Processing",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      toast.success('Application Submitted!', {
        description: 'We will review your application and get back to you shortly.',
      });
      router.push('/apply/thank-you');

      setDoc(newDocRef, submissionData)
        .catch(error => {
          console.error("Submission error:", error);
          errorEmitter.emit(
              'permission-error',
              new FirestorePermissionError({
                  path: newDocRef.path,
                  operation: 'create',
                  requestResourceData: submissionData,
              })
          );
          toast.error('Save Failed in Background', {
            description: "There was a problem saving your application. Please contact support.",
          });
        });

    } catch (error: any) {
      console.error("Submission error:", error);
      toast.error('Submission Failed', {
        description: error.message || 'An unexpected error occurred. Please try again.',
      });
    } finally {
        setUploadProgress('');
    }
  };

  if (isUserLoading || !user) {
     return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <Spinner size="large" />
        <p className="text-lg mt-4">Loading Form...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-secondary/50">
      <Header />
      <main className="flex-1 container py-12">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="font-headline text-3xl">Investment Application</CardTitle>
            <CardDescription>Complete the form below to start your investment journey with us. All fields marked with * are required.</CardDescription>
          </CardHeader>
          <CardContent>
            {uploadProgress && (
              <div className="mb-6 p-4 bg-blue-500/20 border border-blue-400 rounded-lg text-blue-600">
                <div className="flex items-center gap-3">
                  <Spinner size="small" />
                  {uploadProgress}
                </div>
              </div>
            )}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Personal Info */}
                <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-primary">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="fullName" render={({ field }) => (
                            <FormItem><FormLabel>Full Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="email" render={({ field }) => (
                            <FormItem><FormLabel>Email Address *</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                            <FormItem><FormLabel>Phone Number *</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="country" render={({ field }) => (
                            <FormItem><FormLabel>Country *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>
                </div>

                {/* Investment Details */}
                <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-primary">Investment Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <FormField control={form.control} name="investmentPlan" render={({ field }) => (
                            <FormItem><FormLabel>Investment Plan *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a plan" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Gold">Gold Plan (₦0 – ₦10M)</SelectItem>
                                        <SelectItem value="Platinum">Platinum Plan (₦10M+)</SelectItem>
                                    </SelectContent>
                                </Select>
                            <FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="investmentAmount" render={({ field }) => (
                            <FormItem><FormLabel>Investment Amount *</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="currency" render={({ field }) => (
                            <FormItem><FormLabel>Currency *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                     <FormControl><SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="NGN">NGN (Nigerian Naira)</SelectItem>
                                        <SelectItem value="USD">USD (United States Dollar)</SelectItem>
                                    </SelectContent>
                                </Select>
                            <FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="expectedDuration" render={({ field }) => (
                            <FormItem><FormLabel>Expected Duration *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select duration" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="6 Months">6 Months</SelectItem>
                                        <SelectItem value="12 Months">12 Months</SelectItem>
                                        <SelectItem value="24 Months">24 Months</SelectItem>
                                        <SelectItem value="Custom">Custom</SelectItem>
                                    </SelectContent>
                                </Select>
                            <FormMessage /></FormItem>
                        )}/>
                    </div>
                </div>
                
                 {/* Document Upload */}
                <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-primary">Document Upload</h3>
                     <FormField control={form.control} name="govIdType" render={({ field }) => (
                        <FormItem><FormLabel>Government ID Type *</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select ID Type" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="Passport">International Passport</SelectItem>
                                    <SelectItem value="National ID">National ID Card (NIN Slip)</SelectItem>
                                    <SelectItem value="Drivers License">Driver's License</SelectItem>
                                </SelectContent>
                            </Select>
                        <FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="govIdFile" render={({ field }) => (
                        <FormItem><FormLabel>Government ID Upload *</FormLabel><FormControl><Input type="file" onChange={(e) => field.onChange(e.target.files)} /></FormControl><FormMessage /></FormItem>
                    )}/>
                     <FormField control={form.control} name="proofOfAddressFile" render={({ field }) => (
                        <FormItem><FormLabel>Proof of Address Upload * <span className="text-muted-foreground text-xs">(e.g., Utility Bill)</span></FormLabel><FormControl><Input type="file" onChange={(e) => field.onChange(e.target.files)} /></FormControl><FormMessage /></FormItem>
                    )}/>
                     <FormField control={form.control} name="passportPhotoFile" render={({ field }) => (
                        <FormItem><FormLabel>Passport-style Photo *</FormLabel><FormControl><Input type="file" onChange={(e) => field.onChange(e.target.files)} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
                
                {/* Optional Info */}
                 <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-primary">Additional Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <FormField control={form.control} name="referralCode" render={({ field }) => (
                            <FormItem><FormLabel>Referral Code (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>
                    <FormField control={form.control} name="notes" render={({ field }) => (
                        <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>

                {/* Declarations */}
                 <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-primary">Declarations and Agreements</h3>
                    <FormField control={form.control} name="acceptTerms" render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                           <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                           <div className="space-y-1 leading-none"><FormLabel>I agree to the <Link href="/terms-of-service" className="underline" target="_blank">Terms and Conditions</Link> *</FormLabel></div>
                        </FormItem>
                    )}/>
                     <FormField control={form.control} name="acceptPrivacy" render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                           <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                           <div className="space-y-1 leading-none"><FormLabel>I accept the <Link href="/privacy-policy" className="underline" target="_blank">Privacy Policy</Link> *</FormLabel></div>
                        </FormItem>
                    )}/>
                     <FormField control={form.control} name="acceptRisks" render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                           <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                           <div className="space-y-1 leading-none"><FormLabel>I acknowledge the risks associated with investments. *</FormLabel></div>
                        </FormItem>
                    )}/>
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting || !!uploadProgress}>
                  {uploadProgress ? <><Spinner size="small" /> {uploadProgress}</> : 'Submit Investment Application'}
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
