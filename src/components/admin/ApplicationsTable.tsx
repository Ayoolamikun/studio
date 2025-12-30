
'use client';
import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc } from 'firebase/firestore';
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
import { useCollection, useMemoFirebase, updateDocumentNonBlocking, useAuth, useFirestore } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  status?: 'approved' | 'rejected' | 'pending';
};


export function ApplicationsTable() {
  const firestore = useFirestore();
  const auth = useAuth();
  const functions = auth ? getFunctions(auth.app) : null;
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const applicationsQuery = useMemoFirebase(
    () => firestore ? query(
        collection(firestore, 'loanApplications'), 
        where('status', '==', 'pending'),
        orderBy('submissionDate', 'desc')
    ) : null,
    [firestore]
  );
  
  const { data: applications, isLoading: applicationsLoading } = useCollection<LoanApplication>(applicationsQuery);

  const handleApprove = async (applicationId: string) => {
    if (!functions) return;
    setProcessingId(applicationId);
    
    try {
        const approveApplication = httpsCallable(functions, 'approveApplication');
        const result = await approveApplication({ applicationId });
        const data = result.data as {success: boolean; message: string};

        if (data.success) {
            toast({
                title: 'Success',
                description: data.message
            });
        } else {
             throw new Error(data.message);
        }
    } catch (error: any) {
         toast({
            variant: 'destructive',
            title: 'Approval Failed',
            description: error.message || "An unexpected error occurred.",
        });
    } finally {
        setProcessingId(null);
    }
  };

  const handleReject = async (applicationId: string) => {
      if (!firestore) return;
      setProcessingId(applicationId);
      const docRef = doc(firestore, 'loanApplications', applicationId);
      try {
        updateDocumentNonBlocking(docRef, { status: 'rejected' });
        toast({
            title: 'Application Rejected',
            description: 'The application has been marked as rejected.'
        });
      } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Update Failed',
            description: error.message || "Could not update the application status.",
        });
      } finally {
        setProcessingId(null);
      }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Loan & Service Applications</CardTitle>
        <CardDescription>Review all submissions from the public website form. Approving an application will create a new Loan and Borrower record.</CardDescription>
      </CardHeader>
      <CardContent>
        {applicationsLoading ? (
          <div className="flex justify-center items-center h-64">
            <Spinner size="large" />
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Applicant</TableHead>
                  <TableHead>Service Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right min-w-[200px]">Actions</TableHead>
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
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApprove(item.id)}
                                disabled={processingId === item.id}
                              >
                                  {processingId === item.id ? <Spinner size="small" /> : <Check className="mr-2 h-4 w-4" />}
                                  Approve
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleReject(item.id)}
                                disabled={processingId === item.id}
                              >
                                  {processingId === item.id ? <Spinner size="small" /> : <X className="mr-2 h-4 w-4" />}
                                  Reject
                              </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">No new applications found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
