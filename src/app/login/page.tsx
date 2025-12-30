
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useUser } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { Spinner } from '@/components/Spinner';
import Logo from '@/components/Logo';

// --- Hardcoded Credentials ---
// Default standard user for demo purposes
const STANDARD_USER_EMAIL = "user@example.com";
const STANDARD_USER_PASSWORD = "password123";

// Admin user for the admin panel
const ADMIN_USER_EMAIL = "corporatemagnate@outlook.com";
const ADMIN_USER_PASSWORD = "password123"; // Using the same simple password for demo

// Admin UID from your security rules
const ADMIN_UID = "1EW8TCRo2LOdJEHrWrrVOTvJZJE2";
// ---------------------------

export default function LoginPage() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // If user is already logged in, redirect them immediately.
    if (!isUserLoading && user) {
      const targetPath = user.uid === ADMIN_UID ? '/admin' : '/dashboard';
      router.replace(targetPath);
      return;
    }

    // When auth is ready and no user is logged in, attempt auto-login.
    if (!isUserLoading && !user && auth) {
      const autoLogin = async (email: string, password: string) => {
        try {
          // Attempt to sign in with the provided credentials.
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          toast({
            title: "Auto Sign-In Successful",
            description: `Welcome! Redirecting to ${email === ADMIN_USER_EMAIL ? 'Admin Panel' : 'Dashboard'}...`,
          });
          
          const targetPath = userCredential.user.uid === ADMIN_UID ? '/admin' : '/dashboard';
          router.replace(targetPath);

        } catch (error: any) {
          // If the user doesn't exist, create it.
          if (error.code === 'auth/user-not-found') {
            try {
              const userCredential = await createUserWithEmailAndPassword(auth, email, password);
              toast({
                title: "Default Account Created",
                description: `Signing you in to ${email === ADMIN_USER_EMAIL ? 'Admin Panel' : 'Dashboard'}.`,
              });
              const targetPath = userCredential.user.uid === ADMIN_UID ? '/admin' : '/dashboard';
              router.replace(targetPath);
            } catch (creationError: any) {
              toast({
                variant: "destructive",
                title: "Auto-Login Failed",
                description: `Could not create default user: ${creationError.message}`,
              });
            }
          } else if (error.code === 'auth/invalid-credential') {
             // If default standard user login fails, try the admin user.
             if (email === STANDARD_USER_EMAIL) {
                autoLogin(ADMIN_USER_EMAIL, ADMIN_USER_PASSWORD);
             } else {
                // If admin login also fails with wrong password.
                 toast({
                    variant: "destructive",
                    title: "Auto-Login Failed",
                    description: "Stored credentials for the admin account seem to be incorrect.",
                });
             }
          } else {
             // Handle other errors (network issues, etc.)
             toast({
                variant: "destructive",
                title: "Auto-Login Failed",
                description: error.message || "An unexpected error occurred.",
            });
          }
        }
      };

      // Start the login process with the default standard user email first.
      autoLogin(STANDARD_USER_EMAIL, STANDARD_USER_PASSWORD);
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
