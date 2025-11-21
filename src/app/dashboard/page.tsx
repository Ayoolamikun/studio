
'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { LoanDetails } from '@/components/dashboard/LoanDetails';
import { LoanHistory } from '@/components/dashboard/LoanHistory';
import { Button } from '@/components/ui/button';
import { WithId, useCollection, useMemoFirebase, useUser, useFirestore } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import { Spinner } from '@/components/Spinner';

// From backend.json, but simplified for this component's needs
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

  // This is the critical fix. The queries are memoized and will only be created
  // when firestore and the user's ID are available. This prevents the
  // permission error caused by running a query without an authenticated user.
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

  // Handle loading and authentication states
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
    return null; // Don't render anything while redirecting
  }

  return (
    <div className="flex min-h-screen flex-col bg-secondary/50">
      <Header />
      <main className="flex-1 container py-8 md:py-12 space-y-12">
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl text-primary">
                  Welcome, {user.displayName || 'Borrower'}
                </h1>
            </div>

            {activeLoan ? (
              <LoanDetails loan={activeLoan} />
            ) : (
                <div className="text-center py-16 bg-background rounded-lg shadow-md">
                    <h2 className="text-2xl font-semibold text-primary">No Active Loans</h2>
                    <p className="text-muted-foreground mt-2">You do not have any pending or active loans.</p>
                    <Button asChild className="mt-6">
                        <a href="/apply">Apply for a new loan</a>
                    </Button>
                </div>
            )}

            {pastLoans && pastLoans.length > 0 && <LoanHistory loans={pastLoans} />}
        </div>
      </main>
      <Footer />
    </div>
  );
}
