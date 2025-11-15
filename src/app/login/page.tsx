'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
import { useAuth, useUser, initiateEmailSignUp } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import Logo from '@/components/Logo';
import { updateProfile, signInWithEmailAndPassword } from 'firebase/auth';

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
    // If user is logged in, check for admin role
    if (!isUserLoading && user && firestore) {
      const adminRoleRef = doc(firestore, 'roles_admin', user.uid);
      // This is a simplified check. In a real app, you might use useDoc
      import('firebase/firestore').then(({ getDoc }) => {
        getDoc(adminRoleRef).then(docSnap => {
          if (docSnap.exists()) {
            router.push('/admin');
          } else {
            router.push('/dashboard');
          }
        });
      });
    }
  }, [user, isUserLoading, router, firestore]);

  async function onLogin(values: LoginValues) {
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({
        title: "Signing In...",
        description: "You will be redirected shortly.",
      });
    } catch (error: any) {
      console.error("Login Error:", error);
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
            // Update user's profile
            await updateProfile(firebaseUser, { displayName: values.fullName });

            // Create borrower profile in Firestore
            const borrowerRef = doc(firestore, "Borrowers", firebaseUser.uid);
            const borrowerData = {
                name: values.fullName,
                email: values.email,
                createdAt: new Date().toISOString(),
            };
            // Use non-blocking write
            setDocumentNonBlocking(borrowerRef, borrowerData, { merge: true });
            
            toast({
                title: "Account Created!",
                description: "You are now being logged in.",
            });
        }
    } catch (error: any) {
        console.error("Signup Error:", error);
        toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description: error.message || "Could not create account.",
        });
    }
  }
  
  if (isUserLoading || user) {
    return <div className="h-screen w-screen bg-background"></div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary">
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
                      <FormField control={signupForm.control} name="fullName" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField control={signupForm.control} name="email" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl><Input placeholder="you@example.com" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField control={signupForm.control} name="password" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
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
