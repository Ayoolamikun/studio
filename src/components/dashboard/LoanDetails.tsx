
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { WithId } from '@/firebase';

type Loan = {
  loanAmount: number;
  duration: number;
  interestRate: number;
  totalRepayment: number;
  amountPaid: number;
  outstandingBalance: number;
  status: 'Processing' | 'Approved' | 'Active' | 'Completed' | 'Overdue' | 'Rejected';
};

const getStatusConfig = (status: Loan['status']) => {
  switch (status) {
    case 'Active':
      return { variant: 'default', className: 'bg-green-500/20 text-green-600', label: 'Active' };
    case 'Completed':
      return { variant: 'default', className: 'bg-primary/20 text-primary', label: 'Completed' };
    case 'Approved':
      return { variant: 'default', className: 'bg-blue-500/20 text-blue-600', label: 'Approved' };
    case 'Processing':
        return { variant: 'secondary', className: 'bg-yellow-500/20 text-yellow-600', label: 'Processing' };
    case 'Overdue':
    case 'Rejected':
      return { variant: 'destructive', className: '', label: status };
    default:
      return { variant: 'secondary', className: '', label: status };
  }
}

export function LoanDetails({ loan }: { loan: WithId<Loan> }) {
  const repaymentProgress = loan.totalRepayment > 0 ? (loan.amountPaid / loan.totalRepayment) * 100 : 0;
  const statusConfig = getStatusConfig(loan.status);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-2xl text-primary">Your Active Loan</CardTitle>
                <CardDescription>Overview of your current loan status.</CardDescription>
            </div>
            <Badge variant={statusConfig.variant} className={`${statusConfig.className} capitalize text-base`}>{statusConfig.label}</Badge>
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
                <p className="text-2xl font-bold text-primary">{formatCurrency(loan.outstandingBalance)}</p>
            </div>
             <div className="bg-secondary p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Amount Borrowed</p>
                <p className="text-2xl font-bold">{formatCurrency(loan.loanAmount)}</p>
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
