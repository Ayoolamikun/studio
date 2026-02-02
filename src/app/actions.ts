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

async function verifyAdmin(idToken: string) {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    if (decodedToken.uid !== ADMIN_UID) {
        throw new Error("Permission denied. User is not an admin.");
    }
    return decodedToken;
}

export async function approveLoanApplicationAction(applicationId: string, idToken: string) {
    try {
        await verifyAdmin(idToken);

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


export async function approveInvestmentApplicationAction(applicationId: string, idToken: string) {
    try {
        await verifyAdmin(idToken);
        
        const applicationRef = db.collection("investmentApplications").doc(applicationId);
        const applicationDoc = await applicationRef.get();
        if (!applicationDoc.exists) {
            return { success: false, message: "Investment application not found." };
        }
        const appData = applicationDoc.data()!;

        if (appData.status === "Approved") {
            return { success: false, message: "This application has already been approved." };
        }

        const batch = db.batch();
        
        const startDate = new Date();
        const durationInMonths = parseInt(appData.expectedDuration.split(" ")[0]);
        const maturityDate = new Date(startDate.getFullYear(), startDate.getMonth() + durationInMonths, startDate.getDate());

        const annualRate = appData.investmentPlan === 'Gold' ? 0.029 : 0.035;
        const durationInYears = durationInMonths / 12;
        const expectedReturn = appData.investmentAmount * (1 + (annualRate * durationInYears));

        const investmentRef = db.collection("Investments").doc();
        batch.set(investmentRef, {
            userId: appData.userId,
            applicationId: applicationId,
            plan: appData.investmentPlan,
            amount: appData.investmentAmount,
            startDate: FieldValue.serverTimestamp(),
            duration: durationInMonths,
            maturityDate: maturityDate,
            expectedReturn: expectedReturn,
            status: "Active",
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
        
        batch.update(applicationRef, { status: "Approved", updatedAt: FieldValue.serverTimestamp() });

        await batch.commit();
        revalidatePath('/admin/applications');
        revalidatePath('/admin/investments');
        return { success: true, message: "Investment application approved successfully!" };
    } catch (error: any) {
        return { success: false, message: error.message || 'An unexpected server error occurred.' };
    }
}

export async function updateLoanStatusAction(loanId: string, status: string, idToken: string) {
    try {
        await verifyAdmin(idToken);

        const validStatuses = ["Disbursed", "Active", "Overdue", "Completed", "Rejected"];
        if (!validStatuses.includes(status)) {
            return { success: false, message: `Invalid status provided. Must be one of: ${validStatuses.join(", ")}` };
        }

        const loanRef = db.collection("Loans").doc(loanId);
        const payload: { status: string; updatedAt: FieldValue; disbursedAt?: FieldValue } = {
            status: status,
            updatedAt: FieldValue.serverTimestamp()
        };

        if (status === "Disbursed") {
            payload.disbursedAt = FieldValue.serverTimestamp();
            payload.status = "Active"; // Disbursed loans immediately become Active
        }

        await loanRef.update(payload);

        revalidatePath('/admin/loans');
        return { success: true, message: `Loan status successfully updated to ${payload.status}.` };
    } catch (error: any) {
        return { success: false, message: error.message || 'Failed to update loan status.' };
    }
}

export async function updateInvestmentStatusAction(investmentId: string, status: string, idToken: string) {
    try {
        await verifyAdmin(idToken);

        const validStatuses = ["Active", "Matured", "Withdrawn"];
        if (!validStatuses.includes(status)) {
            return { success: false, message: `Invalid status provided. Must be one of: ${validStatuses.join(", ")}` };
        }

        const investmentRef = db.collection("Investments").doc(investmentId);
        await investmentRef.update({
            status: status,
            updatedAt: FieldValue.serverTimestamp()
        });

        revalidatePath('/admin/investments');
        return { success: true, message: `Investment status successfully updated to ${status}.` };
    } catch (error: any) {
        return { success: false, message: error.message || 'Failed to update investment status.' };
    }
}
