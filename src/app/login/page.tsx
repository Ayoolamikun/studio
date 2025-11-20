
'use client';

import { useState, useEffect, useActionState } from 'react';
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
import { useAuth, useUser, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import Logo from '@/components/Logo';
import { updateProfile, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously, UserCredential, Auth } from 'firebase/auth';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/Spinner';

const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

const signupSchema = z.object({
    fullName: z.string().min(2, { message: 'Full name is required.'}),
    email: z.string().email({ message: 'Please enter a valid email.' }),
    password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type FormValues = z.infer<typeof loginSchema> & Partial<z.infer<typeof signupSchema>>;

export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isSigningUp, setIsSigningUp] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(isSigningUp ? signupSchema : loginSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
    },
  });
  
  useEffect(() => {
    form.reset();
    form.trigger();
  }, [isSigningUp, form]);

  useEffect(() => {
    if (!isUserLoading && user && !user.isAnonymous) {
      user.getIdTokenResult(true).then((idTokenResult) => {
        if (idTokenResult.claims.admin === true) {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
      });
    }
  }, [user, isUserLoading, router]);


  async function onLogin(values: FormValues) {
    if (!auth) return;
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

  async function onSignup(values: FormValues) {
    if (!auth || !firestore || !values.fullName) return;
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
        const firebaseUser = userCredential.user;
        await updateProfile(firebaseUser, { displayName: values.fullName });

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
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description: error.message || "Could not create account.",
        });
    }
  }

  const handleFormSubmit = form.handleSubmit((values) => {
    if (isSigningUp) {
      onSignup(values);
    } else {
      onLogin(values);
    }
  });

  const handleAnonymousSignIn = async () => {
    if (!auth) return;
    try {
      await signInAnonymously(auth);
      router.push('/calculators');
      toast({
        title: "Entering as Guest...",
        description: "You can now use the calculators. Sign up to apply for a loan.",
      });
    } catch (error: any)       {
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
            <Form {...form}>
              <form onSubmit={handleFormSubmit} className="space-y-4">
                {isSigningUp && (
                  <FormField
                    control={form.control}
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
                )}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
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
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? <Spinner size="small"/> : (isSigningUp ? 'Create Account' : 'Login')}
                </Button>
              </form>
            </Form>
            <Separator className="my-4" />
            <div className="space-y-3">
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
