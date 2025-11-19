
"use client";

import { useEffect, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactSchema, ContactValues } from "@/lib/schemas";
import { submitContactInquiry } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Phone, MapPin, Facebook, Instagram, Linkedin } from 'lucide-react';
import { cn } from '@/lib/utils';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full font-bold bg-primary hover:bg-primary/90 text-primary-foreground">
      {pending ? "Sending..." : "Send Message"}
    </Button>
  );
}

const ContactSection = ({ className }: { className?: string }) => {
  const { toast } = useToast();
  const [state, formAction] = useActionState(submitContactInquiry, null);

  const form = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", message: "" },
  });

  useEffect(() => {
    if (state?.success) {
      toast({ title: "Success!", description: state.message });
      form.reset();
    } else if (state?.message && !state.success) {
      toast({ title: "Error", description: state.message, variant: "destructive" });
    }
  }, [state, toast, form]);

  return (
    <section id="contact" className={cn("container", className)}>
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl text-primary">Get in Touch</h2>
        <p className="mt-4 text-muted-foreground md:text-lg">
          Have questions? We're here to help. Reach out to us anytime.
        </p>
      </div>

      <div className="mt-12 grid gap-12 md:grid-cols-2">
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <MapPin className="h-6 w-6 text-primary mt-1" />
            <div>
              <h3 className="font-bold">Our Office</h3>
              <p className="text-muted-foreground">Bayelsa, Nigeria</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <Mail className="h-6 w-6 text-primary mt-1" />
            <div>
              <h3 className="font-bold">Email Us</h3>
              <p className="text-muted-foreground">corporatemagnate@outlook.com</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <Phone className="h-6 w-6 text-primary mt-1" />
            <div>
              <h3 className="font-bold">Call Us</h3>
              <p className="text-muted-foreground">+234 (Number coming soon)</p>
            </div>
          </div>
          <div className="space-y-2 pt-4">
            <h3 className="font-bold">Follow Us</h3>
            <div className="flex gap-4">
                <Button variant="outline" size="icon" asChild><a href="#" aria-label="Facebook"><Facebook /></a></Button>
                <Button variant="outline" size="icon" asChild><a href="#" aria-label="Instagram"><Instagram /></a></Button>
                <Button variant="outline" size="icon" asChild><a href="#" aria-label="LinkedIn"><Linkedin /></a></Button>
            </div>
          </div>
          <div className="pt-4 h-[400px] w-full">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d508894.4958444399!2d5.992641042784852!3d4.924250269926442!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x104264421589e47b%3A0x42468cb50058a594!2sBayelsa!5e0!3m2!1sen!2sng!4v1700000000000"
              width="100%"
              height="100%"
              className="rounded-xl shadow-md border-0"
              allowFullScreen={false}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Map of Bayelsa, Nigeria"
              suppressHydrationWarning
            ></iframe>
          </div>
        </div>
        
        <Card className="shadow-2xl">
          <CardContent className="p-6 md:p-8">
            <Form {...form}>
              <form action={formAction} className="space-y-6" suppressHydrationWarning>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Full Name" {...field} />
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
                      <FormLabel>Your Email</FormLabel>
                      <FormControl>
                        <Input placeholder="you@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Message</FormLabel>
                      <FormControl>
                        <Textarea placeholder="How can we help you?" {...field} rows={5} />
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
      </div>
    </section>
  );
};

export default ContactSection;
