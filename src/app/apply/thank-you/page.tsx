
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ThankYouPage() {
  return (
    <div className="flex min-h-screen flex-col bg-secondary/50">
      <Header />
      <main className="flex-1 py-12 md:py-24">
        <div className="container flex items-center justify-center">
          <Card className="mx-auto max-w-lg text-center shadow-lg">
            <CardHeader className="items-center">
              <CheckCircle className="h-20 w-20 text-green-500 mb-4" />
              <CardTitle className="font-headline text-3xl text-primary">
                Application Received!
              </CardTitle>
              <CardDescription className="text-lg">
                Thank you for submitting your application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">
                We have successfully received your information. Our team will review your application and get in touch with you within 1-2 business days.
              </p>
              <p className="text-muted-foreground">
                If you have any urgent questions, please don't hesitate to contact us.
              </p>
              <Button asChild>
                <Link href="/">Return to Homepage</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
