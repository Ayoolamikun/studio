'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';

import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { Spinner } from '@/components/Spinner';

export default function AdminPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const adminRoleRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'roles_admin', user.uid) : null),
    [firestore, user]
  );
  const { data: adminRole, isLoading: isAdminRoleLoading } = useDoc(adminRoleRef);

  useEffect(() => {
    // If not loading and user is defined, check role
    if (!isUserLoading && user && !isAdminRoleLoading) {
        // if user is not an admin, redirect to borrower dashboard
        if(!adminRole) {
            router.push('/dashboard');
        }
    }
    
    // if not loading and no user, redirect to login
    if (!isUserLoading && !user) {
        router.push('/login');
    }

  }, [user, adminRole, isUserLoading, isAdminRoleLoading, router]);

  // Show a loading spinner while checking auth and admin status
  if (isUserLoading || isAdminRoleLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="large" />
      </div>
    );
  }

  // If user is authenticated and is an admin, show the dashboard
  if (user && adminRole) {
    return <AdminDashboard user={user} />;
  }

  // Fallback, should be covered by the redirect
  return null;
}
