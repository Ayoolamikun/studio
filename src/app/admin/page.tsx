
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
        return; // User is verified as an admin.
      }
      
      // If the claim is not present, check if this is the designated admin email.
      // If so, attempt to grant the admin role via the Cloud Function.
      if (user.email === 'corporatemagnate@outlook.com') {
        console.log('Designated admin user detected without admin claim. Attempting to grant role...');
        toast({
          title: 'First-time Admin Setup',
          description: 'Attempting to grant your account admin privileges. This may take a moment.',
        });
        
        try {
          const functions = getFunctions();
          // This self-assignment is a special case for the first admin.
          // In a real-world app, you might have another user grant this.
          const grantAdminRole = httpsCallable(functions, 'grantAdminRole');
          // Since the function requires the caller to be an admin, this will fail.
          // This is a placeholder for a real-world scenario where an admin would grant this.
          // For now, we will log a message and direct the user to the Firebase Console.
          console.error("Critical Setup Error: The `grantAdminRole` function cannot be called by a non-admin. You must manually set the first admin's custom claim in the Firebase console or use the Admin SDK in a secure environment.");
          toast({
            variant: "destructive",
            title: "Manual Action Required",
            description: "To finalize admin setup, please contact your system administrator to set your custom claims.",
            duration: 10000,
          });
          setClaimStatus('not-admin'); // Set to not-admin as the call will fail.
          router.push('/dashboard');
        
        } catch (error) {
          console.error("Error calling grantAdminRole function:", error);
          toast({
            variant: "destructive",
            title: "Admin Setup Failed",
            description: "Could not grant admin privileges. Please check the function logs.",
          });
          setClaimStatus('not-admin');
          router.push('/dashboard');
        }
      } else {
        // If the user is not the designated admin and has no claim, they are not an admin.
        console.log('User is not an admin. Redirecting to dashboard.');
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
