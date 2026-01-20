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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from '@/components/Spinner';
import { useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { HandCoins, Briefcase, Eye } from 'lucide-react';
import Link from 'next/link';

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

  const applicationsQuery = useMemoFirebase(
    () => firestore ? query(
        collection(firestore, 'loanApplications'), 
        where('status', '==', 'Processing'),
        orderBy('createdAt', 'desc')
    ) : null,
    [firestore]
  );
  
  const { data: applications, isLoading: applicationsLoading } = useCollection<LoanApplication>(applicationsQuery);

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
                     <TableCell>{item.loanPurpose}</TableCell>
                    <TableCell>{formatCurrency(item.loanAmount)}</TableCell>
                    <TableCell>{item.createdAt?.toDate ? format(item.createdAt.toDate(), 'PPP') : 'N/A'}</TableCell>
                    <TableCell className="text-right">
                       <Button asChild variant="outline" size="sm">
                          <Link href={`/admin/applications/${item.id}?type=loan`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Link>
                        </Button>
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

    const applicationsQuery = useMemoFirebase(
    () => firestore ? query(
        collection(firestore, 'investmentApplications'), 
        where('status', '==', 'Processing'),
        orderBy('createdAt', 'desc')
    ) : null,
    [firestore]
    );
    
    const { data: applications, isLoading: applicationsLoading } = useCollection<InvestmentApplication>(applicationsQuery);


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
                         <Badge variant="secondary">{item.investmentPlan}</Badge>
                       </TableCell>
                       <TableCell>{formatCurrency(item.investmentAmount)} ({item.currency})</TableCell>
                       <TableCell>{item.createdAt?.toDate ? format(item.createdAt.toDate(), 'PPP') : 'N/A'}</TableCell>
                       <TableCell className="text-right">
                         <Button asChild variant="outline" size="sm">
                            <Link href={`/admin/applications/${item.id}?type=investment`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Link>
                          </Button>
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
