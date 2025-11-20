'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useDoc, useMemoFirebase, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

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
    // If not loading and no user, redirect to login
    if (!isUserLoading && !user) {
      router.push('/login');
      return;
    }
    
    // After user is loaded, perform role checks
    if (!isUserLoading && user && firestore) {
      const checkAndVerifyAdmin = async () => {
          const adminDoc = await getDoc(adminRoleRef!);
          
          // If the document doesn't exist AND the user is the designated admin, create the role.
          // This is a failsafe for the first time the admin logs in.
          if (!adminDoc.exists() && user.email === 'corporatemagnate@outlook.com') {
              console.log('Admin role not found for designated admin. Creating it now...');
              await setDocumentNonBlocking(adminRoleRef!, { isAdmin: true });
              // The useDoc hook will re-render the component with the new role data.
              return;
          }

          // If the role is loaded and they are not an admin, redirect.
          if (!isAdminRoleLoading && !adminRole) {
              console.log('User is not an admin. Redirecting to dashboard.');
              router.push('/dashboard');
          }
      };

      checkAndVerifyAdmin();
    }

  }, [user, adminRole, isUserLoading, isAdminRoleLoading, router, firestore, adminRoleRef]);

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

  // Fallback, should be covered by the redirect or loading state
  return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="large" />
        <p className="ml-4">Verifying permissions...</p>
      </div>
  );
}
