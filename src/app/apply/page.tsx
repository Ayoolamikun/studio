
'use client';

import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';

import { firestore, storage, auth } from '@/firebase';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/Spinner';
import { loanApplicationSchema, type LoanApplicationValues, ACCEPTED_ID_TYPES, ACCEPTED_PHOTO_TYPES, MAX_FILE_SIZE } from '@/lib/schemas';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A helper function to upload a single file to Firebase Storage.
 * @param file The file to upload.
 * @param path The storage path (e.g., 'passports').
 * @returns The download URL of the uploaded file.
 */
const uploadFile = async (file: File, path: string): Promise<string> => {
  if (!storage) throw new Error("Firebase Storage is not initialized.");
  if (!file) throw new Error(`Invalid file provided for path: ${path}`);
  
  const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  return downloadURL;
};

// A helper function to validate a single file. Returns an error message string or null if valid.
const validateFile = (file: any, acceptedTypes: string[], fieldName: string): string | null => {
    if (!file || !(file instanceof File)) {
        return `${fieldName} is required.`;
    }
    if (file.size > MAX_FILE_SIZE) {
        return `${fieldName} is too large. Max size is 2MB.`;
    }
    if (!acceptedTypes.includes(file.type)) {
        return `Invalid file type for ${fieldName}. Please upload one of: ${acceptedTypes.join(', ')}.`;
    }
    return null;
};


export default function ApplyPage() {
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<LoanApplicationValues>({
    resolver: zodResolver(loanApplicationSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      phoneNumber: '',
      placeOfEmployment: '',
      bvn: '',
      loanAmount: 10000,
      loanDuration: 1,
      customerType: 'BYSG',
      guarantorFullName: '',
      guarantorPhoneNumber: '',
      guarantorAddress: '',
      guarantorRelationship: '',
      passportPhotoUrl: undefined,
      idUrl: undefined,
    },
    mode: 'onChange',
  });

  const { formState: { isSubmitting }, watch } = form;
  const customerType = watch('customerType');

  const processForm: SubmitHandler<LoanApplicationValues> = async (data) => {
    if (!firestore || !storage || !auth) {
        toast({
            variant: 'destructive',
            title: 'Submission Failed',
            description: 'Firebase is not initialized. Please try again later.',
        });
        return;
    }

    try {
      // --- 1. Create User Account ---
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      // --- 2. Manual File Validation ---
      const passportFile = data.passportPhotoUrl as File;
      const idFile = data.idUrl as File;

      const passportError = validateFile(passportFile, ACCEPTED_PHOTO_TYPES, 'Passport photograph');
      if (passportError) {
          toast({ variant: 'destructive', title: 'Validation Error', description: passportError });
          return; // Stop submission
      }
      const idError = validateFile(idFile, ACCEPTED_ID_TYPES, 'Valid ID');
      if (idError) {
          toast({ variant: 'destructive', title: 'Validation Error', description: idError });
          return; // Stop submission
      }
      
      // --- 3. File Uploads in Parallel ---
      const uploadPromises: Promise<string>[] = [
          uploadFile(passportFile, 'passports'),
          uploadFile(idFile, 'ids')
      ];
      
      const [passportPhotoUrl, idUrl] = await Promise.all(uploadPromises);

      // --- 4. Create Submission Data ---
      const submissionData: any = {
        userId: user.uid,
        fullName: data.fullName,
        email: data.email,
        phoneNumber: data.phoneNumber,
        placeOfEmployment: data.placeOfEmployment,
        bvn: data.bvn,
        loanAmount: data.loanAmount,
        loanDuration: data.loanDuration,
        customerType: data.customerType,
        passportPhotoUrl, 
        idUrl,
        submissionDate: serverTimestamp(),
        status: 'Processing',
      };

      // Add guarantor info if customer type is Private Individual
      if (data.customerType === 'Private Individual') {
          submissionData.guarantorFullName = data.guarantorFullName;
          submissionData.guarantorPhoneNumber = data.guarantorPhoneNumber;
          submissionData.guarantorAddress = data.guarantorAddress;
          submissionData.guarantorRelationship = data.guarantorRelationship;
      }

      // --- 5. Save to Firestore ---
      await addDoc(collection(firestore, 'loanApplications'), submissionData);

      // --- 6. Redirect on Success ---
      toast({
        title: 'Success!',
        description: 'Account created and application submitted. Redirecting to your dashboard...',
      });
      router.push('/dashboard');

    } catch (error: any) {
      console.error('Submission Error:', error);
      let description = 'An unexpected error occurred. Please check your inputs and try again.';
      if (error.code === 'auth/email-already-in-use') {
          description = 'This email address is already in use. Please log in or use a different email.';
      } else if (error.code === 'storage/unauthorized') {
          description = "Permission denied. Please check Firebase Storage rules."
      } else if (error.code === 'storage/retry-limit-exceeded') {
          description = 'Upload failed due to a network error. Please check your internet connection and try again.'
      } else if (error.message) {
          description = error.message;
      }
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: description,
      });
    }
  };
  

  return (
    <div className="flex min-h-screen flex-col bg-secondary/50">
      <Header />
      <main className="flex-1 py-12 md:py-24">
        <div className="container">
          <Card className="mx-auto max-w-3xl shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-2xl md:text-3xl text-primary">Loan Application & Account Setup</CardTitle>
              <CardDescription>
                Complete the form below to apply for a loan. An account will be created for you to track your application status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(processForm)} className="space-y-8">
                    {/* Personal & Loan Details */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-primary border-b pb-2">Applicant & Loan Information</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="fullName" render={({ field }) => (
                                <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="email" render={({ field }) => (
                                <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="password" render={({ field }) => (
                                <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                                <FormItem><FormLabel>Confirm Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                                <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="placeOfEmployment" render={({ field }) => (
                                <FormItem><FormLabel>Place of Employment</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name="bvn" render={({ field }) => (
                                <FormItem><FormLabel>Bank Verification Number (BVN)</FormLabel><FormControl><Input {...field} maxLength={11} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="customerType" render={({ field }) => (
                                <FormItem><FormLabel>Customer Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                    <SelectItem value="BYSG">Civil Servant (BYSG)</SelectItem>
                                    <SelectItem value="Private Individual">Private Individual</SelectItem>
                                    </SelectContent>
                                </Select><FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="loanAmount" render={({ field }) => (
                                <FormItem><FormLabel>Loan Amount (NGN)</FormLabel>
                                <FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} /></FormControl>
                                <FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="loanDuration" render={({ field }) => (
                                <FormItem><FormLabel>Loan Duration (Months)</FormLabel>
                                <FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} /></FormControl>
                                <FormMessage /></FormItem>
                            )} />
                        </div>
                    </div>

                    {/* Document Uploads */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-primary border-b pb-2">Document Uploads</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="passportPhotoUrl"
                              render={({ field: { value, onChange, ...rest } }) => (
                                <FormItem>
                                  <FormLabel>Passport Photograph</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...rest}
                                      type="file"
                                      accept="image/jpeg,image/png,image/webp"
                                      onChange={(event) => {
                                        const file = event.target.files?.[0];
                                        onChange(file);
                                      }}
                                    />
                                  </FormControl>
                                  <FormDescription>A clear, recent passport-style photo. (Max 2MB)</FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="idUrl"
                              render={({ field: { value, onChange, ...rest } }) => (
                                <FormItem>
                                  <FormLabel>NIN or Valid ID</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...rest}
                                      type="file"
                                      accept="image/jpeg,image/png,image/webp,application/pdf"
                                      onChange={(event) => {
                                        const file = event.target.files?.[0];
                                        onChange(file);
                                      }}
                                    />
                                  </FormControl>
                                  <FormDescription>Upload your National ID, Voter's Card, etc. (Max 2MB)</FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                        </div>
                    </div>

                    {/* Guarantor Details (Conditional) */}
                    <div className={cn(customerType === 'Private Individual' ? 'block' : 'hidden', "space-y-4 transition-all duration-300")}>
                        <h3 className="text-lg font-semibold text-primary border-b pb-2">Guarantor Information</h3>
                         <p className="text-sm text-muted-foreground">A guarantor is required for private individuals.</p>
                         <div className="grid md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="guarantorFullName" render={({ field }) => (
                                <FormItem><FormLabel>Guarantor's Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="guarantorPhoneNumber" render={({ field }) => (
                                <FormItem><FormLabel>Guarantor's Phone Number</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name="guarantorAddress" render={({ field }) => (
                                <FormItem><FormLabel>Guarantor's Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="guarantorRelationship" render={({ field }) => (
                                <FormItem><FormLabel>Relationship to Guarantor</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                    </div>

                    {/* Submission Button */}
                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={isSubmitting} size="lg">
                          {isSubmitting ? (
                            <><Spinner size="small" /> Submitting...</>
                          ) : (
                            <><Send className="mr-2 h-4 w-4" /> Submit Application</>
                          )}
                        </Button>
                    </div>
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
