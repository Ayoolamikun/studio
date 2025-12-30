
'use client'

import { useState } from 'react';
import { storage } from '@/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/Spinner';

export default function ApplyPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const file = formData.get('resume') as File;

    if (!file) {
      toast({
        variant: 'destructive',
        title: 'No File Selected',
        description: 'Please select a file to upload.',
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const timestamp = Date.now();
      const storageRef = ref(storage, `applications/${timestamp}_${file.name}`);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      console.log('File uploaded:', downloadURL);
      toast({
        title: 'Success!',
        description: 'Your application has been submitted.',
      });
      e.currentTarget.reset();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
     <div className="flex min-h-screen flex-col bg-secondary/50">
      <Header />
      <main className="flex-1 py-12 md:py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl text-primary">
              Submit Application
            </h1>
            <p className="mt-4 text-muted-foreground md:text-lg">
              Please upload your application documents below.
            </p>
          </div>
          <Card className="mt-12 mx-auto max-w-lg shadow-lg">
              <CardHeader>
                  <CardTitle>Upload Document</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                    <Label htmlFor="resume" className="block mb-2 font-semibold">
                        Application File (PDF, DOC, DOCX)
                    </Label>
                    <Input
                        type="file"
                        id="resume"
                        name="resume"
                        accept=".pdf,.doc,.docx"
                        required
                        className="w-full file:text-primary file:font-semibold"
                    />
                    </div>

                    <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full font-bold bg-accent text-accent-foreground hover:bg-accent/90"
                    >
                    {isSubmitting ? <><Spinner size='small' /> Submitting...</> : 'Submit Application'}
                    </Button>
                </form>
              </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
