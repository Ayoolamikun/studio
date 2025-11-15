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

/**
 * Calculates the simple interest rate based on the loan amount.
 * Mirrors the client-side logic.
 * @param {number} amount The principal loan amount.
 * @return {number} The interest rate (e.g., 0.15 for 15%).
 */
function getInterestRate(amount: number): number {
  if (amount >= 10000 && amount <= 50000) {
    return 0.15; // 15%
  } else if (amount > 50000 && amount <= 150000) {
    return 0.10; // 10%
  } else if (amount > 150000) {
    return 0.07; // 7%
  }
  return 0.2; // Default fallback if amount is outside ranges
}

/**
 * Calculates the total repayment amount for a given principal.
 * @param {number} principal The principal loan amount.
 * @return {number} The total amount to be repaid.
 */
function calculateTotalRepayment(principal: number): number {
  const interestRate = getInterestRate(principal);
  return principal + (principal * interestRate);
}


/**
 * Triggered when a new file is uploaded to the 'excel-imports/' path in Storage.
 * This function downloads the Excel file, parses it, and updates Firestore.
 */
export const processExcelUpload = functions.storage
  .object()
  .onFinalize(async (object) => {
    // Exit if this is not an Excel import file.
    const filePath = object.name;
    if (!filePath || !filePath.startsWith("excel-imports/")) {
      console.log(`File ${filePath} is not in the excel-imports/ directory. Exiting.`);
      return null;
    }

    // Exit if the file is not an Excel or CSV file.
    const contentType = object.contentType;
    if (!contentType ||
       (!contentType.includes("spreadsheet") && !contentType.includes("csv"))
    ) {
      console.log(`File ${filePath} is not an Excel file. Content type is ${contentType}. Exiting.`);
      return null;
    }

    console.log(`Processing file: ${filePath}`);

    // Find the corresponding document in the 'ExcelFiles' collection
    const fileUrl = `gs://${object.bucket}/${filePath}`;
    const excelFileQuery = await db.collection("ExcelFiles")
        .where("fileUrl", "==", fileUrl).limit(1).get();

    if (excelFileQuery.empty) {
        console.error(`No Firestore entry found for uploaded file: ${fileUrl}`);
        // Still attempt to process, but this is unexpected.
    }

    const excelFileDoc = excelFileQuery.docs[0];
    if (excelFileDoc?.data().processed) {
        console.log(`File ${filePath} has already been processed. Exiting.`);
        return null;
    }

    try {
      // Download the file from GCS into a buffer
      const response = await axios.get(object.mediaLink, {responseType: "arraybuffer"});
      const fileBuffer = Buffer.from(response.data);

      // Parse the Excel buffer
      const workbook = xlsx.read(fileBuffer, {type: "buffer"});
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet, {header: 1});

      // Assuming header row is the first row
      const headers = (data[0] as string[]).map((h) => h.trim().toLowerCase());
      const rows = data.slice(1);

      console.log(`Found ${rows.length} rows to process.`);

      const batch = db.batch();

      // Process each row
      for (const row of rows) {
        const rowData = (row as any[]).reduce((obj, val, index) => {
          const key = headers[index];
          if (key) {
            // Map common header variations to standardized field names
            if (key.includes("name")) obj.name = val;
            else if (key.includes("phone")) obj.phone = String(val);
            else if (key.includes("bvn")) obj.bvn = String(val);
            else if (key.includes("amount granted")) obj.amountRequested = val;
            else if (key.includes("amount paid")) obj.amountPaid = val;
            else if (key.includes("balance")) obj.balance = val;
            else if (key.includes("due date")) obj.dueDate = val;
            else if (key.includes("status")) obj.status = String(val).toLowerCase();
            else obj[key] = val; // Store any other fields
          }
          return obj;
        }, {} as any);


        // --- Find existing borrower ---
        let borrowerDoc: admin.firestore.DocumentSnapshot | undefined;
        let borrowerRef: admin.firestore.DocumentReference;

        if (rowData.bvn) {
            borrowerRef = db.collection("Borrowers").doc(rowData.bvn);
            borrowerDoc = await borrowerRef.get();
        } else if (rowData.phone) {
             const querySnapshot = await db.collection("Borrowers").where("phone", "==", rowData.phone).limit(1).get();
             if(!querySnapshot.empty) {
                borrowerDoc = querySnapshot.docs[0];
                borrowerRef = borrowerDoc.ref;
             }
        } else if (rowData.name) {
             const querySnapshot = await db.collection("Borrowers").where("name", "==", rowData.name).limit(1).get();
             if(!querySnapshot.empty) {
                borrowerDoc = querySnapshot.docs[0];
                borrowerRef = borrowerDoc.ref;
             }
        } else {
            console.warn("Skipping row, no identifiable info (bvn, phone, or name):", rowData);
            continue;
        }

        const borrowerId = (borrowerDoc && borrowerDoc.exists) ? borrowerDoc.id : rowData.bvn || rowData.phone || `new_${Date.now()}`;

        if (!borrowerDoc || !borrowerDoc.exists) {
            // Create a new borrower if they don't exist
            borrowerRef = db.collection("Borrowers").doc(borrowerId);
            const newBorrowerData = {
                name: rowData.name || "N/A",
                phone: rowData.phone || "N/A",
                bvn: rowData.bvn || "N/A",
                email: rowData.email || "N/A",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            batch.set(borrowerRef, newBorrowerData, {merge: true});
            console.log(`Creating new borrower: ${borrowerId}`);
        }

        // --- Find or create loan ---
        const loansQuery = await db.collection("Loans")
            .where("borrowerId", "==", borrowerId)
            .orderBy("createdAt", "desc")
            .limit(1)
            .get();
        
        const existingLoanDoc = loansQuery.docs[0];
        const loanRef = existingLoanDoc ?
            existingLoanDoc.ref :
            db.collection("Loans").doc(); // Create new loan doc ref

        const amountRequested = rowData.amountRequested || existingLoanDoc?.data().amountRequested || 0;
        const totalRepayment = calculateTotalRepayment(amountRequested);
        const amountPaid = rowData.amountPaid || 0;
        const balance = totalRepayment - amountPaid;

        const loanData = {
            borrowerId,
            amountRequested,
            totalRepayment,
            interestRate: getInterestRate(amountRequested),
            amountPaid,
            balance,
            status: rowData.status || existingLoanDoc?.data().status || "active",
            excelImported: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            // Create createdAt only if it's a new loan
            ...(!existingLoanDoc && {createdAt: admin.firestore.FieldValue.serverTimestamp()}),
        };

        batch.set(loanRef, loanData, {merge: true});
        console.log(`${existingLoanDoc ? "Updating" : "Creating"} loan for borrower ${borrowerId}`);
      }

      // Mark the Excel file as processed
      if(excelFileDoc) {
          batch.update(excelFileDoc.ref, {processed: true});
      }

      // Commit all the batch operations
      await batch.commit();

      console.log(`Successfully processed ${rows.length} rows from ${filePath}.`);
      return null;
    } catch (error) {
      console.error("Error processing Excel file:", error);
       if(excelFileDoc) {
          // Mark as failed if possible
          await excelFileDoc.ref.update({processed: true, error: (error as Error).message});
      }
      return null;
    }
  });
