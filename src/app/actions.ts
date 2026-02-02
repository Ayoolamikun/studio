'use server';

import { revalidatePath } from 'next/cache';
import { db, adminAuth, adminStorage } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

const bucket = adminStorage.bucket();
const ADMIN_UID = "pMju3hGH6SaCOJjJ6hW0BSKzBmS2";

// This function is now the single source of truth for flat interest calculations.
function calculateLoanDetails(principal: number, duration: number, interestRate: number) {
    const totalInterest = principal * interestRate * duration;
    const totalRepayment = principal + totalInterest;
    const monthlyRepayment = totalRepayment / duration;
    return { totalInterest, totalRepayment, monthlyRepayment };
}

export async function approveLoanApplicationAction(applicationId: string, idToken: string) {
    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        if (decodedToken.uid !== ADMIN_UID) {
            return { success: false, message: "Permission denied. User is not an admin." };
        }

        const applicationRef = db.collection("loanApplications").doc(applicationId);
        const applicationDoc = await applicationRef.get();
        if (!applicationDoc.exists) {
             return { success: false, message: "Loan application not found." };
        }
        const appData = applicationDoc.data()!;

        if (appData.status === "Approved") {
            return { success: false, message: "This application has already been approved." };
        }

        const batch = db.batch();

        let customerId: string;
        // Use a stable customer ID, like the user's UID, if possible
        const customerRef = db.collection("Customers").doc(appData.userId);
        const customerDoc = await customerRef.get();

        if (!customerDoc.exists) {
             customerId = customerRef.id;
             batch.set(customerRef, {
                name: appData.fullName,
                email: appData.email,
                phone: appData.phone,
                bvn: appData.bvn || '',
                createdAt: FieldValue.serverTimestamp(),
            });
        } else {
            customerId = customerDoc.id;
        }
        
        const interestRate = 0.05; // 5% flat monthly interest
        const { totalInterest, totalRepayment, monthlyRepayment } = calculateLoanDetails(appData.loanAmount, appData.repaymentDuration, interestRate);

        const loanRef = db.collection("Loans").doc();
        batch.set(loanRef, {
            borrowerId: customerId,
            applicationId: applicationId,
            loanAmount: appData.loanAmount,
            duration: appData.repaymentDuration,
            interestRate: interestRate,
            totalInterest: totalInterest,
            totalRepayment: totalRepayment,
            monthlyRepayment: monthlyRepayment,
            amountPaid: 0,
            outstandingBalance: totalRepayment,
            status: "Approved",
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
        
        batch.update(applicationRef, { status: "Approved", updatedAt: FieldValue.serverTimestamp() });

        await batch.commit();
        revalidatePath('/admin/applications');
        revalidatePath('/admin/loans');
        return { success: true, message: "Application approved successfully!" };

    } catch (error: any) {
        return { success: false, message: error.message || 'An unexpected server error occurred.' };
    }
}


export async function uploadExcelFile(formData: FormData) {
  try {
    const file = formData.get('excelFile') as File;
    if (!file) {
      return { success: false, message: 'No file provided.' };
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Get a reference to the storage bucket
    const fileName = `excel-imports/${Date.now()}-${file.name}`;
    const fileUpload = bucket.file(fileName);

    // Stream the file to Firebase Storage
    const stream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.type,
      },
    });

    await new Promise((resolve, reject) => {
      stream.on('error', reject);
      stream.on('finish', resolve);
      stream.end(buffer);
    });

    const publicUrl = `gs://${bucket.name}/${fileName}`;

    // Create a record in Firestore
    await db.collection('ExcelFiles').add({
      fileName: file.name,
      fileUrl: publicUrl,
      uploadedAt: FieldValue.serverTimestamp(),
      processed: false, // Mark as not processed
      status: 'uploaded',
    });

    revalidatePath('/admin/excel');
    return { success: true, message: 'File uploaded successfully. Processing will begin shortly.' };
  } catch (error: any) {
    console.error('Error in uploadExcelFile:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

export async function addCustomer(formData: FormData) {
    try {
        const name = formData.get('name') as string;
        const email = formData.get('email') as string;
        const phone = formData.get('phone') as string;
        const bvn = formData.get('bvn') as string;

        if (!name || !email || !phone) {
            return { success: false, message: 'Name, email, and phone are required.' };
        }

        const newCustomer = {
            name,
            email,
            phone,
            bvn: bvn || '',
            createdAt: FieldValue.serverTimestamp(),
        };

        const docRef = await db.collection('Customers').add(newCustomer);

        revalidatePath('/admin/customers');
        return { success: true, message: `Customer "${name}" added successfully with ID ${docRef.id}.` };

    } catch (error: any) {
        console.error('Error in addCustomer:', error);
        return { success: false, message: error.message || 'Failed to add customer.' };
    }
}
