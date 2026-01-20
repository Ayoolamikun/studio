'use client';
import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from '@/components/Spinner';
import { useCollection, useMemoFirebase, useAuth, useFirestore, WithId } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { Check, HandCoins, Briefcase, X } from 'lucide-react';
import { toast } from 'sonner';

type LoanApplication = {
  fullName: string;
  email: string;
  loanAmount: number;
  loanPurpose: string;
  createdAt: any;
  status?: 'Approved' | 'Rejected' | 'Processing';
};

type InvestmentApplication = {
  fullName: string;
  email: string;
  investmentAmount: number;
  investmentPlan: string;
  currency: string;
  createdAt: any;
  status?: 'Approved' | 'Rejected' | 'Processing';
}


function LoanApplicationsTab() {
  const firestore = useFirestore();
  const auth = useAuth();
  const functions = auth ? getFunctions(auth.app) : null;
  const [processingId, setProcessingId] = useState<string | null>(null);

  const applicationsQuery = useMemoFirebase(
    () => firestore ? query(
        collection(firestore, 'loanApplications'), 
        where('status', '==', 'Processing'),
        orderBy('createdAt', 'desc')
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
            toast.success('Success', {
                description: data.message
            });
        } else {
             throw new Error(data.message);
        }
    } catch (error: any) {
         toast.error('Approval Failed', {
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
        await updateDoc(docRef, { status: 'Rejected', updatedAt: serverTimestamp() });
        toast.warning('Application Rejected', {
            description: 'The application has been marked as rejected.'
        });
      } catch (error: any) {
        toast.error('Update Failed', {
            description: error.message || "Could not update the application status.",
        });
      } finally {
        setProcessingId(null);
      }
  };

  if (applicationsLoading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Spinner size="large" />
        </div>
    )
  }

  return (
     <div className="w-full overflow-x-auto">
        <Table>
            <TableHeader>
            <TableRow>
                <TableHead className="min-w-[200px]">Applicant</TableHead>
                <TableHead>Details</TableHead>
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
                     <TableCell>{item.loanPurpose}</TableCell>
                    <TableCell>{formatCurrency(item.loanAmount)}</TableCell>
                    <TableCell>{item.createdAt?.toDate ? format(item.createdAt.toDate(), 'PPP') : 'N/A'}</TableCell>
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
                <TableCell colSpan={5} className="text-center h-24">No new loan applications found.</TableCell>
                </TableRow>
            )}
            </TableBody>
        </Table>
    </div>
  )
}

function InvestmentApplicationsTab() {
    const firestore = useFirestore();
    const auth = useAuth();
    const functions = auth ? getFunctions(auth.app) : null;
    const [processingId, setProcessingId] = useState<string | null>(null);

    const applicationsQuery = useMemoFirebase(
    () => firestore ? query(
        collection(firestore, 'investmentApplications'), 
        where('status', '==', 'Processing'),
        orderBy('createdAt', 'desc')
    ) : null,
    [firestore]
    );
    
    const { data: applications, isLoading: applicationsLoading } = useCollection<InvestmentApplication>(applicationsQuery);

    const handleApprove = async (applicationId: string) => {
        if (!functions) return;
        setProcessingId(applicationId);
        
        try {
            const approveInvestment = httpsCallable(functions, 'approveInvestmentApplication');
            const result = await approveInvestment({ applicationId });
            const data = result.data as {success: boolean; message: string};

            if (data.success) {
                toast.success('Success', {
                    description: data.message
                });
            } else {
                throw new Error(data.message);
            }
        } catch (error: any) {
            toast.error('Approval Failed', {
                description: error.message || "An unexpected error occurred.",
            });
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (applicationId: string) => {
        if (!firestore) return;
        setProcessingId(applicationId);
        const docRef = doc(firestore, 'investmentApplications', applicationId);
        try {
            await updateDoc(docRef, { status: 'Rejected', updatedAt: serverTimestamp() });
            toast.warning('Application Rejected', {
                description: 'The application has been marked as rejected.'
            });
        } catch (error: any) {
            toast.error('Update Failed', {
                description: error.message || "Could not update the application status.",
            });
        } finally {
            setProcessingId(null);
        }
    };

    if (applicationsLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Spinner size="large" />
            </div>
        )
    }

    return (
        <div className="w-full overflow-x-auto">
           <Table>
               <TableHeader>
               <TableRow>
                   <TableHead className="min-w-[200px]">Applicant</TableHead>
                   <TableHead>Plan</TableHead>
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
                         <Badge variant="secondary">{item.investmentPlan}</Badge>
                       </TableCell>
                       <TableCell>{formatCurrency(item.investmentAmount)} ({item.currency})</TableCell>
                       <TableCell>{item.createdAt?.toDate ? format(item.createdAt.toDate(), 'PPP') : 'N/A'}</TableCell>
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
                   <TableCell colSpan={5} className="text-center h-24">No new investment applications found.</TableCell>
                   </TableRow>
               )}
               </TableBody>
           </Table>
       </div>
    )
}

export function ApplicationsTable() {

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Applications</CardTitle>
        <CardDescription>Review all new submissions. Approving an application will create a new active record.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="loans">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="loans"><HandCoins className="mr-2 h-4 w-4"/> Loan Applications</TabsTrigger>
                <TabsTrigger value="investments"><Briefcase className="mr-2 h-4 w-4"/> Investment Applications</TabsTrigger>
            </TabsList>
            <TabsContent value="loans" className="mt-6">
                <LoanApplicationsTab />
            </TabsContent>
            <TabsContent value="investments" className="mt-6">
                <InvestmentApplicationsTab />
            </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
