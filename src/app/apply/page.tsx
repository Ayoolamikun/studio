'use client';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench } from 'lucide-react';

export default function ApplyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-secondary/50">
      <Header />
      <main className="flex-1 py-12 md:py-24">
        <div className="container">
          <Card className="mx-auto max-w-3xl shadow-lg">
            <CardHeader className="items-center text-center">
              <Wrench className="h-16 w-16 text-muted-foreground mb-4" />
              <CardTitle className="font-headline text-2xl md:text-3xl text-primary">
                Under Construction
              </CardTitle>
              <CardDescription>
                We are currently rebuilding this form to make it better and faster. Please check back soon!
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Content can be added here later */}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
