'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { WithId } from '@/firebase';

// Assuming Loan entity from backend.json
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

const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
      case 'paid':
        return 'default';
      case 'approved':
        return 'default';
      case 'overdue':
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
}

export function LoanDetails({ loan }: { loan: WithId<Loan> }) {
  const repaymentProgress = (loan.amountPaid / loan.totalRepayment) * 100;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-2xl text-primary">Your Active Loan</CardTitle>
                <CardDescription>Overview of your current loan status.</CardDescription>
            </div>
            <Badge variant={getStatusVariant(loan.status)} className="capitalize text-lg">{loan.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="mb-2 flex justify-between text-lg">
            <span className="text-muted-foreground">Paid</span>
            <span className="font-bold">{formatCurrency(loan.amountPaid)} / {formatCurrency(loan.totalRepayment)}</span>
          </div>
          <Progress value={repaymentProgress} aria-label={`${repaymentProgress.toFixed(0)}% paid`} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-secondary p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Remaining Balance</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(loan.balance)}</p>
            </div>
             <div className="bg-secondary p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Amount Borrowed</p>
                <p className="text-2xl font-bold">{formatCurrency(loan.amountRequested)}</p>
            </div>
             <div className="bg-secondary p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Interest Rate</p>
                <p className="text-2xl font-bold">{loan.interestRate ? `${(loan.interestRate * 100).toFixed(0)}%` : 'N/A'}</p>
            </div>
             <div className="bg-secondary p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="text-2xl font-bold">{loan.duration} months</p>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
