
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { Spinner } from '@/components/Spinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// The admin UID will be hardcoded in your firestore.rules file.
// This UID now grants admin access.
const ADMIN_UID = "1EW8TCRo2LOdJEHrWrrVOTvJZJE2";

export default function AdminPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (isUserLoading) {
      return; // Wait until user loading is complete
    }
    
    if (!user) {
      router.push('/login'); // If no user, redirect to login
      return;
    }

    // Check if the logged-in user's UID matches the designated admin UID.
    if (user.uid === ADMIN_UID) {
      setIsAuthorized(true);
    } else {
      setIsAuthorized(false);
    }
  }, [user, isUserLoading, router]);

  // Show a loading spinner while checking auth state.
  if (isUserLoading || (user && !isAuthorized)) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <Spinner size="large" />
        <p className="text-lg mt-4">Verifying permissions...</p>
        
        {/* If user is loaded but not authorized, show them their UID to help with setup */}
        { !isUserLoading && user && user.uid !== ADMIN_UID && (
            <Card className="mt-8 max-w-md text-center">
                <CardHeader>
                    <CardTitle>Permission Denied</CardTitle>
                    <CardDescription>You are not authorized to view this page.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm">To gain admin access, the admin UID in the security rules needs to be updated. Your User ID is:</p>
                    <div className="mt-4 bg-secondary p-3 rounded-md">
                        <code className="font-mono text-base text-primary font-bold">{user.uid}</code>
                    </div>
                     <Button variant="outline" className="mt-6" onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
                </CardContent>
            </Card>
        )}
      </div>
    );
  }

  // If the user is the authorized admin, show the dashboard.
  if (isAuthorized && user) {
    return <AdminDashboard user={user} />;
  }

  // Fallback, though the above logic should cover all cases.
  return null;
}
