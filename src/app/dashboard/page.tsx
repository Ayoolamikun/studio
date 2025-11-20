
'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { LoanDetails } from '@/components/dashboard/LoanDetails';
import { LoanHistory } from '@/components/dashboard/LoanHistory';
import { Button } from '@/components/ui/button';
import { WithId } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { formatCurrency, getInterestRate, calculateTotalRepayment } from '@/lib/utils';

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
  
  // Calculator state
  const [amount, setAmount] = useState(50000);
  const [duration, setDuration] = useState(12);

  const interestRate = getInterestRate(amount);
  const totalRepayment = calculateTotalRepayment(amount);
  const monthlyRepayment = totalRepayment / duration;

  return (
    <div className="flex min-h-screen flex-col bg-secondary/50">
      <Header />
      <main className="flex-1 container py-8 md:py-12 space-y-12">
        <div>
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
        </div>
        
        {/* --- Loan Calculator --- */}
        <div>
            <div className="mx-auto max-w-2xl text-center mb-8">
              <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl text-primary">
                Loan Calculator
              </h2>
              <p className="mt-4 text-muted-foreground md:text-lg">
                Estimate your loan repayments.
              </p>
            </div>

            <div className="grid gap-12 md:grid-cols-2">
                <Card className="shadow-xl">
                  <CardHeader>
                    <CardTitle>Repayment Calculator</CardTitle>
                    <CardDescription>Adjust the sliders to see how much your loan will cost.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Loan Amount: {formatCurrency(amount)}</Label>
                      <Slider
                        id="amount"
                        min={10000}
                        max={500000}
                        step={1000}
                        value={[amount]}
                        onValueChange={(value) => setAmount(value[0])}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="duration">Loan Duration: {duration} months</Label>
                       <Slider
                        id="duration"
                        min={1}
                        max={24}
                        step={1}
                        value={[duration]}
                        onValueChange={(value) => setDuration(value[0])}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-background">
                    <CardHeader>
                        <CardTitle>Your Estimated Repayments</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-lg">
                        <div className="flex justify-between">
                            <span>Interest Rate:</span>
                            <span className="font-bold">{(interestRate * 100).toFixed(0)}% Flat</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Monthly Repayment:</span>
                            <span className="font-bold">{formatCurrency(monthlyRepayment)}</span>
                        </div>
                         <div className="flex justify-between text-xl pt-4 border-t">
                            <span className="font-bold text-primary">Total Repayment:</span>
                            <span className="font-bold text-primary">{formatCurrency(totalRepayment)}</span>
                        </div>
                    </CardContent>
                     <CardFooter>
                        <p className="text-xs text-muted-foreground">
                            This is an estimate. The final terms of your loan will be confirmed upon approval.
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
