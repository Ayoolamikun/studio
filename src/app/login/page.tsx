
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useUser } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { Spinner } from '@/components/Spinner';
import Logo from '@/components/Logo';

// --- Hardcoded Credentials ---
const HARDCODED_EMAIL = "user@example.com";
const HARDCODED_PASSWORD = "password123";
// ---------------------------

export default function LoginPage() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // If user is already logged in, redirect them.
    if (!isUserLoading && user) {
      router.push('/dashboard');
      return;
    }

    // When auth is ready and no one is logged in, attempt auto-login.
    if (!isUserLoading && !user && auth) {
      const autoLogin = async () => {
        try {
          // Attempt to sign in with the hardcoded credentials.
          await signInWithEmailAndPassword(auth, HARDCODED_EMAIL, HARDCODED_PASSWORD);
          toast({
            title: "Auto Sign-In Successful",
            description: "Redirecting to dashboard...",
          });
          router.push('/dashboard');
        } catch (error: any) {
          // If the user doesn't exist, create it.
          if (error.code === 'auth/user-not-found') {
            try {
              await createUserWithEmailAndPassword(auth, HARDCODED_EMAIL, HARDCODED_PASSWORD);
              toast({
                title: "Default Account Created",
                description: "Signing you in automatically.",
              });
              router.push('/dashboard');
            } catch (creationError: any) {
              toast({
                variant: "destructive",
                title: "Auto-Login Failed",
                description: `Could not create default user: ${creationError.message}`,
              });
            }
          } else {
             // Handle other errors like wrong password, network issues, etc.
             toast({
                variant: "destructive",
                title: "Auto-Login Failed",
                description: error.message || "An unexpected error occurred.",
            });
          }
        }
      };

      autoLogin();
    }
  }, [auth, user, isUserLoading, router, toast]);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background">
      <Logo />
      <Spinner size="large" />
      <p className="text-lg mt-4 text-muted-foreground">Signing in automatically...</p>
    </div>
  );
}
