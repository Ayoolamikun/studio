
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
    // If auth is done and there's no user, redirect to login.
    if (!isUserLoading && !user) {
      router.push('/login');
      return;
    }
    
    // Once we have a user and Firestore is available...
    if (!isUserLoading && user && firestore && adminRoleRef) {
      const checkAndVerifyAdmin = async () => {
          const adminDoc = await getDoc(adminRoleRef!);
          
          // If the role document doesn't exist AND the user is the designated admin,
          // create the role document for them. This is a critical failsafe.
          if (!adminDoc.exists() && user.email === 'corporatemagnate@outlook.com') {
              console.log('Admin role not found for designated admin. Creating it now...');
              // The `useDoc` hook will automatically update and re-render once this write completes.
              await setDocumentNonBlocking(adminRoleRef!, { isAdmin: true }, {merge: false});
              return; // End this check; the component will re-render with the new role.
          }

          // If roles have loaded and the user does not have the admin role, redirect them.
          if (!isAdminRoleLoading && !adminRole) {
              console.log('User is not an admin. Redirecting to dashboard.');
              router.push('/dashboard');
          }
      };

      checkAndVerifyAdmin();
    }

  }, [user, adminRole, isUserLoading, isAdminRoleLoading, router, firestore, adminRoleRef]);

  // Show a loading spinner while checking auth and admin status
  if (isUserLoading || isAdminRoleLoading || !adminRole) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="large" />
        <p className="ml-4">Verifying permissions...</p>
      </div>
    );
  }

  // If user is authenticated and is an admin, show the dashboard
  if (user && adminRole) {
    return <AdminDashboard user={user} />;
  }

  // This is a fallback state, typically shown briefly during redirects.
  return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="large" />
      </div>
  );
}
