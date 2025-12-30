
"use server";

import { initializeServerApp } from "@/firebase/server-init";
import { addDoc, collection } from "firebase/firestore";
import { loanApplicationSchema } from "@/lib/schemas";
import * as XLSX from 'xlsx';

type FormState = {
    success: boolean;
    message: string;
    data?: any[];
}

export async function submitApplication(prevState: FormState, formData: FormData): Promise<FormState> {
  // 1. Initialize the Admin SDK
  const { firestore, storage } = await initializeServerApp();
  const bucket = storage.bucket();
  
  // 2. Extract and prepare form data for validation
  const rawData: any = {
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    phoneNumber: formData.get('phoneNumber'),
    typeOfService: formData.get('typeOfService'),
    employmentType: formData.get('employmentType'),
    preferredContactMethod: formData.get('preferredContactMethod'),
    amountRequested: parseFloat(formData.get('amountRequested') as string) || 0,
    uploadedDocumentUrl: formData.get('uploadedDocumentUrl'), 
    guarantorIdUrl: formData.get('guarantorIdUrl')
  };

  if (rawData.employmentType === "Private Individual") {
      rawData.guarantorFullName = formData.get('guarantorFullName');
      rawData.guarantorPhoneNumber = formData.get('guarantorPhoneNumber');
      rawData.guarantorAddress = formData.get('guarantorAddress');
      rawData.guarantorEmploymentPlace = formData.get('guarantorEmploymentPlace');
      rawData.guarantorRelationship = formData.get('guarantorRelationship');
  }
  
  // 3. Validate the data using Zod schema
  const validatedFields = loanApplicationSchema.safeParse(rawData);

  if (!validatedFields.success) {
    const errorMessages = Object.values(validatedFields.error.flatten().fieldErrors).flat().join(' ');
    return {
      success: false,
      message: `Validation failed: ${errorMessages || "Please check your inputs."}`,
    };
  }

  // 4. Define the server-side file upload function
  const uploadFile = async (file: File | null, folder: string): Promise<string> => {
      if (!file || file.size === 0) {
        return "";
      }
      
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const filePath = `${folder}/${Date.now()}-${file.name.replace(/\s/g, '_')}`;
      const fileUpload = bucket.file(filePath);

      await fileUpload.save(buffer, {
        metadata: {
          contentType: file.type,
        },
      });

      await fileUpload.makePublic();
      
      return fileUpload.publicUrl();
  }


  try {
    // 5. Upload files using the admin-powered function
    const userDocUrl = await uploadFile(validatedFields.data.uploadedDocumentUrl as File, 'loan-documents');
    const guarantorIdUrl = await uploadFile(validatedFields.data.guarantorIdUrl as File, 'guarantor-ids');

    // 6. Prepare the final document for Firestore
    const docToSave = {
      ...validatedFields.data,
      submissionDate: new Date().toISOString(),
      // Replace file objects with their public URLs
      uploadedDocumentUrl: userDocUrl,
      guarantorIdUrl: guarantorIdUrl,
      status: 'pending', // Set initial status
    };
    
    // 7. Save to Firestore
    const collectionRef = collection(firestore, "loanApplications");
    await addDoc(collectionRef, docToSave);

    return { success: true, message: "Application submitted successfully! Our team will contact you shortly." };

  } catch (error) {
    console.error("Form submission error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    
    // Check for storage errors specifically
    if (error instanceof Error && 'code' in error && (error as any).code?.includes('storage')) {
         return { success: false, message: `A storage error occurred. Please try again. Error: ${errorMessage}` };
    }
    
    return { success: false, message: `An unexpected error occurred: ${errorMessage}. Please try again.` };
  }
}


export async function uploadExcelFile(formData: FormData) {
    const { storage, firestore } = await initializeServerApp();
    const bucket = storage.bucket();
    const file = formData.get('excelFile') as File;

    if (!file || file.size === 0) {
        return { success: false, message: 'No file selected for upload.' };
    }

    try {
        const filePath = `excel-imports/${Date.now()}-${file.name}`;
        const fileBuffer = await file.arrayBuffer();
        const fileRef = bucket.file(filePath);
        
        await fileRef.save(Buffer.from(fileBuffer), {
            metadata: { contentType: file.type },
        });
        await fileRef.makePublic();
        const downloadUrl = fileRef.publicUrl();


        const fileRecord = {
            fileName: file.name,
            fileUrl: `gs://${bucket.name}/${filePath}`,
            downloadUrl: downloadUrl,
            uploadedAt: new Date().toISOString(),
            processed: false,
        };

        const excelFilesCollection = collection(firestore, 'ExcelFiles');
        await addDoc(excelFilesCollection, fileRecord);

        return { success: true, message: 'File uploaded successfully! Processing will begin shortly.' };
    } catch (error) {
        console.error('File upload error:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during upload.';
        return { success: false, message: `Upload failed: ${errorMessage}` };
    }
}


export async function generateExcelReport(formData: FormData): Promise<FormState> {
    const { firestore } = await initializeServerApp();
    const month = formData.get('month') as string; // YYYY-MM

    if (!month) {
        return { success: false, message: "Month is required to generate the report." };
    }

    try {
        const loansSnapshot = await firestore.collection('Loans').get();
        const customersSnapshot = await firestore.collection('Customers').get();
        
        const customersMap = new Map(customersSnapshot.docs.map(doc => [doc.id, doc.data()]));

        const reportData = loansSnapshot.docs.map(loanDoc => {
            const loan = loanDoc.data();
            const customer = customersMap.get(loan.borrowerId);
            const totalRepayment = loan.totalRepayment || 0;
            const amountPaid = loan.amountPaid || 0;
            const balance = totalRepayment - amountPaid;

            let paymentStatus = 'UNDERPAID';
            if (balance <= 0) paymentStatus = 'PAID';
            if (amountPaid > totalRepayment) paymentStatus = 'OVERPAID';
            if(loan.status === 'active' && amountPaid === 0) paymentStatus = 'UNDERPAID';

            return {
                'Borrower Full Name': customer?.name || 'N/A',
                'Customer Type': customer?.employmentType || 'N/A', // Assuming employmentType is on customer
                'Phone Number': customer?.phone || 'N/A',
                'BVN': customer?.bvn || 'N/A',
                'Loan Type': loan.loanType || 'New', // Assuming loanType field
                'Loan Amount Approved': loan.amountRequested,
                'Interest Rate': loan.interestRate,
                'Loan Tenor (Months)': loan.duration || 'N/A',
                'Monthly Installment': loan.totalRepayment / (loan.duration || 1),
                'Total Repayment Expected': totalRepayment,
                'Total Amount Paid': amountPaid,
                'Outstanding Balance': balance,
                'Payment Status': paymentStatus,
                'Loan Start Date': loan.createdAt?.toDate ? loan.createdAt.toDate().toLocaleDateString() : 'N/A',
                'Loan End Date': loan.dueDate || 'N/A',
                'Last Payment Date': loan.lastPaymentDate || 'N/A',
                'Guarantor Name': 'N/A',
                'Guarantor Phone': 'N/A',
            };
        });

        if (reportData.length === 0) {
            return { success: false, message: "No loan data found for the selected period." };
        }

        return { 
            success: true, 
            message: "Report data generated successfully.",
            data: reportData,
        };

    } catch (error) {
        console.error('Excel report generation error:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return { success: false, message: `Report generation failed: ${errorMessage}` };
    }
}

    