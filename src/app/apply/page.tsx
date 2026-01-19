
"use client";

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ApplyPage() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("FORM SUBMITTED");
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
