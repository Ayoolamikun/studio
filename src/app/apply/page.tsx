"use client";

import { useState } from "react";
import { auth, firestore as db, storage } from "@/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from 'sonner';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/Spinner';
import Link from 'next/link';

export default function ApplyPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [agreedRisks, setAgreedRisks] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(Array.from(e.target.files));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!auth.currentUser) {
      toast.error("Authentication Error", { description: "You must be logged in to submit." });
      return;
    }

    if (!agreedTerms || !agreedPrivacy || !agreedRisks) {
      toast.error("Agreements Required", { description: "Please agree to all terms, privacy, and risk acknowledgments." });
      return;
    }

    if (files.length === 0) {
      toast.error("File Upload Required", { description: "Please select at least one file to upload." });
      return;
    }

    setSubmitting(true);

    try {
      // 1. Upload files to Storage
      const fileUrls: string[] = [];

      for (const file of files) {
        const storageRef = ref(storage, `investment-uploads/${auth.currentUser.uid}/${Date.now()}-${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        fileUrls.push(url);
      }

      // 2. Save application to Firestore
      // NOTE: This simplified form doesn't include all fields from the schema.
      // It serves as a working baseline for submission.
      await addDoc(collection(db, "investmentApplications"), {
        userId: auth.currentUser.uid,
        email: auth.currentUser.email,
        fullName: auth.currentUser.displayName || "N/A",
        investmentPlan: "Gold", // Default value for this minimal form
        investmentAmount: 0, // Default value for this minimal form
        currency: "NGN", // Default value for this minimal form
        expectedDuration: "N/A", // Default value for this minimal form
        country: "N/A", // Default value for this minimal form
        phoneNumber: auth.currentUser.phoneNumber || "N/A", // Default value for this minimal form
        govIdType: "N/A", // Default value for this minimal form
        notes: notes,
        govIdUrl: fileUrls[0] || "",
        proofOfAddressUrl: fileUrls[1] || "",
        passportPhotoUrl: fileUrls[2] || "",
        createdAt: serverTimestamp(),
        status: "Processing",
      });

      toast.success("Application Submitted!", { description: "Your application has been received successfully." });
      // Reset form
      setNotes("");
      setFiles([]);
      const fileInput = document.getElementById('files') as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      setAgreedTerms(false);
      setAgreedPrivacy(false);
      setAgreedRisks(false);

    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Submission Failed", { description: (error as Error).message || "An unexpected error occurred. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-secondary/50">
      <Header />
      <main className="flex-1 container py-12 md:py-24">
        <Card className="mx-auto max-w-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-primary">Investment Application</CardTitle>
            <CardDescription>A minimal, working form to test submission. More fields will be added back later.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="notes">Notes / Additional Info (optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional information..."
                />
              </div>

              <div>
                <Label htmlFor="files">Upload Documents (Select 3 files)</Label>
                <Input type="file" id="files" multiple onChange={handleFileChange} />
              </div>

              <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="terms" checked={agreedTerms} onCheckedChange={(checked) => setAgreedTerms(Boolean(checked))} />
                    <Label htmlFor="terms" className="font-normal">I agree to the <Link href="/terms-of-service" className="underline text-primary" target="_blank">Terms and Conditions</Link>.</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="privacy" checked={agreedPrivacy} onCheckedChange={(checked) => setAgreedPrivacy(Boolean(checked))} />
                    <Label htmlFor="privacy" className="font-normal">I have read and accept the <Link href="/privacy-policy" className="underline text-primary" target="_blank">Privacy Policy</Link>.</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="risks" checked={agreedRisks} onCheckedChange={(checked) => setAgreedRisks(Boolean(checked))} />
                    <Label htmlFor="risks" className="font-normal">I acknowledge the risks associated with investments.</Label>
                  </div>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                size="lg"
                className="w-full"
              >
                {submitting ? <><Spinner size="small" /> Submitting...</> : "Submit Application"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
