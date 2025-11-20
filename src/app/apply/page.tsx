
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ApplicationForm from '@/components/ApplicationForm';

export default function ApplyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-secondary/50">
      <Header />
      <main className="flex-1 py-12 md:py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl text-primary">
              Loan & Service Application
            </h1>
            <p className="mt-4 text-muted-foreground md:text-lg">
              Fill out the form below to get started. Our team will review your application and get back to you shortly.
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
