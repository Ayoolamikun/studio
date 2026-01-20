'use client';

import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoanApplicationSchema, type LoanApplicationValues } from '@/lib/schemas';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/Spinner';
import Link from 'next/link';

export default function LoanApplicationPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const storage = useStorage();
  const { user, isUserLoading } = useUser();
  const [uploadProgress, setUploadProgress] = useState('');

  const form = useForm<LoanApplicationValues>({
    resolver: zodResolver(LoanApplicationSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      country: 'Nigeria',
      loanAmount: 50000,
      repaymentDuration: '6',
      loanPurpose: 'personal',
      accurateInfo: false,
      termsAndConditions: false,
      identityVerification: false,
    },
  });
  
  useEffect(() => {
    if (!isUserLoading) {
      if (user) {
        form.setValue('email', user.email || '');
        form.setValue('fullName', user.displayName || '');
      } else {
        router.push('/login?redirect=/apply');
      }
    }
  }, [user, isUserLoading, router, form]);

  const uploadFile = async (file: File, path: string): Promise<string> => {
    if (!storage) throw new Error("Firebase Storage is not available.");
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };
  
  const onSubmit: SubmitHandler<LoanApplicationValues> = async (data) => {
    if (!user || !auth || !firestore) {
      toast.error('Authentication Error', { description: 'You must be logged in to submit.' });
      return;
    }
    form.clearErrors();

    try {
      // --- This part is blocking and must complete ---
      const basePath = `loan-applications/${user.uid}/${Date.now()}`;
      setUploadProgress('Uploading Government ID...');
      const governmentIdUrl = await uploadFile(data.governmentIdFile[0], `${basePath}_govId`);
      setUploadProgress('Uploading Proof of Address...');
      const proofOfAddressUrl = await uploadFile(data.proofOfAddressFile[0], `${basePath}_proofOfAddress`);
      setUploadProgress('Uploading Selfie...');
      const selfieUrl = await uploadFile(data.selfieFile[0], `${basePath}_selfie`);
       // --- End of blocking part ---

      setUploadProgress('Saving application...');

      const newDocRef = doc(collection(firestore, 'loanApplications')); // Generate ID client-side

      const submissionData = {
        userId: user.uid,
        userEmail: user.email,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth,
        residentialAddress: data.residentialAddress,
        city: data.city,
        country: data.country,
        loanAmount: data.loanAmount,
        loanPurpose: data.loanPurpose,
        repaymentDuration: parseInt(data.repaymentDuration),
        documents: {
          governmentId: governmentIdUrl,
          proofOfAddress: proofOfAddressUrl,
          selfie: selfieUrl,
        },
        declarations: {
          accurateInfo: data.accurateInfo,
          termsAndConditions: data.termsAndConditions,
          identityVerification: data.identityVerification,
          acceptedAt: new Date().toISOString(),
        },
        status: 'Processing',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // --- Optimistic UI and Non-blocking write ---
      toast.success('Application Submitted!', {
        description: 'We will review your application and get back to you shortly.',
      });
      router.push(`/application-success?id=${newDocRef.id}`);

      // Perform the write in the background
      setDoc(newDocRef, submissionData)
        .catch(error => {
            console.error("Submission error:", error);
            // This will be caught by the global error listener
            errorEmitter.emit(
                'permission-error',
                new FirestorePermissionError({
                    path: newDocRef.path,
                    operation: 'create',
                    requestResourceData: submissionData,
                })
            );
            // We could also show a specific toast here if needed, but the dev overlay is the main goal.
            toast.error('Save Failed in Background', {
              description: "There was a problem saving your application. Please contact support.",
            });
        });

    } catch (error: any) { // This will now only catch upload errors
      console.error("File upload error:", error);
      toast.error('Upload Failed', {
        description: error.message || 'An unexpected error occurred during file upload. Please try again.',
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
            <CardTitle className="font-headline text-3xl">Loan Application</CardTitle>
            <CardDescription>Complete this form to apply for a loan. All fields marked with * are required.</CardDescription>
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
                <section className="space-y-4">
                    <h3 className="text-xl font-semibold text-primary">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="fullName" render={({ field }) => (
                            <FormItem><FormLabel>Full Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="email" render={({ field }) => (
                            <FormItem><FormLabel>Email Address *</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="phone" render={({ field }) => (
                            <FormItem><FormLabel>Phone Number *</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                            <FormItem><FormLabel>Date of Birth *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>
                </section>
                
                 {/* Address Info */}
                <section className="space-y-4">
                    <h3 className="text-xl font-semibold text-primary">Address Information</h3>
                     <FormField control={form.control} name="residentialAddress" render={({ field }) => (
                        <FormItem><FormLabel>Residential Address *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="city" render={({ field }) => (
                            <FormItem><FormLabel>City *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="country" render={({ field }) => (
                            <FormItem><FormLabel>Country *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>
                </section>

                {/* Loan Details */}
                <section className="space-y-4">
                    <h3 className="text-xl font-semibold text-primary">Loan Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="loanAmount" render={({ field }) => (
                            <FormItem><FormLabel>Loan Amount Requested (₦) *</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                         <FormField control={form.control} name="loanPurpose" render={({ field }) => (
                            <FormItem><FormLabel>Loan Purpose *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select purpose" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="business">Business</SelectItem>
                                        <SelectItem value="education">Education</SelectItem>
                                        <SelectItem value="medical">Medical</SelectItem>
                                        <SelectItem value="home">Home Improvement</SelectItem>
                                        <SelectItem value="personal">Personal</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            <FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="repaymentDuration" render={({ field }) => (
                            <FormItem><FormLabel>Repayment Duration *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select duration" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="3">3 months</SelectItem>
                                        <SelectItem value="6">6 months</SelectItem>
                                        <SelectItem value="12">12 months</SelectItem>
                                        <SelectItem value="18">18 months</SelectItem>
                                        <SelectItem value="24">24 months</SelectItem>
                                    </SelectContent>
                                </Select>
                            <FormMessage /></FormItem>
                        )}/>
                    </div>
                </section>
                
                 {/* Document Upload */}
                <section className="space-y-4">
                    <h3 className="text-xl font-semibold text-primary">Identity Verification</h3>
                    <p className="text-sm text-muted-foreground">All documents must be clear and valid. Max file size: 5MB. Accepted formats: JPG, PNG, PDF.</p>
                    <FormField control={form.control} name="governmentIdFile" render={({ field }) => (
                        <FormItem><FormLabel>Government ID Upload * <span className="text-muted-foreground text-xs">(e.g., Passport, NIN Slip)</span></FormLabel><FormControl><Input type="file" accept="image/jpeg,image/png,application/pdf" onChange={(e) => field.onChange(e.target.files)} /></FormControl><FormMessage /></FormItem>
                    )}/>
                     <FormField control={form.control} name="proofOfAddressFile" render={({ field }) => (
                        <FormItem><FormLabel>Proof of Address Upload * <span className="text-muted-foreground text-xs">(e.g., Utility Bill)</span></FormLabel><FormControl><Input type="file" accept="image/jpeg,image/png,application/pdf" onChange={(e) => field.onChange(e.target.files)} /></FormControl><FormMessage /></FormItem>
                    )}/>
                     <FormField control={form.control} name="selfieFile" render={({ field }) => (
                        <FormItem><FormLabel>Selfie Photo *</FormLabel><FormControl><Input type="file" accept="image/jpeg,image/png" onChange={(e) => field.onChange(e.target.files)} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </section>
                
                {/* Declarations */}
                 <section className="space-y-4">
                    <h3 className="text-xl font-semibold text-primary">Declarations & Consent</h3>
                    <FormField control={form.control} name="accurateInfo" render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                           <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                           <div className="space-y-1 leading-none"><FormLabel>I confirm the information provided is accurate and complete. *</FormLabel></div>
                        </FormItem>
                    )}/>
                     <FormField control={form.control} name="termsAndConditions" render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                           <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                           <div className="space-y-1 leading-none"><FormLabel>I agree to the <Link href="/terms-of-service" className="underline" target="_blank">Terms and Conditions</Link> *</FormLabel></div>
                        </FormItem>
                    )}/>
                     <FormField control={form.control} name="identityVerification" render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                           <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                           <div className="space-y-1 leading-none"><FormLabel>I consent to identity verification and understand my documents will be reviewed. *</FormLabel></div>
                        </FormItem>
                    )}/>
                </section>

                <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting || !!uploadProgress}>
                  {uploadProgress ? <><Spinner size="small" /> {uploadProgress}</> : 'Submit Loan Application'}
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
