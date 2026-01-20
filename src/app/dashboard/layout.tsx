
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useUser } from '@/firebase';
import { Spinner } from '@/components/Spinner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const ADMIN_UID = "pMju3hGH6SaCOJjJ6hW0BSKzBmS2";

  useEffect(() => {
    if (isUserLoading) return; // Wait until user status is resolved

    if (!user) {
      router.push('/login');
    } else if (user.uid === ADMIN_UID) {
      router.push('/admin');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user || user.uid === ADMIN_UID) {
    // Show a loading spinner while checking auth or redirecting
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <Spinner size="large" />
        <p className="text-lg mt-4 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Render the layout for a standard, non-admin user
  return (
    <div className="flex min-h-screen flex-col bg-secondary/50">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
