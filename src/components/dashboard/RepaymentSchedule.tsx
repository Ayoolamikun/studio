'use client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { WithId } from '@/firebase';
import { addMonths, format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

type Loan = {
  totalRepayment: number;
  duration: number;
  createdAt: string;
};

export function RepaymentSchedule({ loan }: { loan: WithId<Loan> }) {
  const monthlyPayment = loan.totalRepayment / (loan.duration || 12);
  const schedule = Array.from({ length: loan.duration || 12 }, (_, i) => {
    const paymentDate = addMonths(new Date(loan.createdAt), i + 1);
    const newBalance = loan.totalRepayment - monthlyPayment * (i + 1);
    return {
      date: format(paymentDate, 'PPP'),
      payment: monthlyPayment,
      balance: newBalance > 0 ? newBalance : 0,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Repayment Schedule</CardTitle>
        <CardDescription>Your projected payment schedule for this loan.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Payment Amount</TableHead>
              <TableHead className="text-right">Remaining Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedule.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{item.date}</TableCell>
                <TableCell>{formatCurrency(item.payment)}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.balance)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
