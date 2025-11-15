'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { formatCurrency, getInterestRate, calculateTotalRepayment } from '@/lib/utils';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function CalculatorsPage() {
  const [amount, setAmount] = useState(50000);
  const [duration, setDuration] = useState(12);

  const interestRate = getInterestRate(amount);
  const totalRepayment = calculateTotalRepayment(amount);
  const monthlyRepayment = totalRepayment / duration;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container py-12 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl text-primary">
            Loan Calculators
          </h1>
          <p className="mt-4 text-muted-foreground md:text-lg">
            Estimate your loan repayments with our simple and transparent calculator.
          </p>
        </div>

        <div className="mt-12 grid gap-12 md:grid-cols-2">
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

            <Card className="bg-secondary">
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
      </main>
      <Footer />
    </div>
  );
}
