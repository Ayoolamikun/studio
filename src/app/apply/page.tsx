
"use client";

import { useAuth, useFirestore } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import React from 'react';

export default function ApplyPage() {
  const auth = useAuth();
  const db = useFirestore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!auth || !db) {
        alert("Firebase services are not ready. Please wait a moment and try again.");
        return;
    }

    if (!auth.currentUser) {
      alert("You must be logged in to submit an application.");
      return;
    }

    try {
      await addDoc(collection(db, "loanApplications"), {
        userId: auth.currentUser.uid,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      alert("Application submitted successfully!");
    } catch (err) {
      console.error(err);
      alert("Error: " + (err as Error).message);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-secondary/50">
      <Header />
      <main className="flex-1 container py-12 md:py-24">
        <Card className="mx-auto max-w-4xl">
          <CardHeader>
            <CardTitle>Application Form (Test)</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <p className="mb-4 text-muted-foreground">
                This is a minimal test form to confirm that the submit handler is working correctly.
              </p>
              <Button type="submit">
                Submit Application (Test)
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
