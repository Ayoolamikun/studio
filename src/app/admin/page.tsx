'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Spinner } from '@/components/Spinner';

export default function AdminRootPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (!isUserLoading) {
      if (!user) {
        router.push('/login');
      } else {
        router.push('/admin/dashboard');
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
