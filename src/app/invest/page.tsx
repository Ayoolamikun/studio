
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import InvestmentPlansSection from '@/components/InvestmentPlansSection';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function InvestPage() {
  return (
    <div className="flex min-h-screen flex-col bg-secondary/50">
      <Header />
      <main className="flex-1 py-12 md:py-24">
        <InvestmentPlansSection />
        <div className="container mt-12 md:mt-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl text-primary">
              Start Your Investment Journey
            </h2>
            <p className="mt-4 text-muted-foreground md:text-lg">
              Ready to grow your wealth? Contact us or apply below to start with an investment plan. Our team will guide you through the next steps.
            </p>
             <Button asChild size="lg" className="mt-8">
                <Link href="/invest/apply">Apply Now</Link>
             </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
