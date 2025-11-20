
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { Spinner } from '@/components/Spinner';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';
import { getAuth } from 'firebase/auth';

// A simple type for the claim status
type ClaimStatus = 'unknown' | 'checking' | 'is-admin' | 'not-admin' | 'granting';

export default function AdminPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const [claimStatus, setClaimStatus] = useState<ClaimStatus>('unknown');

  useEffect(() => {
    if (isUserLoading) {
      return; // Wait until the user object is available.
    }
    
    if (!user) {
      router.push('/login'); // If no user, redirect to login.
      return;
    }

    const checkAdminClaim = async () => {
      setClaimStatus('checking');
      const idTokenResult = await user.getIdTokenResult(true); // Force refresh claims
      
      if (idTokenResult.claims.admin === true) {
        setClaimStatus('is-admin');
      } else {
        // This is the bootstrap logic for the very first admin.
        // It calls the Cloud Function to grant the claim.
        setClaimStatus('granting');
        toast({
            title: "First-time Admin Setup",
            description: "Attempting to grant admin privileges. This may take a moment...",
        });

        try {
            const functions = getFunctions(getAuth().app);
            const grantAdminRole = httpsCallable(functions, 'grantAdminRole');
            const result = await grantAdminRole({ uid: user.uid });
            
            toast({
                title: "Success!",
                description: "Admin privileges granted. Refreshing page.",
            });
            
            // The claims have been set, now we need to refresh the token again to see them.
            await user.getIdTokenResult(true);
            
            // A page reload is the most reliable way to ensure all components re-evaluate with new claims.
            window.location.reload();

        } catch (error: any) {
            console.error("Admin claim error:", error);
            toast({
                variant: "destructive",
                title: "Permission Denied",
                description: error.message || "You do not have the necessary permissions to access this page.",
            });
            setClaimStatus('not-admin');
            router.push('/dashboard');
        }
      }
    };

    checkAdminClaim();

  }, [user, isUserLoading, router, toast]);

  // Show a loading spinner for all intermediate states.
  if (isUserLoading || claimStatus === 'unknown' || claimStatus === 'checking' || claimStatus === 'granting') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="large" />
        <p className="ml-4">
            {claimStatus === 'granting' ? 'Setting up admin role...' : 'Verifying permissions...'}
        </p>
      </div>
    );
  }

  // If the user is an admin, show the dashboard.
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
