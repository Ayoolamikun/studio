
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

// These functions are self-contained within the cloud function environment.
function getInterestRate(amount: number): number {
  if (amount >= 10000 && amount <= 50000) {
    return 0.15; // 15%
  } else if (amount > 50000 && amount <= 150000) {
    return 0.10; // 10%
  } else if (amount > 150000) {
    return 0.07; // 7%
  }
  return 0.20; 
}

function calculateTotalRepayment(principal: number): number {
  const interestRate = getInterestRate(principal);
  const total = principal + (principal * interestRate);
  return total;
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
      console.log(`File ${filePath} is not an Excel file. Content type is ${contentType}. Exiting.`);
      return null;
    }

    console.log(`Processing file: ${filePath}`);

    const fileUrl = `gs://${object.bucket}/${filePath}`;
    const excelFileQuery = await db.collection("ExcelFiles")
        .where("fileUrl", "==", fileUrl).limit(1).get();

    if (excelFileQuery.empty) {
        console.error(`No Firestore entry found for uploaded file: ${fileUrl}`);
    }

    const excelFileDoc = excelFileQuery.docs[0];
    if (excelFileDoc?.data().processed) {
        console.log(`File ${filePath} has already been processed. Exiting.`);
        return null;
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
            else if (key.includes("amount granted")) obj.amountRequested = val;
            else if (key.includes("amount paid")) obj.amountPaid = val;
            else if (key.includes("balance")) obj.balance = val;
            else if (key.includes("due date")) obj.dueDate = val;
            else if (key.includes("status")) obj.status = String(val).toLowerCase();
            else obj[key] = val;
          }
          return obj;
        }, {} as any);


        let customerDoc: admin.firestore.DocumentSnapshot | undefined;
        let customerRef: admin.firestore.DocumentReference | undefined;

        if (rowData.bvn) {
            customerRef = db.collection("Customers").doc(rowData.bvn);
            customerDoc = await customerRef.get();
        } else if (rowData.phone) {
             const querySnapshot = await db.collection("Customers").where("phone", "==", rowData.phone).limit(1).get();
             if(!querySnapshot.empty) {
                customerDoc = querySnapshot.docs[0];
                customerRef = customerDoc.ref;
             }
        } else if (rowData.name) {
             const querySnapshot = await db.collection("Customers").where("name", "==", rowData.name).limit(1).get();
             if(!querySnapshot.empty) {
                customerDoc = querySnapshot.docs[0];
                customerRef = customerDoc.ref;
             }
        } else {
            console.warn("Skipping row, no identifiable info (bvn, phone, or name):", rowData);
            continue;
        }

        const customerId = (customerDoc && customerDoc.exists) ? customerDoc.id : rowData.bvn || rowData.phone || `new_${Date.now()}`;

        if ((!customerDoc || !customerDoc.exists) && customerRef) {
            const newCustomerData = {
                name: rowData.name || "N/A",
                phone: rowData.phone || "N/A",
                bvn: rowData.bvn || "N/A",
                email: rowData.email || "N/A",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            batch.set(customerRef, newCustomerData, {merge: true});
            console.log(`Creating new customer: ${customerId}`);
        }

        const loansQuery = await db.collection("Loans")
            .where("borrowerId", "==", customerId)
            .orderBy("createdAt", "desc")
            .limit(1)
            .get();
        
        const existingLoanDoc = loansQuery.docs[0];
        const loanRef = existingLoanDoc ?
            existingLoanDoc.ref :
            db.collection("Loans").doc();

        const amountRequested = rowData.amountRequested || existingLoanDoc?.data().amountRequested || 0;
        const totalRepayment = calculateTotalRepayment(amountRequested);
        const amountPaid = rowData.amountPaid || 0;
        const balance = totalRepayment - amountPaid;

        const loanData = {
            borrowerId: customerId,
            amountRequested,
            totalRepayment,
            interestRate: getInterestRate(amountRequested),
            amountPaid,
            balance,
            status: rowData.status || existingLoanDoc?.data().status || "active",
            excelImported: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            ...(!existingLoanDoc && {createdAt: admin.firestore.FieldValue.serverTimestamp()}),
        };

        batch.set(loanRef, loanData, {merge: true});
        console.log(`${existingLoanDoc ? "Updating" : "Creating"} loan for customer ${customerId}`);
      }

      if(excelFileDoc) {
          batch.update(excelFileDoc.ref, {processed: true});
      }

      await batch.commit();

      console.log(`Successfully processed ${rows.length} rows from ${filePath}.`);
      return null;
    } catch (error) {
      console.error("Error processing Excel file:", error);
       if(excelFileDoc) {
          await excelFileDoc.ref.update({processed: true, error: (error as Error).message});
      }
      return null;
    }
  });


/**
 * Uploads a file to Cloudinary and saves metadata to Firestore.
 */
export const uploadFile = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be logged in to upload files.",
    );
  }

  const {file, fileName, folder} = data;
  const userId = context.auth.uid;

  if (!file) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "File data is required.",
    );
  }

  try {
    const result = await cloudinary.uploader.upload(file, {
      folder: folder || `users/${userId}`,
      resource_type: "auto",
      public_id: fileName ? fileName.split(".")[0] : undefined,
    });

    const fileDoc = await admin.firestore().collection("userFiles").add({
      userId: userId,
      fileUrl: result.secure_url,
      publicId: result.public_id,
      fileName: fileName || result.original_filename,
      fileType: result.resource_type,
      format: result.format,
      size: result.bytes,
      width: result.width,
      height: result.height,
      uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      fileId: fileDoc.id,
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error: any) {
    console.error("Upload error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Deletes a file from Cloudinary and Firestore.
 */
export const deleteFile = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be logged in.",
    );
  }

  const {fileId, publicId} = data;
  const userId = context.auth.uid;

  try {
    const fileDoc = await admin.firestore().collection("userFiles")
      .doc(fileId).get();

    if (!fileDoc.exists) {
      throw new functions.https.HttpsError("not-found", "File not found");
    }

    if (fileDoc.data()?.userId !== userId) {
      // Check if user is admin - only for deletion
      const userRecord = await admin.auth().getUser(userId);
      if (!userRecord.customClaims || !userRecord.customClaims.admin) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "You do not have permission to delete this file.",
        );
      }
    }

    await cloudinary.uploader.destroy(publicId);
    await admin.firestore().collection("userFiles").doc(fileId).delete();

    return {success: true, message: "File deleted successfully"};
  } catch (error: any) {
    console.error("Delete error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Approves a loan application, creating a Borrower and a Loan document.
 */
export const approveApplication = functions.https.onCall(async (data, context) => {
    // 1. Check for admin privileges.
    if (!context.auth || context.auth.token.admin !== true) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Only admins can approve applications.",
        );
    }

    const { applicationId } = data;
    if (!applicationId) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "The function must be called with an 'applicationId'.",
        );
    }
    
    const applicationRef = db.collection("loanApplications").doc(applicationId);
    
    try {
        const batch = db.batch();
        const applicationDoc = await applicationRef.get();

        if (!applicationDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Loan application not found.");
        }

        const appData = applicationDoc.data()!;

        if (appData.status === "approved") {
            throw new functions.https.HttpsError("already-exists", "This application has already been approved.");
        }

        // 2. Find or create the Customer.
        let customerId: string;
        const customersRef = db.collection("Customers");
        const existingCustomerQuery = await customersRef.where("email", "==", appData.email).limit(1).get();

        if (!existingCustomerQuery.empty) {
            customerId = existingCustomerQuery.docs[0].id;
        } else {
            // Create a new customer if one doesn't exist.
            const newCustomerRef = customersRef.doc(); // Auto-generate ID
            customerId = newCustomerRef.id;
            batch.set(newCustomerRef, {
                name: appData.fullName,
                email: appData.email,
                phone: appData.phoneNumber,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        
        // 3. Create the new Loan document.
        if (appData.typeOfService === 'Loan') {
            const amount = appData.amountRequested;
            const totalRepayment = calculateTotalRepayment(amount);

            const loanRef = db.collection("Loans").doc(); // Auto-generate ID
            batch.set(loanRef, {
                borrowerId: customerId,
                amountRequested: amount,
                interestRate: getInterestRate(amount),
                totalRepayment: totalRepayment,
                amountPaid: 0,
                balance: totalRepayment,
                status: "approved", // Initial status for a new loan.
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                applicationId: applicationId, // Link back to the original application.
            });
        }
        
        // 4. Update the original application status.
        batch.update(applicationRef, { status: "approved" });

        // 5. Commit all writes as a single transaction.
        await batch.commit();

        return { success: true, message: "Application approved successfully!" };
    } catch (error: any) {
        console.error("Approval Error:", error);
        throw new functions.https.HttpsError("internal", error.message || "An unexpected server error occurred.");
    }
});


/**
 * Retrieves all files for the authenticated user.
 */
export const getUserFiles = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be logged in.",
    );
  }

  const userId = context.auth.uid;

  try {
    const snapshot = await admin
      .firestore()
      .collection("userFiles")
      .where("userId", "==", userId)
      .orderBy("uploadedAt", "desc")
      .get();

    const files = snapshot.docs.map((doc) => {
      const docData = doc.data();
      return {
        id: doc.id,
        ...docData,
        uploadedAt: (docData.uploadedAt as admin.firestore.Timestamp)
          ?.toDate().toISOString(),
      };
    });

    return {success: true, files};
  } catch (error: any) {
    console.error("Get files error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});
