
'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { LoanDetails } from '@/components/dashboard/LoanDetails';
import { LoanHistory } from '@/components/dashboard/LoanHistory';
import { RepaymentSchedule } from '@/components/dashboard/RepaymentSchedule';
import { Button } from '@/components/ui/button';
import { WithId, useCollection, useMemoFirebase, useUser, useFirestore } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import { Spinner } from '@/components/Spinner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

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
  submissionDate: any;
  status: 'Processing' | 'Approved' | 'Rejected';
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

  const pendingApplicationQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
        collection(firestore, 'loanApplications'),
        where('userId', '==', user.uid),
        where('status', '==', 'Processing'),
        limit(1)
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

  const { data: activeLoans, isLoading: activeLoading } = useCollection<Loan>(activeLoanQuery);
  const { data: pendingApplications, isLoading: pendingLoading } = useCollection<LoanApplication>(pendingApplicationQuery);
  const { data: pastLoans, isLoading: pastLoading } = useCollection<Loan>(pastLoansQuery);

  const activeLoan = useMemo(() => (activeLoans && activeLoans.length > 0 ? activeLoans[0] : null), [activeLoans]);
  const pendingApplication = useMemo(() => (pendingApplications && pendingApplications.length > 0 ? pendingApplications[0] : null), [pendingApplications]);

  const isLoading = isUserLoading || (user && (activeLoading || pastLoading || pendingLoading));

  if (isLoading) {
    return (
        <div className="flex h-screen flex-col items-center justify-center gap-4">
            <Spinner size="large" />
            <p className="text-lg mt-4 text-muted-foreground">Loading Dashboard...</p>
        </div>
    );
  }

  if (!user) {
    // This should be handled by the layout, but as a fallback
    router.push('/login');
    return null;
  }

  const handleTopUp = () => {
    toast("Feature Coming Soon!", {
        description: "The loan top-up feature is currently in development.",
    })
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 container py-8 md:py-12">
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl text-primary">
                  Welcome, {user.displayName || user.email || 'Borrower'}
                </h1>
                {activeLoan && (
                    <Button onClick={handleTopUp}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Top Up Loan
                    </Button>
                )}
            </div>

            {activeLoan ? (
              <Tabs defaultValue="details" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="details">Loan Details</TabsTrigger>
                      <TabsTrigger value="schedule">Repayment Schedule</TabsTrigger>
                      <TabsTrigger value="history">Payment History</TabsTrigger>
                  </TabsList>
                  <TabsContent value="details">
                      <LoanDetails loan={activeLoan} />
                  </TabsContent>
                  <TabsContent value="schedule">
                      <RepaymentSchedule loan={activeLoan} />
                  </TabsContent>
                  <TabsContent value="history">
                      {pastLoans && pastLoans.length > 0 ? (
                        <LoanHistory loans={pastLoans} />
                      ) : (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <p className="text-muted-foreground">No past loan history found.</p>
                            </CardContent>
                        </Card>
                      )}
                  </TabsContent>
              </Tabs>
            ) : pendingApplication ? (
                <Card className="text-center py-16 shadow-md">
                  <CardHeader>
                    <CardTitle className="text-2xl font-semibold text-primary">Application Processing</CardTitle>
                    <CardDescription className="mt-2 text-muted-foreground">
                        Your loan application for {formatCurrency(pendingApplication.loanAmount)} is currently under review.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">We will notify you once a decision has been made. You can check back here for updates.</p>
                  </CardContent>
                </Card>
            ) : (
                <Card className="text-center py-16 shadow-md">
                  <CardHeader>
                    <CardTitle className="text-2xl font-semibold text-primary">No Active Loans</CardTitle>
                    <CardDescription className="mt-2 text-muted-foreground">You do not have any pending or active loans at this time.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild size="lg" className="mt-6 bg-accent text-accent-foreground hover:bg-accent/90">
                        <a href="/apply">Apply for a New Loan</a>
                    </Button>
                  </CardContent>
                </Card>
            )}
        </div>
      </main>
    </div>
  );
}
