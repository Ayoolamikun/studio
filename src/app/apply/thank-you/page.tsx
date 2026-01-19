
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';
import { CheckCircle } from 'lucide-react';

export default function ThankYouPage() {
  return (
    <div className="flex min-h-screen flex-col bg-secondary/50 items-center justify-center p-4 text-center">
        <div className="absolute top-8">
            <Logo />
        </div>
        <div className="max-w-md">
            <CheckCircle className="mx-auto h-20 w-20 text-green-500 mb-6" />
            <h1 className="font-headline text-3xl md:text-4xl text-primary font-bold">Application Submitted!</h1>
            <p className="mt-4 text-muted-foreground md:text-lg">
                Thank you for submitting your investment application. Our team will review your information and get back to you within 3-5 business days.
            </p>
            <p className="mt-2 text-muted-foreground">A confirmation has been sent to your email address.</p>
            <Button asChild size="lg" className="mt-8">
              <Link href="/dashboard">
                  Go to My Dashboard
              </Link>
            </Button>
        </div>
        <div className="absolute bottom-8 text-center text-sm text-muted-foreground">
             <p>&copy; 2024 Corporate Magnate Cooperative Society Ltd. All Rights Reserved.</p>
        </div>
    </div>
  );
}
