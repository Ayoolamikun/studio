
'use client';

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { firestore, storage } from '@/firebase';
import { useRouter } from 'next/navigation';


import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/Spinner';
import { loanApplicationSchema, type LoanApplicationValues } from '@/lib/schemas';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, ArrowRight, Send } from 'lucide-react';
import { cn } from '@/lib/utils';


export default function ApplyPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  const form = useForm<LoanApplicationValues>({
    resolver: zodResolver(loanApplicationSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phoneNumber: '',
      typeOfService: 'Loan',
      amountRequested: 50000,
      employmentType: 'BYSG',
      preferredContactMethod: 'Email',
      guarantorFullName: '',
      guarantorPhoneNumber: '',
      guarantorAddress: '',
      guarantorEmploymentPlace: '',
      guarantorRelationship: '',
    },
    mode: 'onChange',
  });

  const employmentType = form.watch('employmentType');

  const processForm: SubmitHandler<LoanApplicationValues> = async (data) => {
    if (!firestore || !storage) {
        toast({
            variant: 'destructive',
            title: 'Submission Failed',
            description: 'Firebase is not initialized. Please try again later.',
        });
        return;
    }
    try {
      let uploadedDocumentUrl: string | undefined = undefined;
      let guarantorIdUrl: string | undefined = undefined;

      // --- Handle Main Document Upload ---
      if (data.uploadedDocumentUrl && data.uploadedDocumentUrl.length > 0) {
        const docFile = data.uploadedDocumentUrl[0];
        const docRef = ref(storage, `loan-documents/${Date.now()}_${docFile.name}`);
        await uploadBytes(docRef, docFile);
        uploadedDocumentUrl = await getDownloadURL(docRef);
      }
      
      // --- Handle Guarantor ID Upload (if applicable) ---
      if (data.employmentType === 'Private Individual' && data.guarantorIdUrl && data.guarantorIdUrl.length > 0) {
         const guarantorFile = data.guarantorIdUrl[0];
         const guarantorIdRef = ref(storage, `guarantor-ids/${Date.now()}_${guarantorFile.name}`);
         await uploadBytes(guarantorIdRef, guarantorFile);
         guarantorIdUrl = await getDownloadURL(guarantorIdRef);
      }

      const submissionData = {
        ...data,
        submissionDate: serverTimestamp(),
        status: 'pending',
        uploadedDocumentUrl, // URL from storage
        guarantorIdUrl, // URL from storage
      };
      
      // Remove file list objects before saving to firestore
      delete (submissionData as any).uploadedDocumentUrl;
      delete (submissionData as any).guarantorIdUrl;

      // --- Save to Firestore ---
      await addDoc(collection(firestore, 'loanApplications'), submissionData);

      router.push('/apply/thank-you');
    } catch (error: any) {
      console.error('Submission Error:', error);
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    }
  };

  const steps = [
    { name: 'Personal', fields: ['fullName', 'email', 'phoneNumber', 'preferredContactMethod'] },
    { name: 'Service', fields: ['typeOfService', 'amountRequested', 'employmentType', 'uploadedDocumentUrl'] },
    { name: 'Guarantor', fields: ['guarantorFullName', 'guarantorPhoneNumber', 'guarantorAddress', 'guarantorEmploymentPlace', 'guarantorRelationship', 'guarantorIdUrl'] }
  ];

  const nextStep = async () => {
    const currentFields = steps[currentStep].fields;
    const isValid = await form.trigger(currentFields as (keyof LoanApplicationValues)[]);
    if (isValid) {
      if (currentStep === 1 && employmentType === 'BYSG') {
        // Skip guarantor step if not needed
        setCurrentStep(currentStep + 2); 
      } else {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const prevStep = () => {
    if (currentStep === 3 && employmentType === 'BYSG') {
      setCurrentStep(currentStep - 2);
    } else {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const isFinalStep = currentStep === steps.length || (currentStep === 1 && employmentType === 'BYSG');
  const isGuarantorStep = currentStep === 2 && employmentType === 'Private Individual';


  return (
    <div className="flex min-h-screen flex-col bg-secondary/50">
      <Header />
      <main className="flex-1 py-12 md:py-24">
        <div className="container">
          <Card className="mx-auto max-w-3xl shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-2xl md:text-3xl text-primary">Application Form</CardTitle>
              <CardDescription>
                Complete the steps below to apply. Your information is secure with us.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(processForm)} className="space-y-8">
                  {/* Step 1: Personal Information */}
                  <div className={cn(currentStep === 0 ? 'block' : 'hidden')}>
                    <h3 className="text-lg font-semibold mb-4 text-primary">Step 1: Personal Details</h3>
                    <div className="space-y-4">
                      <FormField control={form.control} name="fullName" render={({ field }) => (
                        <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                        <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="preferredContactMethod" render={({ field }) => (
                         <FormItem className="space-y-3"><FormLabel>How should we contact you?</FormLabel>
                          <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl><RadioGroupItem value="Email" /></FormControl><FormLabel className="font-normal">Email</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl><RadioGroupItem value="Phone" /></FormControl><FormLabel className="font-normal">Phone</FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl><FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>

                  {/* Step 2: Service Details */}
                  <div className={cn(currentStep === 1 ? 'block' : 'hidden')}>
                     <h3 className="text-lg font-semibold mb-4 text-primary">Step 2: Service Details</h3>
                     <div className="space-y-4">
                        <FormField control={form.control} name="typeOfService" render={({ field }) => (
                          <FormItem><FormLabel>Type of Service</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="Loan">Loan</SelectItem>
                                <SelectItem value="Investment">Investment</SelectItem>
                              </SelectContent>
                            </Select><FormMessage />
                          </FormItem>
                        )} />
                         <FormField control={form.control} name="amountRequested" render={({ field }) => (
                            <FormItem><FormLabel>Amount Requested (NGN)</FormLabel>
                            <FormControl><Input type="number" {...field} /></FormControl>
                            <FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="employmentType" render={({ field }) => (
                           <FormItem className="space-y-3"><FormLabel>Customer Type</FormLabel>
                              <FormControl>
                                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                                  <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl><RadioGroupItem value="BYSG" /></FormControl><FormLabel className="font-normal">Civil Servant (BYSG)</FormLabel>
                                  </FormItem>
                                  <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl><RadioGroupItem value="Private Individual" /></FormControl><FormLabel className="font-normal">Private Individual</FormLabel>
                                  </FormItem>
                                </RadioGroup>
                              </FormControl>
                              <FormDescription>BYSG: Bayelsa State Government Employee</FormDescription>
                              <FormMessage />
                          </FormItem>
                        )} />
                         <FormField control={form.control} name="uploadedDocumentUrl" render={({ field: { onChange, ...props } }) => (
                           <FormItem><FormLabel>{`Required Document (Payslip, ID, etc.)`}</FormLabel>
                            <FormControl>
                               <Input type="file" {...props} onChange={(e) => onChange(e.target.files)} />
                            </FormControl>
                           <FormDescription>Please upload your most recent payslip or a valid ID.</FormDescription>
                           <FormMessage /></FormItem>
                        )} />
                     </div>
                  </div>

                  {/* Step 3: Guarantor Details */}
                   <div className={cn(isGuarantorStep ? 'block' : 'hidden')}>
                     <h3 className="text-lg font-semibold mb-4 text-primary">Step 3: Guarantor Details</h3>
                     <p className="text-sm text-muted-foreground mb-4">This section is required for private individuals.</p>
                     <div className="space-y-4">
                        <FormField control={form.control} name="guarantorFullName" render={({ field }) => (
                            <FormItem><FormLabel>Guarantor's Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                         <FormField control={form.control} name="guarantorPhoneNumber" render={({ field }) => (
                            <FormItem><FormLabel>Guarantor's Phone Number</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                         <FormField control={form.control} name="guarantorAddress" render={({ field }) => (
                            <FormItem><FormLabel>Guarantor's Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="guarantorEmploymentPlace" render={({ field }) => (
                            <FormItem><FormLabel>Guarantor's Place of Employment</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="guarantorRelationship" render={({ field }) => (
                            <FormItem><FormLabel>Relationship to Guarantor</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="guarantorIdUrl" render={({ field: { onChange, ...props } }) => (
                           <FormItem><FormLabel>Guarantor's Valid ID Card</FormLabel>
                            <FormControl>
                               <Input type="file" {...props} onChange={(e) => onChange(e.target.files)} />
                            </FormControl>
                           <FormMessage /></FormItem>
                        )} />
                     </div>
                  </div>
                  
                  {isFinalStep && (
                     <div>
                       <h3 className="text-lg font-semibold mb-4 text-primary">Final Step: Review & Submit</h3>
                       <p className="text-muted-foreground">You're all set! Please review your information before submitting. Click the "Submit Application" button below.</p>
                    </div>
                  )}

                  {/* Navigation and Submission */}
                  <Separator className="my-8" />
                  <div className="flex justify-between items-center">
                    <div>
                      {currentStep > 0 && (
                        <Button type="button" variant="outline" onClick={prevStep}>
                          <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                        </Button>
                      )}
                    </div>
                    <div>
                      {!isFinalStep && !isGuarantorStep && (
                        <Button type="button" onClick={nextStep}>
                          Next <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      )}

                       {isGuarantorStep && (
                        <Button type="button" onClick={nextStep}>
                          Review Application <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      )}
                      
                      {isFinalStep && (
                        <Button type="submit" disabled={form.formState.isSubmitting}>
                          {form.formState.isSubmitting ? (
                            <><Spinner size="small" /> Submitting...</>
                          ) : (
                            <><Send className="mr-2 h-4 w-4" /> Submit Application</>
                          )}
                        </Button>
                      )}
                    </div>
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
