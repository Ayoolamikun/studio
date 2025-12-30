
"use client";

import { useActionState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loanApplicationSchema, LoanApplicationValues } from "@/lib/schemas";
import { submitApplication } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "./ui/separator";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full font-bold bg-accent text-accent-foreground hover:bg-accent/90">
      {pending ? "Submitting..." : "Submit Application"}
    </Button>
  );
}


export default function ApplicationForm() {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  
  const [state, formAction] = useActionState(submitApplication, { success: false, message: "" });

  const form = useForm<LoanApplicationValues>({
    resolver: zodResolver(loanApplicationSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phoneNumber: "",
      amountRequested: 0,
      employmentType: undefined,
      typeOfService: "Loan",
      preferredContactMethod: "Email",
      uploadedDocumentUrl: undefined,
      guarantorFullName: "",
      guarantorPhoneNumber: "",
      guarantorAddress: "",
      guarantorEmploymentPlace: "",
      guarantorRelationship: "",
      guarantorIdUrl: undefined,
    },
    mode: "onChange",
  });

  const employmentType = form.watch("employmentType");

  useEffect(() => {
    if (state.message) {
        if (state.success) {
            toast({
                title: "Success!",
                description: state.message,
            });
            form.reset();
            if(formRef.current) {
                formRef.current.reset();
            }
        } else {
            toast({
                title: "Error",
                description: state.message,
                variant: "destructive",
            });
        }
    }
  }, [state, toast, form]);

  return (
    <Card className="shadow-2xl">
      <CardContent className="p-6 md:p-8">
        <Form {...form}>
          <form
            ref={formRef}
            action={formAction}
            className="space-y-6"
            noValidate
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} name={field.name} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="you@example.com" {...field} name={field.name} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+234..." {...field} name={field.name} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="typeOfService"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type of Service</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} name={field.name}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a service type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Loan">Loan</SelectItem>
                      <SelectItem value="Investment">Investment</SelectItem>
                      <SelectItem value="Membership">Membership</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amountRequested"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount Requested (₦)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="e.g., 50000" 
                      {...field}
                      name={field.name}
                      onChange={e => field.onChange(e.target.valueAsNumber || 0)}
                      value={field.value === 0 ? '' : field.value}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="employmentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Type</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value} name={field.name}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your customer type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="BYSG">BYSG (Bayelsa State Government)</SelectItem>
                      <SelectItem value="Private Individual">Private Individual</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="uploadedDocumentUrl"
              render={() => {
                return (
                  <FormItem>
                    <FormLabel>Upload Document (Optional: Payslip, ID, etc.)</FormLabel>
                    <FormControl>
                      <Input type="file" {...form.register("uploadedDocumentUrl")} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {employmentType === 'Private Individual' && (
              <div className="space-y-6 pt-6 border-t">
                <h3 className="text-lg font-semibold text-primary">Guarantor Information (Required)</h3>
                
                <FormField control={form.control} name="guarantorFullName" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Guarantor Full Name</FormLabel>
                        <FormControl><Input placeholder="Guarantor's name" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="guarantorPhoneNumber" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Guarantor Phone Number</FormLabel>
                        <FormControl><Input placeholder="Guarantor's phone" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="guarantorAddress" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Guarantor Address</FormLabel>
                        <FormControl><Input placeholder="Guarantor's address" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="guarantorEmploymentPlace" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Guarantor Place of Employment</FormLabel>
                        <FormControl><Input placeholder="Where they work" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="guarantorRelationship" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Relationship to Borrower</FormLabel>
                        <FormControl><Input placeholder="e.g., Sibling, Colleague" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                 <FormField
                    control={form.control}
                    name="guarantorIdUrl"
                    render={() => (
                        <FormItem>
                            <FormLabel>Upload Guarantor's ID (PDF or Image)</FormLabel>
                            <FormControl><Input type="file" {...form.register("guarantorIdUrl")} accept="image/*,application/pdf" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
              </div>
            )}


            <FormField
              control={form.control}
              name="preferredContactMethod"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Preferred Contact Method</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4"
                      name={field.name}
                    >
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <RadioGroupItem value="Phone" />
                        </FormControl>
                        <FormLabel className="font-normal">Phone</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <RadioGroupItem value="Email" />
                        </FormControl>
                        <FormLabel className="font-normal">Email</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <SubmitButton />
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
