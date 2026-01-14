
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
  monthlyRepayment: number;
  duration: number;
  disbursedAt?: any; // Can be a string or a Firestore Timestamp
  status: 'Processing' | 'Approved' | 'Active' | 'Completed' | 'Overdue' | 'Rejected';
};

export function RepaymentSchedule({ loan }: { loan: WithId<Loan> }) {
    const { monthlyRepayment, duration, totalRepayment, disbursedAt } = loan;

    const startDate = disbursedAt?.toDate ? disbursedAt.toDate() : new Date();

    if (loan.status !== 'Active' && loan.status !== 'Overdue') {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Repayment Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-center py-8">
                        Your repayment schedule will be available once the loan is disbursed and active.
                    </p>
                </CardContent>
            </Card>
        )
    }

    const schedule = Array.from({ length: duration || 1 }, (_, i) => {
        const paymentDate = addMonths(startDate, i + 1);
        const newBalance = totalRepayment - monthlyRepayment * (i + 1);
        return {
        date: format(paymentDate, 'PPP'),
        payment: monthlyRepayment,
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
        <div className="w-full overflow-x-auto">
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
        </div>
      </CardContent>
    </Card>
  );
}
