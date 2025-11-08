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
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Spinner } from '@/components/Spinner';
import { updateDocumentNonBlocking, WithId } from '@/firebase';
import { doc, DocumentData } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Check, X } from 'lucide-react';
import { format } from 'date-fns';

type LoanApplication = {
  fullName: string;
  email: string;
  amount: number;
  typeOfService: string;
  employmentType: string;
  submissionDate: string;
  status: 'pending' | 'approved' | 'rejected';
};

export function LoanApplicationsTab({ applications, isLoading }: { applications: WithId<LoanApplication>[] | null, isLoading: boolean }) {
  const firestore = useFirestore();

  const handleStatusChange = (id: string, status: 'approved' | 'rejected') => {
    if (!firestore) return;
    const docRef = doc(firestore, 'loanApplications', id);
    updateDocumentNonBlocking(docRef, { status });
  };
  
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Loan Applications</CardTitle>
        <CardDescription>Review and manage all submitted loan applications.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Spinner />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Applicant</TableHead>
                <TableHead>Amount (₦)</TableHead>
                <TableHead>Employment</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications && applications.length > 0 ? (
                applications.map(app => (
                  <TableRow key={app.id}>
                    <TableCell>
                      <div className="font-medium">{app.fullName}</div>
                      <div className="text-sm text-muted-foreground">{app.email}</div>
                    </TableCell>
                    <TableCell>{Number(app.amount).toLocaleString()}</TableCell>
                    <TableCell>{app.employmentType}</TableCell>
                    <TableCell>{format(new Date(app.submissionDate), 'PPP')}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(app.status)} className="capitalize">{app.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       {app.status === 'pending' && (
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="icon" onClick={() => handleStatusChange(app.id, 'approved')}>
                                <Check className="h-4 w-4" />
                            </Button>
                             <Button variant="destructive" size="icon" onClick={() => handleStatusChange(app.id, 'rejected')}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                       )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">No loan applications found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
