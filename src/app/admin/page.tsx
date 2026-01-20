'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Spinner } from '@/components/Spinner';

// The admin UID for the designated admin user.
const ADMIN_UID = "MUST_BE_REPLACED_WITH_NEW_ADMIN_UID";

export default function AdminRootPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (!isUserLoading) {
      if (!user) {
        // Not logged in, send to login page
        router.replace('/login');
      } else if (user.uid === ADMIN_UID) {
        // User is admin, send to the main admin dashboard
        router.replace('/admin/dashboard');
      } else {
        // User is logged in but not admin, send to their own dashboard
        router.replace('/dashboard');
      }
    }
  }, [user, isUserLoading, router]);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <Spinner size="large" />
      <p className="text-lg mt-4">Loading Admin...</p>
    </div>
  );
}
