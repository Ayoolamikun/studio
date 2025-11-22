
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { formatCurrency, getInterestRate, calculateTotalRepayment } from '@/lib/utils';
import { Separator } from './ui/separator';

export default function LoanCalculator() {
  const [amount, setAmount] = useState(50000);
  const [duration, setDuration] = useState(12);

  const interestRate = getInterestRate(amount);
  const totalRepayment = calculateTotalRepayment(amount);
  const monthlyRepayment = totalRepayment / duration;

  return (
    <div className="space-y-6">
        <Card className="shadow-none border-0">
          <CardHeader className="p-0">
            <CardTitle className="text-lg">Repayment Calculator</CardTitle>
            <CardDescription>Adjust the sliders to estimate loan costs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 p-0 pt-6">
            <div className="space-y-2">
              <div className="flex justify-between font-medium">
                <Label htmlFor="amount">Loan Amount</Label>
                <span>{formatCurrency(amount)}</span>
              </div>
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
                <div className="flex justify-between font-medium">
                    <Label htmlFor="duration">Loan Duration</Label>
                    <span>{duration} months</span>
                </div>
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
                <CardTitle className="text-lg">Estimated Repayments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-base">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Interest Rate:</span>
                    <span className="font-bold">{(interestRate * 100).toFixed(0)}% Flat</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Monthly Repayment:</span>
                    <span className="font-bold">{formatCurrency(monthlyRepayment)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between text-lg pt-2">
                    <span className="font-bold text-primary">Total Repayment:</span>
                    <span className="font-bold text-primary">{formatCurrency(totalRepayment)}</span>
                </div>
            </CardContent>
            <CardFooter>
                <p className="text-xs text-muted-foreground">
                    This is an estimate. Final terms are confirmed upon approval.
                </p>
            </CardFooter>
        </Card>
    </div>
  );
}
