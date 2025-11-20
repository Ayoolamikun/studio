"use client";

import { useEffect, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loanApplicationSchema, LoanApplicationValues } from "@/lib/schemas";
import { submitApplication } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";

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
  // This hook is correctly renamed to useActionState
  const [state, formAction] = useActionState(submitApplication, null);

  const form = useForm<LoanApplicationValues>({
    resolver: zodResolver(loanApplicationSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phoneNumber: "",
      loanAmount: "",
      loanDuration: "",
      employmentPlace: "",
      bvn: "",
      homeAddress: "",
    },
  });

  useEffect(() => {
    if (state?.success) {
      toast({
        title: "Success!",
        description: state.message,
      });
      form.reset();
    } else if (state?.message && !state.success) {
      toast({
        title: "Error",
        description: state.message,
        variant: "destructive",
      });
    }
  }, [state, toast, form]);

  return (
    <Card className="shadow-2xl">
      <CardContent className="p-6 md:p-8">
        <Form {...form}>
          <form action={formAction} className="space-y-6" suppressHydrationWarning>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} name="fullName" />
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
                      <Input placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

             <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+234..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="bvn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>BVN (Bank Verification Number)</FormLabel>
                      <FormControl>
                        <Input placeholder="11-digit BVN" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

            <FormField
              control={form.control}
              name="homeAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Home Address</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main St, Yenagoa" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="employmentPlace"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Place of Employment</FormLabel>
                  <FormControl>
                    <Input placeholder="Ministry of Finance" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                    control={form.control}
                    name="loanAmount"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Loan Amount Requested (₦)</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder="e.g., 50000" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="loanDuration"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Loan Duration (months)</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder="e.g., 12" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                 <FormField
                    control={form.control}
                    name="passportPhoto"
                    render={({ field: { onChange, value, ...rest } }) => (
                    <FormItem>
                        <FormLabel>Passport Photograph</FormLabel>
                        <FormControl>
                        <Input type="file" onChange={(e) => onChange(e.target.files?.[0])} {...rest} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="idDocument"
                    render={({ field: { onChange, value, ...rest } }) => (
                    <FormItem>
                        <FormLabel>NIN or other ID Document</FormLabel>
                        <FormControl>
                        <Input type="file" onChange={(e) => onChange(e.target.files?.[0])} {...rest} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>

            <SubmitButton />
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
