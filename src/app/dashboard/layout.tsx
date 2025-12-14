
'use client';

import { useRouter } from 'next/navigation';
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

  if (isUserLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <Spinner size="large" />
        <p className="text-lg mt-4 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }
  
  // This layout is for standard user dashboards, not the admin panel
  // Admin page has its own layout logic (Sidebar etc.)
  if (user.uid === '1EW8TCRo2LOdJEHrWrrVOTvJZJE2') {
     router.push('/admin');
     return null;
  }

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
