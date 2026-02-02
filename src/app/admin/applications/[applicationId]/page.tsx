
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useDoc, useMemoFirebase, useAuth, useFirestore, WithId, errorEmitter, FirestorePermissionError } from '@/firebase';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { approveLoanApplicationAction } from '@/app/actions';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/Spinner';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Check, X, File, Download, User, Wallet, Briefcase, Save, Phone, Mail, Calendar, MapPin } from 'lucide-react';

// Define types based on your backend.json
type LoanApplication = {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  residentialAddress: string;
  city: string;
  country: string;
  loanAmount: number;
  loanPurpose: string;
  repaymentDuration: number;
  documents: {
    governmentId: string;
    proofOfAddress: string;
    selfie: string;
  };
  status: 'Processing' | 'Approved' | 'Rejected';
  createdAt: any;
  adminNotes?: string;
};

type InvestmentApplication = {
  userId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  country: string;
  investmentPlan: string;
  investmentAmount: number;
  currency: string;
  expectedDuration: string;
  govIdType: string;
  govIdUrl: string;
  proofOfAddressUrl: string;
  passportPhotoUrl: string;
  status: 'Processing' | 'Approved' | 'Rejected';
  createdAt: any;
  adminNotes?: string;
};

type Customer = {
  name: string;
  phone: string;
  email: string;
  createdAt: any;
};

type Application = WithId<LoanApplication | InvestmentApplication>;

export default function ApplicationDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const auth = useAuth();
  const functions = auth ? getFunctions(auth.app) : null;

  const applicationId = params.applicationId as string;
  const type = searchParams.get('type') as 'loan' | 'investment' | null;

  const [isProcessing, setIsProcessing] = useState(false);
  const [note, setNote] = useState('');

  const collectionName = useMemo(() => {
    if (type === 'loan') return 'loanApplications';
    if (type === 'investment') return 'investmentApplications';
    return null;
  }, [type]);

  const applicationRef = useMemoFirebase(
    () => (firestore && applicationId && collectionName) ? doc(firestore, collectionName, applicationId) : null,
    [firestore, applicationId, collectionName]
  );

  const { data: application, isLoading: applicationLoading } = useDoc<LoanApplication | InvestmentApplication>(applicationRef);
  
  const userRef = useMemoFirebase(
    () => (firestore && application?.userId) ? doc(firestore, 'Users', application.userId) : null,
    [firestore, application]
  );
  
  const { data: user, isLoading: userLoading } = useDoc<any>(userRef);

  useEffect(() => {
    if (application?.adminNotes) {
      setNote(application.adminNotes);
    }
  }, [application]);

  const handleApprove = async () => {
    if (!applicationId || !type) return;
    setIsProcessing(true);

    if (type === 'loan') {
        if (!auth?.currentUser) {
            toast.error('Authentication Error', { description: 'You must be logged in to approve.' });
            setIsProcessing(false);
            return;
        }
        try {
            const idToken = await auth.currentUser.getIdToken();
            const result = await approveLoanApplicationAction(applicationId, idToken);

            if (result.success) {
                toast.success('Approval Successful', { description: result.message });
                router.push('/admin/applications');
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            toast.error('Approval Failed', { description: error.message || "An unexpected error occurred." });
        } finally {
            setIsProcessing(false);
        }
    } else if (type === 'investment') {
        if (!functions) {
            toast.error('Error', { description: 'Functions service not available.' });
            setIsProcessing(false);
            return;
        }
        try {
            const approveFunction = httpsCallable(functions, 'approveInvestmentApplication');
            const result = await approveFunction({ applicationId });
            const data = result.data as { success: boolean; message: string };

            if (data.success) {
                toast.success('Approval Successful', { description: data.message });
                router.push('/admin/applications');
            } else {
                throw new Error(data.message);
            }
        } catch (error: any) {
            toast.error('Approval Failed', { description: error.message || "An unexpected error occurred." });
        } finally {
            setIsProcessing(false);
        }
    }
  };

  const handleReject = () => {
    if (!applicationRef) return;
    setIsProcessing(true);
    
    const updateData = { status: 'Rejected', updatedAt: serverTimestamp() };

    updateDoc(applicationRef, updateData)
      .then(() => {
        toast.warning('Application Rejected', { description: 'The application has been marked as rejected.' });
        router.push('/admin/applications');
      })
      .catch(error => {
        console.error("Rejection error:", error);
        errorEmitter.emit(
            'permission-error',
            new FirestorePermissionError({
                path: applicationRef.path,
                operation: 'update',
                requestResourceData: updateData,
            })
        );
        toast.error('Update Failed', { description: error.message || "Could not update the application status." });
        setIsProcessing(false);
      });
  };

  const handleSaveNote = () => {
    if (!applicationRef) return;
    setIsProcessing(true);
    
    const updateData = { adminNotes: note, updatedAt: serverTimestamp() };

    updateDoc(applicationRef, updateData)
      .then(() => {
        toast.success('Note Saved', { description: 'Your note has been saved successfully.' });
      })
      .catch(error => {
        console.error("Save note error:", error);
        errorEmitter.emit(
            'permission-error',
            new FirestorePermissionError({
                path: applicationRef.path,
                operation: 'update',
                requestResourceData: updateData,
            })
        );
        toast.error('Save Failed', { description: error.message || "Could not save the note." });
      })
      .finally(() => {
        setIsProcessing(false);
      });
  };

  const isLoading = applicationLoading || userLoading;

  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><Spinner size="large" /></div>;
  }

  if (!application || !type) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold">Application not found</h2>
        <p className="text-muted-foreground">The requested application could not be loaded or the type is invalid.</p>
        <Button asChild variant="link" className="mt-4"><Link href="/admin/applications">Go Back</Link></Button>
      </div>
    );
  }

  const isLoan = type === 'loan' && 'loanAmount' in application;
  const isInvestment = type === 'investment' && 'investmentPlan' in application;
  
  const documents = isLoan ? [
      { name: 'Government ID', url: application.documents.governmentId },
      { name: 'Proof of Address', url: application.documents.proofOfAddress },
      { name: 'Selfie Photo', url: application.documents.selfie },
  ] : isInvestment ? [
      { name: `Government ID (${application.govIdType})`, url: application.govIdUrl },
      { name: 'Proof of Address', url: application.proofOfAddressUrl },
      { name: 'Passport Photo', url: application.passportPhotoUrl },
  ] : [];

  return (
    <div className="space-y-6">
       <Button asChild variant="outline" size="sm">
          <Link href="/admin/applications">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Applications
          </Link>
        </Button>
        
        <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-3xl font-bold">
                {isLoan ? 'Loan' : 'Investment'} Application Details
            </h1>
             <Badge className="text-lg">{application.status}</Badge>
        </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          {/* Main Application Details */}
          <Card>
            <CardHeader>
              <CardTitle>Application Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {isLoan && (
                    <>
                     <DetailItem icon={Wallet} label="Loan Amount" value={formatCurrency(application.loanAmount)} />
                     <DetailItem label="Loan Purpose" value={application.loanPurpose} />
                     <DetailItem label="Repayment Duration" value={`${application.repaymentDuration} months`} />
                    </>
                )}
                 {isInvestment && (
                    <>
                     <DetailItem icon={Briefcase} label="Investment Plan" value={application.investmentPlan} />
                     <DetailItem label="Investment Amount" value={`${formatCurrency(application.investmentAmount)} (${application.currency})`} />
                     <DetailItem label="Expected Duration" value={application.expectedDuration} />
                    </>
                )}
                 <DetailItem label="Submitted At" value={application.createdAt?.toDate ? format(application.createdAt.toDate(), 'PPP p') : 'N/A'} />
            </CardContent>
          </Card>

           {/* Personal Details */}
          <Card>
            <CardHeader><CardTitle>Applicant Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <DetailItem icon={User} label="Full Name" value={application.fullName} />
                <DetailItem icon={Mail} label="Email" value={application.email} />
                <DetailItem icon={Phone} label="Phone" value={isLoan ? application.phone : application.phoneNumber} />
                {isLoan && <DetailItem icon={Calendar} label="Date of Birth" value={format(new Date(application.dateOfBirth), 'PPP')} />}
                {isLoan && <DetailItem icon={MapPin} label="Address" value={`${application.residentialAddress}, ${application.city}, ${application.country}`} />}
                {isInvestment && <DetailItem icon={MapPin} label="Country" value={application.country} />}
            </CardContent>
          </Card>

          {/* Admin Notes */}
          <Card>
             <CardHeader><CardTitle>Admin Notes</CardTitle></CardHeader>
             <CardContent className="space-y-4">
                <Label htmlFor="admin-notes">Add or edit internal notes for this application.</Label>
                <Textarea id="admin-notes" value={note} onChange={(e) => setNote(e.target.value)} rows={4} />
                 <Button onClick={handleSaveNote} disabled={isProcessing}>
                    {isProcessing ? <Spinner size="small" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Note
                </Button>
             </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Actions */}
          {application.status === 'Processing' && (
            <Card>
              <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
              <CardContent className="flex flex-col space-y-2">
                <Button onClick={handleApprove} disabled={isProcessing} variant="default" size="lg">
                  {isProcessing ? <Spinner size="small" /> : <Check className="mr-2 h-4 w-4" />}
                  Approve Application
                </Button>
                <Button onClick={handleReject} disabled={isProcessing} variant="destructive" size="lg">
                  {isProcessing ? <Spinner size="small" /> : <X className="mr-2 h-4 w-4" />}
                  Reject Application
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Documents */}
          <Card>
            <CardHeader><CardTitle>Uploaded Documents</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {documents.map(doc => (
                <a href={doc.url} target="_blank" rel="noopener noreferrer" key={doc.name}>
                  <div className="flex items-center justify-between p-3 rounded-md border hover:bg-secondary">
                    <div className="flex items-center gap-3">
                       <File className="h-5 w-5 text-muted-foreground"/>
                       <span className="font-medium">{doc.name}</span>
                    </div>
                    <Download className="h-5 w-5 text-muted-foreground" />
                  </div>
                </a>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ icon: Icon, label, value }: { icon?: React.ElementType, label: string, value: string | number }) {
  return (
    <div className="flex items-start gap-3">
      {Icon && <Icon className="h-5 w-5 text-muted-foreground mt-1" />}
      <div className={!Icon ? 'ml-8' : ''}>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-base font-semibold">{value}</p>
      </div>
    </div>
  )
}
