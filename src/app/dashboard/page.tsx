
'use client';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { LoanDetails } from '@/components/dashboard/LoanDetails';
import { LoanHistory } from '@/components/dashboard/LoanHistory';
import { Button } from '@/components/ui/button';
import { WithId } from '@/firebase';

// Mock data to display the dashboard without authentication
type Loan = {
  amountRequested: number;
  duration: number;
  interestRate: number;
  totalRepayment: number;
  amountPaid: number;
  balance: number;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'paid' | 'overdue';
  createdAt: string;
};

const mockActiveLoan: WithId<Loan> = {
  id: 'loan123',
  amountRequested: 250000,
  duration: 12,
  interestRate: 0.10,
  totalRepayment: 275000,
  amountPaid: 114583,
  balance: 160417,
  status: 'active',
  createdAt: new Date('2023-10-01T10:00:00Z').toISOString(),
};

const mockPastLoans: WithId<Loan>[] = [
    {
        id: 'loan001',
        amountRequested: 100000,
        status: 'paid',
        createdAt: new Date('2023-01-15T10:00:00Z').toISOString(),
        // other fields can be dummy values as they are not shown in the history table
        duration: 6,
        interestRate: 0.15,
        totalRepayment: 115000,
        amountPaid: 115000,
        balance: 0,
    },
    {
        id: 'loan002',
        amountRequested: 75000,
        status: 'rejected',
        createdAt: new Date('2022-11-20T10:00:00Z').toISOString(),
        duration: 6,
        interestRate: 0.15,
        totalRepayment: 86250,
        amountPaid: 0,
        balance: 86250,
    }
];


export default function DashboardPage() {
  const activeLoan = mockActiveLoan;
  const pastLoans = mockPastLoans;

  return (
    <div className="flex min-h-screen flex-col bg-secondary/50">
      <Header />
      <main className="flex-1 container py-8 md:py-12">
        <div className="flex justify-between items-center mb-8">
            <h1 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl text-primary">
              Welcome, Borrower
            </h1>
        </div>

        {activeLoan ? (
          <LoanDetails loan={activeLoan} />
        ) : (
            <div className="text-center py-16 bg-background rounded-lg shadow-md">
                <h2 className="text-2xl font-semibold text-primary">No Active Loans</h2>
                <p className="text-muted-foreground mt-2">You do not have any pending or active loans.</p>
                <Button asChild className="mt-6">
                    <a href="/apply">Apply for a new loan</a>
                </Button>
            </div>
        )}

        {pastLoans.length > 0 && <LoanHistory loans={pastLoans} />}
      </main>
      <Footer />
    </div>
  );
}
