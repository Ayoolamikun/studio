'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Spinner } from '@/components/Spinner';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { LoanDetails } from '@/components/dashboard/LoanDetails';
import { LoanHistory } from '@/components/dashboard/LoanHistory';
import { Button } from '@/components/ui/button';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';

export default function DashboardPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const loansQuery = useMemoFirebase(
    () => (firestore && user ? query(collection(firestore, 'Loans'), where('borrowerId', '==', user.uid), orderBy('createdAt', 'desc')) : null),
    [firestore, user]
  );
  const { data: loans, isLoading: loansLoading } = useCollection(loansQuery);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || loansLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="large" />
      </div>
    );
  }

  const activeLoan = loans?.find(loan => loan.status === 'active' || loan.status === 'pending' || loan.status === 'overdue');
  const pastLoans = loans?.filter(loan => loan.status === 'paid' || loan.status === 'rejected') || [];

  return (
    <div className="flex min-h-screen flex-col bg-secondary/50">
      <Header />
      <main className="flex-1 container py-8 md:py-12">
        <div className="flex justify-between items-center mb-8">
            <h1 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl text-primary">
              Welcome, {user?.displayName || 'Borrower'}
            </h1>
            <Button variant="outline" onClick={() => signOut(auth)}>Logout</Button>
        </div>

        {activeLoan ? (
          <LoanDetails loan={activeLoan} />
        ) : (
            <div className="text-center py-16 bg-background rounded-lg shadow-md">
                <h2 className="text-2xl font-semibold text-primary">No Active Loans</h2>
                <p className="text-muted-foreground mt-2">You do not have any pending or active loans.</p>
                <Button asChild className="mt-6">
                    <a href="/login">Apply for a new loan</a>
                </Button>
            </div>
        )}

        {pastLoans.length > 0 && <LoanHistory loans={pastLoans} />}
      </main>
      <Footer />
    </div>
  );
}
