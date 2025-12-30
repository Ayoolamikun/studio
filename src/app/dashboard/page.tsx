
'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
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
import { useToast } from '@/hooks/use-toast';

type Loan = {
  amountRequested: number;
  duration: number;
  interestRate: number;
  totalRepayment: number;
  amountPaid: number;
  balance: number;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'paid' | 'overdue';
  createdAt: string;
};


export default function DashboardPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const activeLoanQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, 'Loans'),
      where('borrowerId', '==', user.uid),
      where('status', 'in', ['active', 'overdue', 'pending', 'approved']),
      limit(1)
    );
  }, [firestore, user?.uid]);

  const pastLoansQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, 'Loans'),
      where('borrowerId', '==', user.uid),
      where('status', 'in', ['paid', 'rejected'])
    );
  }, [firestore, user?.uid]);

  const { data: activeLoans, isLoading: activeLoading } = useCollection<Loan>(activeLoanQuery);
  const { data: pastLoans, isLoading: pastLoading } = useCollection<Loan>(pastLoansQuery);

  const activeLoan = useMemo(() => (activeLoans && activeLoans.length > 0 ? activeLoans[0] : null), [activeLoans]);

  if (isUserLoading || (user && (activeLoading || pastLoading))) {
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
    // This is a placeholder for the top-up functionality.
    toast({
        title: "Feature Coming Soon!",
        description: "The loan top-up feature is currently in development.",
    })
  }

  return (
    <div className="flex min-h-screen flex-col bg-secondary/50">
      <main className="flex-1 container py-8 md:py-12">
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl text-primary">
                  Welcome, {user.displayName || 'Borrower'}
                </h1>
                {activeLoan && (
                    <Button onClick={handleTopUp}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Top Up Loan
                    </Button>
                )}
            </div>

            {activeLoan ? (
              <Tabs defaultValue="details">
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
                                <p className="text-muted-foreground">No past payments found.</p>
                            </CardContent>
                        </Card>
                      )}
                  </TabsContent>
              </Tabs>
            ) : (
                <Card className="text-center py-16 shadow-md">
                  <CardHeader>
                    <CardTitle className="text-2xl font-semibold text-primary">No Active Loans</CardTitle>
                    <CardDescription className="mt-2">You do not have any pending or active loans.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild className="mt-6">
                        <a href="/apply">Apply for a new loan</a>
                    </Button>
                  </CardContent>
                </Card>
            )}
        </div>
      </main>
    </div>
  );
}
