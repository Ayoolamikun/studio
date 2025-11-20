
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { Spinner } from '@/components/Spinner';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { LoanDetails } from '@/components/dashboard/LoanDetails';
import { LoanHistory } from '@/components/dashboard/LoanHistory';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  // Redirect to login if auth is done and there's no user.
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  // This is the critical fix: The query is memoized and will only be constructed
  // when all dependencies, including the user object, are available.
  // The 'isUserLoading' dependency prevents the query from running prematurely.
  const loansQuery = useMemoFirebase(
    () => {
      // Return null if dependencies are not ready, preventing an invalid query.
      if (isUserLoading || !user || !firestore) {
        return null;
      }
      // This query is now guaranteed to have a valid user.uid.
      return query(
        collection(firestore, 'Loans'),
        where('borrowerId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
    },
    [firestore, user, isUserLoading] // Key dependencies to recreate the query.
  );
  
  // The useCollection hook will wait until the loansQuery is not null.
  const { data: loans, isLoading: loansLoading } = useCollection(loansQuery);

  // Show a loading spinner until both authentication and data fetching are complete.
  // Also ensures we don't render anything until we are sure we have a user.
  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner size="large" />
      </div>
    );
  }

  // Once authenticated, we can render the main dashboard structure.
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
                    <a href="/apply">Apply for a new loan</a>
                </Button>
            </div>
        )}

        {pastLoans.length > 0 && <LoanHistory loans={pastLoans} />}
      </main>
      <Footer />
    </div>
  );
}
