
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useUser, initiateGoogleSignIn, initiateMicrosoftSignIn, initiateEmailSignUp, initiateAnonymousSignIn } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import Logo from '@/components/Logo';
import { updateProfile, signInWithEmailAndPassword, UserCredential } from 'firebase/auth';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/Spinner';
import { getFunctions, httpsCallable } from 'firebase/functions';

const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

const signupSchema = z.object({
    fullName: z.string().min(2, { message: 'Full name is required.'}),
    email: z.string().email({ message: 'Please enter a valid email.' }),
    password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type LoginValues = z.infer<typeof loginSchema>;
type SignupValues = z.infer<typeof signupSchema>;

export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isSigningUp, setIsSigningUp] = useState(false);

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const signupForm = useForm<SignupValues>({
      resolver: zodResolver(signupSchema),
      defaultValues: { fullName: '', email: '', password: '' },
  });
  
  useEffect(() => {
    // If the user is logged in (and not a guest), check their role and redirect.
    if (!isUserLoading && user && !user.isAnonymous) {
      // Force a token refresh to get the latest custom claims.
      user.getIdTokenResult(true).then((idTokenResult) => {
        if (idTokenResult.claims.admin === true) {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
      });
    }
  }, [user, isUserLoading, router]);


  async function onLogin(values: LoginValues) {
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({
        title: "Signing In...",
        description: "You will be redirected shortly.",
      });
    } catch (error: any) {
      let description = "An unexpected error occurred during sign-in.";
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        description = "Invalid email or password. Please check your credentials and try again.";
      }
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: description,
      });
    }
  }

  async function onSignup(values: SignupValues) {
    try {
        const userCredential = await initiateEmailSignUp(auth, values.email, values.password);
        if (userCredential && userCredential.user) {
            const firebaseUser = userCredential.user;
            await updateProfile(firebaseUser, { displayName: values.fullName });

            // Create the borrower profile.
            const borrowerRef = doc(firestore, "Borrowers", firebaseUser.uid);
            const borrowerData = {
                name: values.fullName,
                email: firebaseUser.email,
                createdAt: new Date().toISOString(),
            };
            setDocumentNonBlocking(borrowerRef, borrowerData, { merge: true });
            
            toast({
                title: "Account Created!",
                description: "You are now being logged in.",
            });
        }
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description: error.message || "Could not create account.",
        });
    }
  }

  const handleOAuthSignIn = async (providerAction: (auth: any) => Promise<UserCredential>) => {
    try {
      const userCredential = await providerAction(auth);
      if (userCredential && userCredential.user && firestore) {
          const { user } = userCredential;
           // Create or merge the borrower profile.
          const borrowerRef = doc(firestore, "Borrowers", user.uid);
          const borrowerData = {
              name: user.displayName,
              email: user.email,
              createdAt: new Date().toISOString(),
          };
          setDocumentNonBlocking(borrowerRef, borrowerData, { merge: true });
      }
      toast({
        title: "Signing In...",
        description: "You will be redirected shortly.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign-in Failed",
        description: error.message || "An error occurred during sign-in.",
      });
    }
  };

  const handleAnonymousSignIn = async () => {
    try {
      await initiateAnonymousSignIn(auth);
      router.push('/calculators');
      toast({
        title: "Entering as Guest...",
        description: "You can now use the calculators. Sign up to apply for a loan.",
      });
    } catch (error: any) {
       toast({
        variant: "destructive",
        title: "Sign-in Failed",
        description: error.message || "An error occurred during guest sign-in.",
      });
    }
  };
  
  if (isUserLoading || (user && !user.isAnonymous)) {
    return <div className="h-screen w-screen bg-background flex items-center justify-center"><Spinner size="large" /></div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4" suppressHydrationWarning>
      <Card className="mx-auto w-full max-w-sm">
        <CardHeader className="text-center">
            <Logo className="justify-center mb-2" />
          <CardTitle className="text-2xl">{isSigningUp ? 'Create an Account' : 'Login'}</CardTitle>
          <CardDescription>
            {isSigningUp ? 'Enter your details to get started.' : 'Enter your credentials to access your dashboard.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
            {isSigningUp ? (
                 <Form {...signupForm}>
                    <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4">
                      <FormField
                        control={signupForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={signupForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input placeholder="you@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={signupForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full">Create Account</Button>
                    </form>
                 </Form>
            ) : (
                <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                    <FormField control={loginForm.control} name="email" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl><Input placeholder="you@example.com" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField control={loginForm.control} name="password" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <Button type="submit" className="w-full">Login</Button>
                    </form>
                </Form>
            )}
            <Separator className="my-4" />
            <div className="space-y-3">
                 <Button variant="outline" className="w-full" onClick={() => handleOAuthSignIn(initiateGoogleSignIn)}>
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"></path><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"></path><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.021 35.596 44 30.032 44 24c0-1.341-.138-2.65-.389-3.917z"></path></svg>
                    Sign in with Google
                 </Button>
                 <Button variant="outline" className="w-full" onClick={() => handleOAuthSignIn(initiateMicrosoftSignIn)}>
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 21 21"><path fill="#f25022" d="M1 1h9v9H1z"/><path fill="#00a4ef" d="M1 11h9v9H1z"/><path fill="#7fba00" d="M11 1h9v9h-9z"/><path fill="#ffb900" d="M11 11h9v9h-9z"/></svg>
                    Sign in with Outlook
                 </Button>
                  <Button variant="link" className="w-full text-muted-foreground" onClick={handleAnonymousSignIn}>
                    Continue as Guest
                 </Button>
            </div>
        </CardContent>
        <CardFooter className="flex justify-center">
            <Button variant="link" onClick={() => setIsSigningUp(!isSigningUp)}>
                {isSigningUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

    