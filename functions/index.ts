
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
    // This is the UID for the user: corporatemagnatecoop@outlook.com
    const adminUid = "1EW8TCRo2LOdJEHrWrrVOTvJZJE2";
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
        const customerRef = db.collection("Customers").doc(appData.bvn);
        const customerDoc = await customerRef.get();

        if (!customerDoc.exists) {
             customerId = customerRef.id;
             batch.set(customerRef, {
                name: appData.fullName,
                email: appData.email,
                phone: appData.phoneNumber,
                bvn: appData.bvn,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        } else {
            customerId = customerDoc.id;
        }
        
        const interestRate = 0.05; // 5% flat monthly interest
        const { totalInterest, totalRepayment, monthlyRepayment } = calculateLoanDetails(appData.loanAmount, appData.loanDuration, interestRate);

        const loanRef = db.collection("Loans").doc();
        batch.set(loanRef, {
            borrowerId: customerId,
            applicationId: applicationId,
            loanAmount: appData.loanAmount,
            duration: appData.loanDuration,
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
        
        batch.update(applicationRef, { status: "Approved" });

        await batch.commit();
        return { success: true, message: "Application approved successfully!" };

    } catch (error: any) {
        console.error("Approval Error:", error);
        throw new functions.https.HttpsError("internal", error.message || "An unexpected server error occurred.");
    }
});

/**
 * Updates the status of a loan. Admin-only.
 */
export const updateLoanStatus = functions.https.onCall(async (data, context) => {
    // This is the UID for the user: corporatemagnatecoop@outlook.com
    const adminUid = "1EW8TCRo2LOdJEHrWrrVOTvJZJE2";
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
 * Retrieves all files for the currently authenticated user.
 */
export const getUserFiles = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  }
  const snapshot = await db.collection("userFiles").where("userId", "==", context.auth.uid).orderBy("uploadedAt", "desc").get();
  const files = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    uploadedAt: doc.data().uploadedAt.toDate().toISOString(),
  }));
  return { success: true, files };
});

/**
 * Deletes a file from Firebase Storage and its corresponding metadata from Firestore.
 */
export const deleteFile = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  }
  const { fileId } = data;
  if (!fileId) {
    throw new functions.https.HttpsError("invalid-argument", "fileId is required.");
  }

  const fileRef = db.collection("userFiles").doc(fileId);
  const doc = await fileRef.get();

  if (!doc.exists || doc.data()?.userId !== context.auth.uid) {
    throw new functions.https.HttpsError("permission-denied", "You do not have permission to delete this file.");
  }

  const filePath = doc.data()?.filePath;
  if (filePath) {
    await admin.storage().bucket().file(filePath).delete();
  }
  
  await fileRef.delete();
  return { success: true };
});

/**
 * Handles file uploads from the client, sends to Firebase Storage, and saves metadata.
 */
export const uploadFile = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "You must be authenticated.");
    }
    const { file, fileName } = data;
    if (!file || !fileName) {
        throw new functions.https.HttpsError("invalid-argument", "File and fileName are required.");
    }

    try {
        const destination = `user-uploads/${context.auth.uid}/${Date.now()}-${fileName}`;
        
        const bucket = admin.storage().bucket();
        const bucketFile = bucket.file(destination);

        const matches = file.match(/^data:(.+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid base64 string format.');
        }
        const contentType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        
        await bucketFile.save(buffer, { metadata: { contentType } });
        
        // Make the file public
        await bucketFile.makePublic();

        // Get the public URL
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;

        await db.collection("userFiles").add({
            userId: context.auth.uid,
            fileUrl: publicUrl,
            filePath: destination,
            fileName: fileName,
            fileType: contentType,
            size: buffer.length,
            uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { success: true, url: publicUrl };
    } catch (error: any) {
        console.error("Upload failed", error);
        throw new functions.https.HttpsError("internal", error.message || "An unexpected error occurred during upload.");
    }
});


/**
 * Handles the entire loan application submission process from the public form.
 * This version uses a single transactional try-catch block for robust error handling and rollback.
 */
export const submitApplicationAndCreateUser = functions.https.onCall(async (data, context) => {
    const { 
        email, password, fullName, phoneNumber, placeOfEmployment, customerType, bvn,
        loanAmount, loanDuration, passportPhotoUrl, idUrl,
        guarantorFullName, guarantorPhoneNumber, guarantorAddress, guarantorRelationship 
    } = data;
    
    // The URLs are now passed directly from the client.
    if (!email || !password || !fullName || !passportPhotoUrl || !idUrl) {
        throw new functions.https.HttpsError("invalid-argument", "Missing required fields for application submission.");
    }

    let userId: string | null = null;

    try {
        // STEP 1: Create the user account.
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
            displayName: fullName,
            phoneNumber: phoneNumber,
            emailVerified: false,
        });
        userId = userRecord.uid;

        // STEP 2: Prepare data for Firestore.
        // File uploads are now done on the client, so we just save the URLs.
        const submissionData: any = {
            userId: userId,
            fullName: fullName,
            email: email,
            phoneNumber: phoneNumber,
            placeOfEmployment: placeOfEmployment,
            customerType: customerType,
            bvn: bvn,
            loanAmount: loanAmount,
            loanDuration: loanDuration,
            passportPhotoUrl: passportPhotoUrl, // This is now a URL string
            idUrl: idUrl, // This is now a URL string
            submissionDate: admin.firestore.FieldValue.serverTimestamp(),
            status: 'Processing',
        };
        
        if (customerType === 'Private Individual') {
            submissionData.guarantorFullName = guarantorFullName;
            submissionData.guarantorPhoneNumber = guarantorPhoneNumber;
            submissionData.guarantorAddress = guarantorAddress;
            submissionData.guarantorRelationship = guarantorRelationship;
        }

        // STEP 3: Write the application to Firestore.
        await db.collection("loanApplications").add(submissionData);

        // If all steps succeed, return success.
        return { success: true, message: "Application submitted successfully!" };

    } catch (error: any) {
        console.error("Error during application submission:", error);

        // If a user account was created before the error occurred, attempt to roll it back.
        if (userId) {
            try {
                await admin.auth().deleteUser(userId);
                console.log(`Successfully rolled back user creation for UID: ${userId}`);
            } catch (rollbackError) {
                console.error(`CRITICAL: Failed to roll back user creation for UID: ${userId}. Manual cleanup required. Rollback error:`, rollbackError);
            }
        }
        
        // Check for a specific auth error code that we want to handle gracefully.
        if (error.code === 'auth/email-already-exists') {
            throw new functions.https.HttpsError('already-exists', 'An account with this email address already exists. Please log in.');
        }

        // For all other errors, throw a properly formatted HttpsError.
        const errorMessage = error.message || "An unexpected server error occurred during submission.";
        throw new functions.https.HttpsError("internal", `Submission failed: ${errorMessage}`);
    }
});

    