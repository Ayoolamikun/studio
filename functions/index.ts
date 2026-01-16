
/**
 * @fileoverview Cloud Functions for the Corporate Magnate loan app.
 * This file contains the logic for processing uploaded Excel files to update
 * loan and borrower information in Firestore.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as xlsx from "xlsx";
import axios from "axios";
import { v2 as cloudinary } from "cloudinary";

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// Configure Cloudinary using Firebase function config
// These values are set using the `firebase functions:config:set` command
cloudinary.config({
  cloud_name: functions.config().cloudinary.cloud_name,
  api_key: functions.config().cloudinary.api_key,
  api_secret: functions.config().cloudinary.api_secret,
});


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
      const response = await axios.get(object.mediaLink, {responseType: "arraybuffer"});
      const fileBuffer = Buffer.from(response.data);

      const workbook = xlsx.read(fileBuffer, {type: "buffer"});
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet, {header: 1});

      const headers = (data[0] as string[]).map((h) => h.trim().toLowerCase());
      const rows = data.slice(1);

      console.log(`Found ${rows.length} rows to process.`);

      const batch = db.batch();

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
        // Match by BVN first, then Phone + Name
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

        const customerId = customerDoc.id;
        const loansQuery = await db.collection("Loans")
            .where("borrowerId", "==", customerId)
            .where("status", "in", ["Active", "Overdue"])
            .orderBy("createdAt", "desc")
            .limit(1)
            .get();
        
        if (loansQuery.empty) {
            console.warn(`No active loan found for customer ${customerId}, skipping update.`);
            continue;
        }

        const existingLoanDoc = loansQuery.docs[0];
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
        console.log(`Updating loan ${loanRef.id} for customer ${customerId}. New balance: ${outstandingBalance}, Status: ${newStatus}`);
      }

      if(!excelFileQuery.empty) {
          batch.update(excelFileQuery.docs[0].ref, {processed: true});
      }

      await batch.commit();
      console.log(`Successfully processed ${rows.length} rows from ${filePath}.`);
      return null;

    } catch (error) {
      console.error("Error processing Excel file:", error);
       if(!excelFileQuery.empty) {
          await excelFileQuery.docs[0].ref.update({processed: true, error: (error as Error).message});
      }
      return null;
    }
  });


/**
 * Uploads a file to Cloudinary and returns metadata. Does not save to Firestore.
 */
const uploadToCloudinary = async (file: string, folder: string, fileName: string) => {
    try {
        const result = await cloudinary.uploader.upload(file, {
            folder: folder,
            resource_type: "auto",
            public_id: fileName ? fileName.split(".")[0] : undefined,
        });
        return result;
    } catch (error: any) {
        console.error("Cloudinary Upload error:", error);
        throw new functions.https.HttpsError("internal", `Cloudinary upload failed: ${error.message}`);
    }
};

/**
 * Approves a loan application, creating a Customer and a Loan document.
 */
export const approveApplication = functions.https.onCall(async (data, context) => {
    // The new admin UID for corporatemagnatecoop@outlook.com should be pasted here.
    const adminUid = "PASTE_YOUR_NEW_ADMIN_UID_HERE";
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
        // Use BVN as the Customer document ID for uniqueness
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
        
        // Calculate loan terms. Assuming a flat monthly interest rate for simplicity.
        // THIS IS A PLACEHOLDER. Replace with your actual interest logic.
        const interestRate = 0.05; // 5% flat monthly interest
        const { totalInterest, totalRepayment, monthlyRepayment } = calculateLoanDetails(appData.loanAmount, appData.loanDuration, interestRate);

        const loanRef = db.collection("Loans").doc();
        batch.set(loanRef, {
            borrowerId: customerId,
            applicationId: applicationId,
            loanAmount: appData.loanAmount,
            duration: appData.loanDuration,
            interestRate: interestRate, // Store the rate used
            totalInterest: totalInterest,
            totalRepayment: totalRepayment,
            monthlyRepayment: monthlyRepayment,
            amountPaid: 0,
            outstandingBalance: totalRepayment,
            status: "Approved", // Initial status for a new loan.
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
    // The new admin UID for corporatemagnatecoop@outlook.com should be pasted here.
    const adminUid = "PASTE_YOUR_NEW_ADMIN_UID_HERE";
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

        // If marking as disbursed, set the disbursed date and immediately move to Active
        if (status === "Disbursed") {
            payload.disbursedAt = admin.firestore.FieldValue.serverTimestamp();
            payload.status = "Active"; // Automatically transition to Active
        }

        await loanRef.update(payload);

        return { success: true, message: `Loan status successfully updated to ${payload.status}.` };
    } catch (error: any) {
        console.error("Update Loan Status Error:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to update loan status.");
    }
});


/**
 * Saves file metadata to Firestore after a successful Cloudinary upload.
 * This function is callable by an authenticated user.
 */
export const saveFileMetadata = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  }
  const { fileUrl, publicId, fileName, fileType, size } = data;
  if (!fileUrl || !publicId || !fileName || !fileType || !size) {
    throw new functions.https.HttpsError("invalid-argument", "Missing required file metadata.");
  }
  await db.collection("userFiles").add({
    userId: context.auth.uid,
    fileUrl,
    publicId,
    fileName,
    fileType,
    size,
    uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { success: true };
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
 * Deletes a file from Cloudinary and its corresponding metadata from Firestore.
 */
export const deleteFile = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  }
  const { fileId, publicId } = data;
  if (!fileId || !publicId) {
    throw new functions.https.HttpsError("invalid-argument", "fileId and publicId are required.");
  }
  const fileRef = db.collection("userFiles").doc(fileId);
  const doc = await fileRef.get();
  if (!doc.exists || doc.data()?.userId !== context.auth.uid) {
    throw new functions.https.HttpsError("permission-denied", "You do not have permission to delete this file.");
  }
  await cloudinary.uploader.destroy(publicId, { resource_type: doc.data()?.fileType === "raw" ? "raw" : "image" });
  await fileRef.delete();
  return { success: true };
});

/**
 * Handles file uploads from the client, sends to Cloudinary, and saves metadata.
 */
export const uploadFile = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "You must be authenticated.");
    }
    const { file, fileName, folder } = data;
    if (!file || !fileName) {
        throw new functions.https.HttpsError("invalid-argument", "File and fileName are required.");
    }

    try {
        const result = await uploadToCloudinary(file, `${folder}/${context.auth.uid}`, fileName);
        
        await db.collection("userFiles").add({
            userId: context.auth.uid,
            fileUrl: result.secure_url,
            publicId: result.public_id,
            fileName: fileName,
            fileType: result.resource_type,
            size: result.bytes,
            uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { success: true, url: result.secure_url };
    } catch (error: any) {
        console.error("Upload failed", error);
        throw new functions.https.HttpsError("internal", error.message || "An unexpected error occurred during upload.");
    }
});
