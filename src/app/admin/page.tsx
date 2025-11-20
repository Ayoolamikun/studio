
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
export type ClaimStatus = 'unknown' | 'checking' | 'is-admin' | 'not-admin' | 'granting';

export default function AdminPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const [claimStatus, setClaimStatus] = useState<ClaimStatus>('unknown');

  useEffect(() => {
    // 1. Wait until user loading is complete
    if (isUserLoading) {
      setClaimStatus('checking');
      return;
    }
    
    // 2. If no user, redirect to login.
    if (!user) {
      router.push('/login');
      return;
    }

    // 3. User is loaded, now check the claims.
    const checkAdminClaim = async () => {
      // Force refresh the token to get the latest claims from the server.
      const idTokenResult = await user.getIdTokenResult(true); 
      
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
            const auth = getAuth();
            if (!auth.app) {
                throw new Error("Firebase Auth not initialized");
            }
            const functions = getFunctions(auth.app);
            const grantAdminRole = httpsCallable(functions, 'grantAdminRole');
            await grantAdminRole({ uid: user.uid });
            
            toast({
                title: "Success!",
                description: "Admin privileges granted. Refreshing page to apply changes.",
            });
            
            // CRITICAL: The claims have been set on the backend.
            // We MUST force a refresh of the token on the client to get them.
            await user.getIdTokenResult(true);
            
            // A full page reload is the most reliable way to ensure all components 
            // re-evaluate their state with the new authentication token and claims.
            window.location.reload();

        } catch (error: any) {
            console.error("Admin claim error:", error);
            toast({
                variant: "destructive",
                title: "Permission Denied",
                description: error.message || "You do not have the necessary permissions to access this page. You will be redirected.",
            });
            setClaimStatus('not-admin');
            // Redirect away if the user is not authorized and the grant fails.
            setTimeout(() => router.push('/dashboard'), 3000);
        }
      }
    };

    checkAdminClaim();

  }, [user, isUserLoading, router, toast]);

  // Show a loading spinner for all intermediate states.
  if (claimStatus !== 'is-admin') {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <Spinner size="large" />
        <p className="text-lg">
            {claimStatus === 'granting' ? 'Setting up admin role...' : 
             claimStatus === 'not-admin' ? 'Permission Denied. Redirecting...' :
             'Verifying permissions...'}
        </p>
      </div>
    );
  }

  // If the user is an admin, show the dashboard.
  return <AdminDashboard user={user} claimStatus={claimStatus} />;
}
