
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

  // This is the critical fix. The query is ONLY constructed when:
  // 1. Auth is not loading (`!isUserLoading`)
  // 2. We have a user object (`!!user`)
  // 3. We have a firestore instance (`!!firestore`)
  // This prevents the query from being created prematurely with a null user.uid,
  // which would result in a permissions error.
  const loansQuery = useMemoFirebase(
    () => {
      if (isUserLoading || !user || !firestore) {
        return null; // Return null if dependencies are not ready
      }
      // This query is now guaranteed to have a valid user.uid
      return query(collection(firestore, 'Loans'), where('borrowerId', '==', user.uid), orderBy('createdAt', 'desc'));
    },
    [firestore, user, isUserLoading] // `isUserLoading` is a key dependency
  );
  
  const { data: loans, isLoading: loansLoading } = useCollection(loansQuery);

  useEffect(() => {
    // If auth is done loading and there's no user, redirect to login.
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  // Combined loading state for auth and data fetching.
  const isLoading = isUserLoading || loansLoading;

  // This check prevents a flash of incorrect content while loading or redirecting.
  // It ensures we don't try to render anything until we have a user and their data.
  if (isLoading || !user) {
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
            <Button variant="outline" onClick={() => auth && signOut(auth)}>Logout</Button>
        </div>

        {loansLoading ? (
            <div className="text-center py-16 bg-background rounded-lg shadow-md">
                <Spinner />
                <p className="text-muted-foreground mt-4">Loading your loan details...</p>
            </div>
        ) : activeLoan ? (
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
