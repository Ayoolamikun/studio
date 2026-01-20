
/**
 * @fileoverview Cloud Functions for the Corporate Magnate loan app.
 * This file contains the logic for processing uploaded Excel files to update
 * loan and borrower information in Firestore.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as xlsx from "xlsx";
import axios from "axios";

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();


// This function is now the single source of truth for flat interest calculations.
function calculateLoanDetails(principal: number, duration: number, interestRate: number) {
    const totalInterest = principal * interestRate * duration;
    const totalRepayment = principal + totalInterest;
    const monthlyRepayment = totalRepayment / duration;
    return { totalInterest, totalRepayment, monthlyRepayment };
}


/**
 * Triggered when a new file is uploaded to the 'excel-imports/' path in Storage.
 * This function downloads the Excel file, parses it, and updates Firestore.
 * This optimized version fetches all loans first to reduce DB reads inside the loop.
 */
export const processExcelUpload = functions.storage
  .object()
  .onFinalize(async (object) => {
    const filePath = object.name;
    if (!filePath || !filePath.startsWith("excel-imports/")) {
      console.log(`File ${filePath} is not in the excel-imports/ directory. Exiting.`);
      return null;
    }

    const contentType = object.contentType;
    if (!contentType ||
       (!contentType.includes("spreadsheet") && !contentType.includes("csv"))
    ) {
      console.log(`File ${filePath} is not an Excel file. Content-Type: ${contentType}. Exiting.`);
      return null;
    }

    console.log(`Processing file: ${filePath}`);
    const fileUrl = `gs://${object.bucket}/${filePath}`;
    const excelFileQuery = await db.collection("ExcelFiles").where("fileUrl", "==", fileUrl).limit(1).get();

    if (excelFileQuery.empty) {
        console.error(`No Firestore entry found for uploaded file: ${fileUrl}`);
    } else {
       const excelFileDoc = excelFileQuery.docs[0];
       if (excelFileDoc?.data().processed) {
           console.log(`File ${filePath} has already been processed. Exiting.`);
           return null;
       }
    }

    try {
      // 1. Download and parse the Excel file
      const response = await axios.get(object.mediaLink, {responseType: "arraybuffer"});
      const fileBuffer = Buffer.from(response.data);

      const workbook = xlsx.read(fileBuffer, {type: "buffer"});
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet, {header: 1});

      const headers = (data[0] as string[]).map((h) => h.trim().toLowerCase());
      const rows = data.slice(1);

      console.log(`Found ${rows.length} rows to process.`);

      // 2. OPTIMIZATION: Fetch all active/overdue loans and customers beforehand
      const loansQuery = await db.collection("Loans")
        .where("status", "in", ["Active", "Overdue"])
        .orderBy("createdAt", "desc")
        .get();

      // Create a map of the latest loan for each borrower for quick access
      const loansByBorrowerId = new Map<string, admin.firestore.QueryDocumentSnapshot>();
      for (const doc of loansQuery.docs) {
          const loanData = doc.data();
          if (!loansByBorrowerId.has(loanData.borrowerId)) {
              loansByBorrowerId.set(loanData.borrowerId, doc);
          }
      }
      console.log(`Cached ${loansByBorrowerId.size} active loans in memory.`);

      const batch = db.batch();

      // 3. Process rows with data cached in memory
      for (const row of rows) {
        const rowData = (row as any[]).reduce((obj, val, index) => {
          const key = headers[index];
          if (key) {
            if (key.includes("name")) obj.name = val;
            else if (key.includes("phone")) obj.phone = String(val);
            else if (key.includes("bvn")) obj.bvn = String(val);
            else if (key.includes("loan amount")) obj.loanAmount = Number(val);
            else if (key.includes("amount paid")) obj.amountPaid = Number(val);
            else if (key.includes("balance")) obj.outstandingBalance = Number(val);
            else if (key.includes("status")) obj.status = String(val).toLowerCase();
            else obj[key] = val;
          }
          return obj;
        }, {} as any);

        let customerDoc: admin.firestore.DocumentSnapshot | undefined;
        // This part still queries per row, but it's a fast lookup.
        if (rowData.bvn) {
            const customerRef = db.collection("Customers").doc(rowData.bvn);
            customerDoc = await customerRef.get();
        } else if (rowData.phone && rowData.name) {
             const querySnapshot = await db.collection("Customers")
                .where("phone", "==", rowData.phone)
                .where("name", "==", rowData.name)
                .limit(1)
                .get();
             if(!querySnapshot.empty) customerDoc = querySnapshot.docs[0];
        } else {
            console.warn("Skipping row, not enough info (bvn, or phone+name):", rowData);
            continue;
        }

        if (!customerDoc || !customerDoc.exists) {
            console.warn(`Customer not found for row, skipping:`, rowData);
            continue;
        }
        
        // OPTIMIZATION: Use the in-memory map instead of querying for the loan
        const customerId = customerDoc.id;
        const existingLoanDoc = loansByBorrowerId.get(customerId);
        
        if (!existingLoanDoc) {
            console.warn(`No active loan found in cache for customer ${customerId}, skipping update.`);
            continue;
        }

        const loanRef = existingLoanDoc.ref;
        const currentLoanData = existingLoanDoc.data();
        const amountPaid = rowData.amountPaid ?? currentLoanData.amountPaid ?? 0;
        const outstandingBalance = rowData.outstandingBalance ?? currentLoanData.outstandingBalance ?? currentLoanData.totalRepayment;
        const newStatus = outstandingBalance <= 0 ? 'Completed' : 'Active';

        const loanUpdateData = {
            amountPaid,
            outstandingBalance,
            status: newStatus,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        batch.update(loanRef, loanUpdateData);
        console.log(`Preparing update for loan ${loanRef.id} for customer ${customerId}.`);
      }

      // 4. Commit all updates at once
      if(!excelFileQuery.empty) {
          batch.update(excelFileQuery.docs[0].ref, {processed: true, status: 'processed'});
      }

      await batch.commit();
      console.log(`Successfully processed and committed updates for ${rows.length} rows from ${filePath}.`);
      return null;

    } catch (error) {
      console.error("Error processing Excel file:", error);
       if(!excelFileQuery.empty) {
          await excelFileQuery.docs[0].ref.update({processed: true, status: 'error', error: (error as Error).message});
      }
      return null;
    }
  });

/**
 * Approves a loan application, creating a Customer and a Loan document.
 */
export const approveApplication = functions.https.onCall(async (data, context) => {
    // This is the UID for the designated admin user.
    const adminUid = "pMju3hGH6SaCOJjJ6hW0BSKzBmS2";
    if (!context.auth || context.auth.uid !== adminUid) {
        throw new functions.https.HttpsError("permission-denied", "Only admins can approve applications.");
    }

    const { applicationId } = data;
    if (!applicationId) {
        throw new functions.https.HttpsError("invalid-argument", "The function must be called with an 'applicationId'.");
    }
    
    const applicationRef = db.collection("loanApplications").doc(applicationId);
    
    try {
        const applicationDoc = await applicationRef.get();
        if (!applicationDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Loan application not found.");
        }
        const appData = applicationDoc.data()!;

        if (appData.status === "Approved") {
            throw new functions.https.HttpsError("already-exists", "This application has already been approved.");
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
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
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
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        batch.update(applicationRef, { status: "Approved", updatedAt: admin.firestore.FieldValue.serverTimestamp() });

        await batch.commit();
        return { success: true, message: "Application approved successfully!" };

    } catch (error: any) {
        console.error("Approval Error:", error);
        throw new functions.https.HttpsError("internal", error.message || "An unexpected server error occurred.");
    }
});


/**
 * Approves an investment application, creating an Investment document.
 */
export const approveInvestmentApplication = functions.https.onCall(async (data, context) => {
    // This is the UID for the designated admin user.
    const adminUid = "pMju3hGH6SaCOJjJ6hW0BSKzBmS2";
    if (!context.auth || context.auth.uid !== adminUid) {
        throw new functions.https.HttpsError("permission-denied", "Only admins can approve investments.");
    }

    const { applicationId } = data;
    if (!applicationId) {
        throw new functions.https.HttpsError("invalid-argument", "The function must be called with an 'applicationId'.");
    }

    const applicationRef = db.collection("investmentApplications").doc(applicationId);

    try {
        const applicationDoc = await applicationRef.get();
        if (!applicationDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Investment application not found.");
        }
        const appData = applicationDoc.data()!;

        if (appData.status === "Approved") {
            throw new functions.https.HttpsError("already-exists", "This application has already been approved.");
        }

        const batch = db.batch();
        
        const startDate = new Date();
        const durationInMonths = parseInt(appData.expectedDuration.split(" ")[0]);
        const maturityDate = new Date(startDate.getFullYear(), startDate.getMonth() + durationInMonths, startDate.getDate());

        // Simple ROI calculation for now
        const expectedReturn = appData.investmentAmount * (appData.investmentPlan === 'Gold' ? 1.15 : 1.25);

        const investmentRef = db.collection("Investments").doc();
        batch.set(investmentRef, {
            userId: appData.userId,
            applicationId: applicationId,
            plan: appData.investmentPlan,
            amount: appData.investmentAmount,
            startDate: admin.firestore.Timestamp.fromDate(startDate),
            duration: durationInMonths,
            maturityDate: admin.firestore.Timestamp.fromDate(maturityDate),
            expectedReturn: expectedReturn,
            status: "Active",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        batch.update(applicationRef, { status: "Approved", updatedAt: admin.firestore.FieldValue.serverTimestamp() });

        await batch.commit();
        return { success: true, message: "Investment application approved successfully!" };

    } catch (error: any) {
        console.error("Investment Approval Error:", error);
        throw new functions.https.HttpsError("internal", error.message || "An unexpected server error occurred.");
    }
});


/**
 * Updates the status of a loan. Admin-only.
 */
export const updateLoanStatus = functions.https.onCall(async (data, context) => {
    // This is the UID for the designated admin user.
    const adminUid = "pMju3hGH6SaCOJjJ6hW0BSKzBmS2";
    if (!context.auth || context.auth.uid !== adminUid) {
        throw new functions.https.HttpsError("permission-denied", "Only admins can update loan status.");
    }

    const { loanId, status } = data;
    if (!loanId || !status) {
        throw new functions.https.HttpsError("invalid-argument", "The function must be called with 'loanId' and 'status'.");
    }

    const validStatuses = ["Disbursed", "Active", "Overdue", "Completed", "Rejected"];
    if (!validStatuses.includes(status)) {
        throw new functions.https.HttpsError("invalid-argument", `Invalid status provided. Must be one of: ${validStatuses.join(", ")}`);
    }

    const loanRef = db.collection("Loans").doc(loanId);

    try {
        const payload: { status: string; updatedAt: admin.firestore.FieldValue; disbursedAt?: admin.firestore.FieldValue } = {
            status: status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        if (status === "Disbursed") {
            payload.disbursedAt = admin.firestore.FieldValue.serverTimestamp();
            payload.status = "Active";
        }

        await loanRef.update(payload);

        return { success: true, message: `Loan status successfully updated to ${payload.status}.` };
    } catch (error: any) {
        console.error("Update Loan Status Error:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to update loan status.");
    }
});

/**
 * Saves a new investment application to Firestore.
 */
export const submitInvestmentApplication = functions.https.onCall(async (data, context) => {
    // 1. Authentication Check
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "You must be logged in to submit an application.");
    }

    // 2. Data Validation (basic check, more complex validation is on client)
    const requiredFields = [
        "fullName", "email", "phoneNumber", "country", "investmentPlan",
        "investmentAmount", "currency", "expectedDuration", "govIdType",
        "govIdUrl", "proofOfAddressUrl", "passportPhotoUrl"
    ];
    for (const field of requiredFields) {
        if (!data[field]) {
            throw new functions.https.HttpsError("invalid-argument", `The function must be called with the '${field}' argument.`);
        }
    }
    
    // 3. Create Firestore Document (SANITIZED)
    const applicationData = {
        fullName: data.fullName,
        email: data.email,
        phoneNumber: data.phoneNumber,
        country: data.country,
        investmentPlan: data.investmentPlan,
        investmentAmount: data.investmentAmount,
        currency: data.currency,
        expectedDuration: data.expectedDuration,
        govIdType: data.govIdType,
        govIdUrl: data.govIdUrl,
        proofOfAddressUrl: data.proofOfAddressUrl,
        passportPhotoUrl: data.passportPhotoUrl,
        referralCode: data.referralCode || "", // Sanitize optional field
        notes: data.notes || "", // Sanitize optional field
        userId: context.auth.uid, // Ensure the userId is the authenticated user's ID
        status: "Processing", // Set initial status
        createdAt: admin.firestore.FieldValue.serverTimestamp(), // Use server timestamp
    };
    
    try {
        const docRef = await db.collection("investmentApplications").add(applicationData);
        console.log("Investment application submitted successfully:", docRef.id);
        return { success: true, applicationId: docRef.id };
    } catch (error: any) {
        console.error("Error submitting investment application:", error);
        throw new functions.https.HttpsError("internal", "An error occurred while saving your application. Please try again.");
    }
});
