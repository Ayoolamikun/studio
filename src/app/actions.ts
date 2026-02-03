'use server';

import { revalidatePath } from 'next/cache';
import { db, adminAuth, adminStorage } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import ExcelJS from 'exceljs';

const bucket = adminStorage.bucket();
const ADMIN_UID = "pMju3hGH6SaCOJjJ6hW0BSKzBmS2";


// =============================
// HELPERS
// =============================

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


// =============================
// ✅ EXCEL UPLOAD
// =============================

export async function uploadExcelFile(formData: FormData) {
  try {
    const file = formData.get('excelFile') as File;

    if (!file) {
      return { success: false, message: 'No file provided.' };
    }

    const arrayBuffer = await file.arrayBuffer();

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      return { success: false, message: 'No worksheet found in file.' };
    }

    const updates: Promise<any>[] = [];
    const errors: string[] = [];

    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);

      const customerId = row.getCell('A').value as string;
      const amountPaid = row.getCell('B').value as number;

      if (!customerId || typeof amountPaid !== 'number' || amountPaid <= 0) continue;

      const q = db.collection('Loans')
        .where('borrowerId', '==', customerId)
        .where('status', 'in', ['Active', 'Overdue'])
        .limit(1);

      const snap = await q.get();

      if (!snap.empty) {
        const loanDoc = snap.docs[0];
        const loanData = loanDoc.data();

        const newAmountPaid = (loanData.amountPaid || 0) + amountPaid;
        const newOutstandingBalance = Math.max(0, loanData.totalRepayment - newAmountPaid);
        const newStatus = newOutstandingBalance <= 0 ? 'Completed' : loanData.status;

        updates.push(
          loanDoc.ref.update({
            amountPaid: newAmountPaid,
            outstandingBalance: newOutstandingBalance,
            status: newStatus,
            updatedAt: FieldValue.serverTimestamp()
          })
        );
      } else {
        errors.push(`No loan found for row ${i}`);
      }
    }

    await Promise.all(updates);

    revalidatePath('/admin/loans');
    revalidatePath('/admin/customers');

    return {
      success: true,
      message: `Processed ${updates.length} records`
    };

  } catch (error: any) {
    console.error(error);
    return { success: false, message: error.message };
  }
}


// =============================
// ✅ LOAN MANAGEMENT
// =============================

export async function updateLoanStatusAction(loanId: string, status: string) {
  try {
    const loanRef = db.collection('Loans').doc(loanId);
    
    await loanRef.update({
      status: status,
      updatedAt: FieldValue.serverTimestamp()
    });

    revalidatePath('/admin/loans');
    
    return { success: true, message: 'Loan status updated successfully' };
  } catch (error: any) {
    console.error('Error updating loan status:', error);
    return { success: false, message: error.message };
  }
}


// =============================
// ✅ INVESTMENT MANAGEMENT
// =============================

export async function updateInvestmentStatusAction(investmentId: string, status: string) {
  try {
    const investmentRef = db.collection('Investments').doc(investmentId);
    
    await investmentRef.update({
      status: status,
      updatedAt: FieldValue.serverTimestamp()
    });

    revalidatePath('/admin/investments');
    
    return { success: true, message: 'Investment status updated successfully' };
  } catch (error: any) {
    console.error('Error updating investment status:', error);
    return { success: false, message: error.message };
  }
}


// =============================
// ✅ LOAN APPLICATION APPROVAL
// =============================

export async function approveLoanApplicationAction(applicationId: string) {
  try {
    const applicationRef = db.collection('loanApplications').doc(applicationId);
    const applicationDoc = await applicationRef.get();

    if (!applicationDoc.exists) {
      return { success: false, message: 'Application not found' };
    }

    const applicationData = applicationDoc.data();

    if (!applicationData) {
      return { success: false, message: 'Invalid application data' };
    }

    // Update application status
    await applicationRef.update({
      status: 'approved',
      approvedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    // Create loan record
    const loanDetails = calculateLoanDetails(
      applicationData.loanAmount || 0,
      applicationData.repaymentDuration || 12,
      0.05 // 5% interest rate - adjust as needed
    );

    await db.collection('Loans').add({
      borrowerId: applicationData.userId,
      borrowerName: applicationData.fullName,
      borrowerEmail: applicationData.email,
      principal: applicationData.loanAmount,
      duration: applicationData.repaymentDuration,
      interestRate: 0.05,
      totalInterest: loanDetails.totalInterest,
      totalRepayment: loanDetails.totalRepayment,
      monthlyRepayment: loanDetails.monthlyRepayment,
      amountPaid: 0,
      outstandingBalance: loanDetails.totalRepayment,
      status: 'Active',
      purpose: applicationData.loanPurpose,
      applicationId: applicationId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    revalidatePath('/admin/applications');
    revalidatePath('/admin/loans');
    
    return { success: true, message: 'Loan application approved successfully' };
  } catch (error: any) {
    console.error('Error approving loan application:', error);
    return { success: false, message: error.message };
  }
}


// =============================
// ✅ INVESTMENT APPLICATION APPROVAL
// =============================

export async function approveInvestmentApplicationAction(applicationId: string) {
  try {
    const applicationRef = db.collection('investmentApplications').doc(applicationId);
    const applicationDoc = await applicationRef.get();

    if (!applicationDoc.exists) {
      return { success: false, message: 'Application not found' };
    }

    const applicationData = applicationDoc.data();

    if (!applicationData) {
      return { success: false, message: 'Invalid application data' };
    }

    // Update application status
    await applicationRef.update({
      status: 'approved',
      approvedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    // Create investment record
    await db.collection('Investments').add({
      userId: applicationData.userId,
      investorName: applicationData.fullName,
      investorEmail: applicationData.email,
      amount: applicationData.investmentAmount,
      type: applicationData.investmentType || 'standard',
      expectedReturn: applicationData.expectedReturn || 0,
      duration: applicationData.duration || 12,
      status: 'Active',
      applic