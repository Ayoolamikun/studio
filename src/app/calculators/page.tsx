
'use client';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LoanCalculator from '@/components/LoanCalculator';

export default function CalculatorsPage() {

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container py-12 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl text-primary">
            Loan Calculator
          </h1>
          <p className="mt-4 text-muted-foreground md:text-lg">
            Estimate your loan repayments with our simple and transparent calculator.
          </p>
        </div>

        <div className="mt-12 mx-auto max-w-lg">
           <LoanCalculator />
        </div>
      </main>
      <Footer />
    </div>
  );
}
