
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


        let borrowerDoc: admin.firestore.DocumentSnapshot | undefined;
        let borrowerRef: admin.firestore.DocumentReference | undefined;

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

        if ((!borrowerDoc || !borrowerDoc.exists) && borrowerRef) {
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

        const loansQuery = await db.collection("Loans")
            .where("borrowerId", "==", borrowerId)
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
            borrowerId,
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
        console.log(`${existingLoanDoc ? "Updating" : "Creating"} loan for borrower ${borrowerId}`);
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
