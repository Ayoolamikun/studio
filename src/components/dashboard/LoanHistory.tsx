
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
  status: 'Processing' | 'Approved' | 'Active' | 'Completed' | 'Overdue' | 'Rejected';
  loanAmount: number;
  createdAt: any;
};

const getStatusConfig = (status: Loan['status']) => {
  switch (status) {
    case 'Completed':
      return { variant: 'default', className: 'bg-primary/20 text-primary', label: 'Completed' };
    case 'Rejected':
      return { variant: 'destructive', className: '', label: 'Rejected' };
    default:
      return { variant: 'secondary', className: '', label: status };
  }
}

export function LoanHistory({ loans }: { loans: WithId<Loan>[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Loan History</CardTitle>
        <CardDescription>Your past loan applications and their outcomes.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loans.length > 0 ? loans.map(loan => {
                const statusConfig = getStatusConfig(loan.status);
                return (
                  <TableRow key={loan.id}>
                    <TableCell>{loan.createdAt?.toDate ? format(loan.createdAt.toDate(), 'PPP') : 'N/A'}</TableCell>
                    <TableCell>{formatCurrency(loan.loanAmount)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={statusConfig.variant} className={`${statusConfig.className} capitalize`}>{statusConfig.label}</Badge>
                    </TableCell>
                  </TableRow>
                )
            }) : (
                <TableRow>
                    <TableCell colSpan={3} className="text-center h-24">No past loans found.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
