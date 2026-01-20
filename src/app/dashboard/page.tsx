'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { LoanDetails } from '@/components/dashboard/LoanDetails';
import { LoanHistory } from '@/components/dashboard/LoanHistory';
import { RepaymentSchedule } from '@/components/dashboard/RepaymentSchedule';
import { Button } from '@/components/ui/button';
import { WithId, useCollection, useMemoFirebase, useUser, useFirestore } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import { Spinner } from '@/components/Spinner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Briefcase, HandCoins } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import Link from 'next/link';

type Loan = {
  loanAmount: number;
  duration: number;
  interestRate: number;
  totalRepayment: number;
  amountPaid: number;
  outstandingBalance: number;
  status: 'Processing' | 'Approved' | 'Active' | 'Completed' | 'Overdue' | 'Rejected';
  createdAt: any;
  disbursedAt?: any;
};

type LoanApplication = {
  loanAmount: number;
  createdAt: any;
  status: 'pending' | 'approved' | 'rejected';
};

type InvestmentApplication = {
    investmentPlan: string;
    investmentAmount: number;
    currency: string;
    createdAt: any;
    status: 'Processing' | 'Approved' | 'Rejected';
}

type Investment = {
    plan: 'Gold' | 'Platinum';
    amount: number;
    startDate: any;
    duration: number;
    expectedReturn: number;
    maturityDate: any;
    status: 'Active' | 'Matured' | 'Withdrawn';
};

export default function DashboardPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const activeLoanQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, 'Loans'),
      where('borrowerId', '==', user.uid),
      where('status', 'in', ['Active', 'Overdue', 'Approved']),
      limit(1)
    );
  }, [firestore, user?.uid]);

  const pendingLoanApplicationsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
        collection(firestore, 'loanApplications'),
        where('userId', '==', user.uid),
        where('status', '==', 'pending')
    );
  }, [firestore, user?.uid]);

  const pendingInvestmentApplicationsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
        collection(firestore, 'investmentApplications'),
        where('userId', '==', user.uid),
        where('status', '==', 'Processing')
    );
  }, [firestore, user?.uid]);

  const pastLoansQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, 'Loans'),
      where('borrowerId', '==', user.uid),
      where('status', 'in', ['Completed', 'Rejected'])
    );
  }, [firestore, user?.uid]);

  const activeInvestmentsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
        collection(firestore, 'Investments'),
        where('userId', '==', user.uid),
        where('status', '==', 'Active')
    );
  }, [firestore, user?.uid]);

  const { data: activeLoans, isLoading: activeLoading } = useCollection<Loan>(activeLoanQuery);
  const { data: pendingLoanApplications, isLoading: pendingLoansLoading } = useCollection<LoanApplication>(pendingLoanApplicationsQuery);
  const { data: pendingInvestmentApplications, isLoading: pendingInvestmentsLoading } = useCollection<InvestmentApplication>(pendingInvestmentApplicationsQuery);
  const { data: pastLoans, isLoading: pastLoading } = useCollection<Loan>(pastLoansQuery);
  const { data: activeInvestments, isLoading: investmentsLoading } = useCollection<Investment>(activeInvestmentsQuery);

  const activeLoan = useMemo(() => (activeLoans && activeLoans.length > 0 ? activeLoans[0] : null), [activeLoans]);

  const isLoading = isUserLoading || (user && (activeLoading || pastLoading || pendingLoansLoading || pendingInvestmentsLoading || investmentsLoading));

  if (isLoading) {
    return (
        <div className="flex h-screen flex-col items-center justify-center gap-4">
            <Spinner size="large" />
            <p className="text-lg mt-4 text-muted-foreground">Loading Dashboard...</p>
        </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  const handleTopUp = () => {
    toast("Feature Coming Soon!", {
        description: "The loan top-up feature is currently in development.",
    })
  }
  
  const hasPendingLoan = pendingLoanApplications && pendingLoanApplications.length > 0;
  const showNewLoanCard = !activeLoan && !hasPendingLoan;

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 container py-8 md:py-12">
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl text-primary">
                      Welcome, {user.displayName || user.email || 'Borrower'}
                    </h1>
                    <div className='flex items-center gap-2 mt-2'>
                        <p className='text-muted-foreground'>Account Status:</p>
                        <Badge variant="secondary" className='bg-green-500/20 text-green-600'>Verified</Badge>
                    </div>
                </div>
                {activeLoan && (
                    <Button onClick={handleTopUp}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Top Up Loan
                    </Button>
                )}
            </div>

            <Tabs defaultValue="loans" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="loans"><HandCoins className="mr-2 h-4 w-4"/>My Loans</TabsTrigger>
                    <TabsTrigger value="investments"><Briefcase className="mr-2 h-4 w-4"/>My Investments</TabsTrigger>
                </TabsList>
                
                {/* LOANS TAB */}
                <TabsContent value="loans" className="space-y-6">
                    {activeLoan ? (
                        <LoanDetails loan={activeLoan} />
                    ) : hasPendingLoan ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>Pending Loan Applications</CardTitle>
                                <CardDescription>Your loan applications that are currently under review.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Submitted</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead className="text-right">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pendingLoanApplications.map(app => (
                                            <TableRow key={app.id}>
                                                <TableCell>{app.createdAt?.toDate ? format(app.createdAt.toDate(), 'PPP') : 'N/A'}</TableCell>
                                                <TableCell>{formatCurrency(app.loanAmount)}</TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600 capitalize">{app.status}</Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    ) : null }

                    {showNewLoanCard && (
                         <Card className="text-center py-16 shadow-md">
                            <CardHeader>
                                <CardTitle className="text-2xl font-semibold text-primary">Apply for a New Loan</CardTitle>
                                <CardDescription className="mt-2 text-muted-foreground">Ready to start a new financial journey? Apply for a loan today.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button asChild size="lg" className="mt-6 bg-accent text-accent-foreground hover:bg-accent/90">
                                    <Link href="/apply">Apply Now</Link>
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                    
                    {pastLoans && pastLoans.length > 0 && <LoanHistory loans={pastLoans} />}

                    {activeLoan && <RepaymentSchedule loan={activeLoan} />}
                </TabsContent>
                
                {/* INVESTMENTS TAB */}
                <TabsContent value="investments" className="space-y-6">
                    {activeInvestments && activeInvestments.length > 0 ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>Active Investments</CardTitle>
                                <CardDescription>Your portfolio of active investments.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Plan</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Start Date</TableHead>
                                            <TableHead>Maturity Date</TableHead>
                                            <TableHead className="text-right">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {activeInvestments.map(inv => (
                                            <TableRow key={inv.id}>
                                                <TableCell>{inv.plan}</TableCell>
                                                <TableCell>{formatCurrency(inv.amount)}</TableCell>
                                                <TableCell>{inv.startDate?.toDate ? format(inv.startDate.toDate(), 'PPP') : 'N/A'}</TableCell>
                                                <TableCell>{inv.maturityDate?.toDate ? format(inv.maturityDate.toDate(), 'PPP') : 'N/A'}</TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant="default" className="bg-green-500/20 text-green-600 capitalize">{inv.status}</Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    ) : (
                         <Card>
                            <CardHeader>
                                <CardTitle>Active Investments</CardTitle>
                                 <CardDescription>Your active investments will appear here.</CardDescription>
                            </CardHeader>
                            <CardContent>
                               <p className="text-muted-foreground text-center py-8">No active investments found.</p>
                            </CardContent>
                        </Card>
                    )}

                    {pendingInvestmentApplications && pendingInvestmentApplications.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Pending Investment Applications</CardTitle>
                                <CardDescription>Your investment applications currently under review.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                     <TableHeader>
                                        <TableRow>
                                            <TableHead>Submitted</TableHead>
                                            <TableHead>Plan</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead className="text-right">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                         {pendingInvestmentApplications.map(app => (
                                            <TableRow key={app.id}>
                                                <TableCell>{app.createdAt?.toDate ? format(app.createdAt.toDate(), 'PPP') : 'N/A'}</TableCell>
                                                <TableCell>{app.investmentPlan}</TableCell>
                                                <TableCell>{formatCurrency(app.investmentAmount)} ({app.currency})</TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600 capitalize">{app.status}</Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

                    <Card className="text-center py-16 shadow-md">
                        <CardHeader>
                            <CardTitle className="text-2xl font-semibold text-primary">Start a New Investment</CardTitle>
                            <CardDescription className="mt-2 text-muted-foreground">Grow your wealth with our secure investment plans.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button asChild size="lg" className="mt-6">
                                <Link href="/invest/apply">Add New Investment</Link>
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
      </main>
    </div>
  );
}
