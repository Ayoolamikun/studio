
import Link from 'next/link';
import { CheckCircle, ArrowRight } from 'lucide-react';
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
                Success! Your Account is Ready.
              </CardTitle>
              <CardDescription className="text-lg">
                Your application has been submitted and an account created for you.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">
                You are now logged in. Our team will review your application and get in touch within 1-2 business days. You can track the status of your application from your new dashboard.
              </p>
              <Button asChild size="lg">
                <Link href="/dashboard">
                    Go to My Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
