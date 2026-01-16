'use client';

import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@/firebase';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import Logo from '@/components/Logo';
import { Spinner } from '@/components/Spinner';
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type LoginValues = z.infer<typeof loginSchema>;

const ADMIN_UID = "DISABLED_ADMIN_UID";

export default function LoginPage() {
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const [resetEmail, setResetEmail] = useState('');
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const { formState: { isSubmitting } } = form;

  // Redirect if user is already logged in
  useEffect(() => {
    if (!isUserLoading && user) {
      const targetPath = user.uid === ADMIN_UID ? '/admin' : '/dashboard';
      router.replace(targetPath);
    }
  }, [user, isUserLoading, router]);

  const processLogin: SubmitHandler<LoginValues> = async (data) => {
    if (!auth) {
        toast({ variant: 'destructive', title: 'Login Failed', description: 'Authentication service is not available.'});
        return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      toast({ title: 'Login Successful', description: 'Redirecting...' });
      
      const targetPath = userCredential.user.uid === ADMIN_UID ? '/admin' : '/dashboard';
      router.replace(targetPath);

    } catch (error: any) {
      let description = 'An unexpected error occurred. Please try again.';
      switch (error.code) {
        case 'auth/invalid-credential':
          description = 'Incorrect email or password. Please try again.';
          break;
        case 'auth/user-not-found':
          description = 'No account found with this email address.';
          break;
        case 'auth/wrong-password':
          description = 'Incorrect password. Please try again.';
          break;
      }
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description,
      });
    }
  };

  const handlePasswordReset = async () => {
    if (!auth) {
      toast({ variant: 'destructive', title: 'Error', description: 'Authentication service not available.' });
      return;
    }
    if (!resetEmail) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter your email address.' });
      return;
    }

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast({
        title: 'Password Reset Email Sent',
        description: `If an account exists for ${resetEmail}, you will receive a password reset link. Please check your inbox (and spam folder).`,
      });
      setIsResetDialogOpen(false);
      setResetEmail('');
    } catch (error: any) {
      // For security, even if the user is not found, we show a success message.
      // This prevents attackers from checking which emails are registered.
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
         toast({
            title: 'Password Reset Email Sent',
            description: `If an account exists for ${resetEmail}, you will receive a password reset link. Please check your inbox (and spam folder).`,
        });
      } else {
         toast({
            variant: 'destructive',
            title: 'Failed to Send Reset Email',
            description: 'An unexpected error occurred. Please try again later.',
        });
      }
      setIsResetDialogOpen(false);
      setResetEmail('');
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth) {
        toast({ variant: 'destructive', title: 'Login Failed', description: 'Authentication service is not available.' });
        return;
    }

    try {
        const userCredential = await signInWithPopup(auth, new GoogleAuthProvider());
        toast({ title: 'Login Successful', description: 'Redirecting...' });

        const targetPath = userCredential.user.uid === ADMIN_UID ? '/admin' : '/dashboard';
        router.replace(targetPath);

    } catch (error: any) {
        let description = 'An unexpected error occurred during Google sign-in.';
        if (error.code === 'auth/popup-closed-by-user') {
            description = 'Sign-in window was closed before completion.';
        } else if (error.code === 'auth/account-exists-with-different-credential') {
            description = 'An account already exists with the same email address but different sign-in credentials.';
        }
        toast({
            variant: 'destructive',
            title: 'Google Sign-In Failed',
            description,
        });
    }
  };

  if (isUserLoading || user) {
    return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background">
            <Logo />
            <Spinner size="large" />
            <p className="text-lg mt-4 text-muted-foreground">Loading...</p>
        </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/50 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
            <div className="mx-auto mb-4">
                <Logo />
            </div>
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>Enter your credentials to access your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(processLogin)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center">
                      <FormLabel>Password</FormLabel>
                      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="link" type="button" className="px-0 text-sm h-auto py-1 font-normal">
                                Forgot Password?
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Reset Your Password</DialogTitle>
                                <DialogDescription>
                                    Enter your email address below and we'll send you a link to reset your password.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="reset-email" className="text-right">
                                        Email
                                    </Label>
                                    <Input
                                        id="reset-email"
                                        type="email"
                                        value={resetEmail}
                                        onChange={(e) => setResetEmail(e.target.value)}
                                        className="col-span-3"
                                        placeholder="you@example.com"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant="outline" type="button">Cancel</Button>
                                </DialogClose>
                                <Button onClick={handlePasswordReset} type="button">Send Reset Link</Button>
                            </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full !mt-6" disabled={isSubmitting}>
                {isSubmitting ? <><Spinner size="small" /> Signing In...</> : 'Sign In'}
              </Button>
            </form>
          </Form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                Or continue with
                </span>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isSubmitting}>
            <svg className="mr-2 h-4 w-4" role="img" aria-label="Google logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-.97 2.53-1.94 3.3v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.07z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M1 1h22v22H1z" fill="none"/>
            </svg>
            Sign in with Google
          </Button>

        </CardContent>
      </Card>
    </div>
  );
}
