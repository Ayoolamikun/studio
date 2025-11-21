
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ApplicationForm from '@/components/ApplicationForm';
import InvestmentPlansSection from '@/components/InvestmentPlansSection';

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
              Ready to grow your wealth? Fill out the form below to apply for an investment plan. Our team will guide you through the next steps.
            </p>
          </div>
          <div className="mt-12 mx-auto max-w-3xl">
            <ApplicationForm />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
