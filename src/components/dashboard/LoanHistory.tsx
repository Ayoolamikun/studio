'use client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { WithId } from '@/firebase';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

type Loan = {
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'paid' | 'overdue';
  amountRequested: number;
  createdAt: string;
};

const getStatusVariant = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
}

export function LoanHistory({ loans }: { loans: WithId<Loan>[] }) {
  return (
    <Card className="mt-12">
      <CardHeader>
        <CardTitle>Loan History</CardTitle>
        <CardDescription>Your past loan applications.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loans.map(loan => (
              <TableRow key={loan.id}>
                <TableCell>{format(new Date(loan.createdAt), 'PPP')}</TableCell>
                <TableCell>{formatCurrency(loan.amountRequested)}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(loan.status)} className="capitalize">{loan.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
