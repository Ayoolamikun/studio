
/**
 * @fileoverview Cloud Functions for the Corporate Magnate loan app.
 * This file contains the logic for processing uploaded Excel files to update
 * loan and borrower information in Firestore.
 */

import { onObjectFinalized } from "firebase-functions/v2/storage";
import * as admin from "firebase-admin";
import * as xlsx from "xlsx";

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

/**
 * Triggered when a new file is uploaded to the 'excel-imports/' path in Storage.
 * This function downloads the Excel file, parses it, and updates Firestore.
 * This optimized version fetches all loans and customers first to reduce DB reads inside the loop.
 */
export const processExcelUpload = onObjectFinalized(async (event) => {
    const filePath = event.data.name;
    const contentType = event.data.contentType;
    const bucketName = event.data.bucket;

    if (!filePath || !filePath.startsWith("excel-imports/")) {
      console.log(`File ${filePath} is not in the excel-imports/ directory. Exiting.`);
      return null;
    }

    if (!contentType ||
       (!contentType.includes("spreadsheet") && !contentType.includes("csv"))
    ) {
      console.log(`File ${filePath} is not an Excel file. Content-Type: ${contentType}. Exiting.`);
      return null;
    }

    console.log(`Processing file: ${filePath}`);
    const fileUrl = `gs://${bucketName}/${filePath}`;
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
      const bucket = admin.storage().bucket(bucketName);
      const file = bucket.file(filePath);
      const [fileBuffer] = await file.download();

      const workbook = xlsx.read(fileBuffer, {type: "buffer"});
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet, {header: 1});

      const headers = (data[0] as string[]).map((h) => h.trim().toLowerCase());
      const rows = data.slice(1);

      console.log(`Found ${rows.length} rows to process.`);

      // 2. OPTIMIZATION: Fetch all loans and customers beforehand to avoid queries in loop.
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
      
      // Create maps of customers for quick lookup
      const customersQuery = await db.collection("Customers").get();
      const customersByBvn = new Map<string, admin.firestore.QueryDocumentSnapshot>();
      const customersByPhoneAndName = new Map<string, admin.firestore.QueryDocumentSnapshot>();
      for (const doc of customersQuery.docs) {
          const customerData = doc.data();
          if (customerData.bvn) {
            customersByBvn.set(String(customerData.bvn), doc);
          }
          if (customerData.phone && customerData.name) {
            // Using a separator to create a unique key from phone and name
            customersByPhoneAndName.set(`${String(customerData.phone)}|${customerData.name}`, doc);
          }
      }
      console.log(`Cached ${customersQuery.size} customers for lookup.`);


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

        // OPTIMIZATION: Use in-memory maps for customer lookup
        let customerDoc: admin.firestore.DocumentSnapshot | undefined;
        if (rowData.bvn) {
            customerDoc = customersByBvn.get(String(rowData.bvn));
        } else if (rowData.phone && rowData.name) {
             customerDoc = customersByPhoneAndName.get(`${String(rowData.phone)}|${rowData.name}`);
        } else {
            console.warn("Skipping row, not enough info to find customer (needs BVN, or Phone+Name):", rowData);
            continue;
        }

        if (!customerDoc || !customerDoc.exists) {
            console.warn(`Customer not found in cache for row, skipping:`, rowData);
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
