
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
      // Check if user is admin and redirect accordingly
      if (user.uid === '1EW8TCRo2LOdJEHrWrrVOTvJZJE2') {
         router.push('/admin');
      } else {
         router.push('/dashboard');
      }
      return;
    }

    // When auth is ready and no one is logged in, attempt auto-login.
    if (!isUserLoading && !user && auth) {
      const autoLogin = async (email: string) => {
        try {
          // Attempt to sign in with the hardcoded credentials.
          const userCredential = await signInWithEmailAndPassword(auth, email, HARDCODED_PASSWORD);
          toast({
            title: "Auto Sign-In Successful",
            description: "Redirecting...",
          });

          if (userCredential.user.uid === '1EW8TCRo2LOdJEHrWrrVOTvJZJE2') {
            router.push('/admin');
          } else {
            router.push('/dashboard');
          }

        } catch (error: any) {
          // If the user doesn't exist, create it.
          if (error.code === 'auth/user-not-found') {
            try {
              const userCredential = await createUserWithEmailAndPassword(auth, email, HARDCODED_PASSWORD);
              toast({
                title: "Default Account Created",
                description: "Signing you in automatically.",
              });
              if (userCredential.user.uid === '1EW8TCRo2LOdJEHrWrrVOTvJZJE2') {
                router.push('/admin');
              } else {
                router.push('/dashboard');
              }
            } catch (creationError: any) {
              toast({
                variant: "destructive",
                title: "Auto-Login Failed",
                description: `Could not create default user: ${creationError.message}`,
              });
            }
          } else if (error.code === 'auth/invalid-credential' && email === HARDCODED_EMAIL) {
             // If default user fails, try the admin user.
             autoLogin("corporatemagnate@outlook.com");
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

      // Start the login process with the default user email.
      autoLogin(HARDCODED_EMAIL);
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
