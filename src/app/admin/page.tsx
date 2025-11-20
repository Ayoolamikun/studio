
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { Spinner } from '@/components/Spinner';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';

// A simple type for the claim status
type ClaimStatus = 'unknown' | 'checking' | 'is-admin' | 'not-admin';

export default function AdminPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const [claimStatus, setClaimStatus] = useState<ClaimStatus>('unknown');

  useEffect(() => {
    // If auth is still loading, wait.
    if (isUserLoading) {
      return;
    }
    
    // If auth is done and there's no user, redirect to login.
    if (!user) {
      router.push('/login');
      return;
    }

    // We have a user, now let's verify their admin claim.
    setClaimStatus('checking');

    const checkAdminClaim = async () => {
      // Force refresh the token to get the latest custom claims.
      const idTokenResult = await user.getIdTokenResult(true);
      const claims = idTokenResult.claims;

      if (claims.admin === true) {
        setClaimStatus('is-admin');
      } else {
        // If the user has no admin claim, they are not an admin.
        toast({
            variant: "destructive",
            title: "Permission Denied",
            description: "You do not have the necessary permissions to access this page.",
        });
        setClaimStatus('not-admin');
        router.push('/dashboard');
      }
    };

    checkAdminClaim();

  }, [user, isUserLoading, router, toast]);

  // Show a loading spinner while checking auth and admin status
  if (isUserLoading || claimStatus === 'unknown' || claimStatus === 'checking') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="large" />
        <p className="ml-4">Verifying permissions...</p>
      </div>
    );
  }

  // If user is authenticated and is an admin, show the dashboard
  if (user && claimStatus === 'is-admin') {
    return <AdminDashboard user={user} />;
  }

  // This is a fallback state, typically shown briefly during redirects.
  return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="large" />
      </div>
  );
}
