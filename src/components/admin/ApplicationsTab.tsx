
'use client';
import { useState, useMemo } from 'react';
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
import { useCollection, useMemoFirebase, updateDocumentNonBlocking, WithId } from '@/firebase';
import { collection, doc, query, orderBy } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { Check, X } from 'lucide-react';

// From docs/backend.json -> LoanApplication entity
type LoanApplication = {
  fullName: string;
  email: string;
  phoneNumber: string;
  typeOfService: 'Loan' | 'Investment' | 'Membership';
  amountRequested: number;
  employmentType: 'Civil Servant' | 'SME' | 'Individual';
  uploadedDocumentUrl?: string;
  preferredContactMethod: 'Phone' | 'Email';
  submissionDate: string;
  status?: 'reviewed' | 'pending';
};


export function ApplicationsTab() {
  const firestore = useFirestore();

  const applicationsQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'loanApplications'), orderBy('submissionDate', 'desc')) : null,
    [firestore]
  );
  
  const { data: applications, isLoading: applicationsLoading } = useCollection<LoanApplication>(applicationsQuery);

  const handleStatusChange = (id: string, status: LoanApplication['status']) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'loanApplications', id);
    updateDocumentNonBlocking(docRef, { status });
  };
  
  const isLoading = applicationsLoading;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>New Loan & Service Applications</CardTitle>
          <CardDescription>Review all submissions from the public website form.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Spinner size="large" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Service Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications && applications.length > 0 ? (
                  applications.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.fullName}</div>
                          <div className="text-sm text-muted-foreground">{item.email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{item.typeOfService}</Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(item.amountRequested)}</TableCell>
                        <TableCell>{format(new Date(item.submissionDate), 'PPP')}</TableCell>
                        <TableCell>
                          <Badge variant={item.status === 'reviewed' ? 'default' : 'outline'} className="capitalize">
                            {item.status || 'Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.status !== 'reviewed' ? (
                          <div className="flex gap-2 justify-end">
                              <Button variant="outline" size="sm" onClick={() => handleStatusChange(item.id, 'reviewed')}>
                                  <Check className="mr-2 h-4 w-4" />
                                  Mark as Reviewed
                              </Button>
                          </div>
                          ) : (
                            <Button variant="ghost" size="sm" disabled>Reviewed</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">No new applications found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
