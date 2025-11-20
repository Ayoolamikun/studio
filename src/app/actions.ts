
"use server";

import { initializeFirebase } from "@/firebase/index";
import { addDocumentNonBlocking, setDocumentNonBlocking, WithId } from "@/firebase/non-blocking-updates";
import { loanApplicationSchema } from "@/lib/schemas";
import { contactSchema } from "@/lib/schemas";
import { collection, doc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getInterestRate, calculateTotalRepayment } from "@/lib/utils";

// This is a mock function to simulate sending an email.
async function sendEmail(to: string, subject: string, body: string) {
  console.log("--- Sending Email ---");
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body: \n${body}`);
  console.log("---------------------");
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return { success: true };
}


export async function submitApplication(prevState: any, formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());

  const validatedFields = loanApplicationSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      message: "Validation failed. Please check your inputs.",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  const { firestore } = initializeFirebase();
  const storage = getStorage();

  const { passportPhoto, idDocument, ...applicationData } = validatedFields.data;
  
  try {
    const borrowerId = applicationData.bvn; // Use BVN as a temporary unique ID before auth
    
    // 1. Upload files to Firebase Storage
    const passportPhotoRef = ref(storage, `borrowers/${borrowerId}/passport_${Date.now()}_${passportPhoto.name}`);
    await uploadBytes(passportPhotoRef, passportPhoto);
    const passportUrl = await getDownloadURL(passportPhotoRef);

    const idDocumentRef = ref(storage, `borrowers/${borrowerId}/id_${Date.now()}_${idDocument.name}`);
    await uploadBytes(idDocumentRef, idDocument);
    const idDocumentUrl = await getDownloadURL(idDocumentRef);

    // 2. Create Borrower record (or update if existing)
    const borrowerRef = doc(firestore, "Borrowers", borrowerId);
    const borrowerData = {
        name: applicationData.fullName,
        phone: applicationData.phoneNumber,
        email: applicationData.email,
        bvn: applicationData.bvn,
        employment: applicationData.employmentPlace,
        address: applicationData.homeAddress,
        passportUrl,
        idDocumentUrl,
        createdAt: new Date().toISOString(),
    };
    // Use set with merge to create or update the borrower profile
    setDocumentNonBlocking(borrowerRef, borrowerData, { merge: true });
    
    // 3. Create Loan record
    const amountRequested = parseFloat(applicationData.loanAmount);
    const interestRate = getInterestRate(amountRequested);
    const totalRepayment = calculateTotalRepayment(amountRequested);

    const loanData = {
      borrowerId: borrowerId, // Link to the borrower using BVN
      amountRequested: amountRequested,
      duration: parseInt(applicationData.loanDuration, 10),
      status: "pending",
      amountPaid: 0,
      balance: totalRepayment, // Balance should be the full amount to be repaid
      interestRate: interestRate,
      totalRepayment: totalRepayment,
      createdAt: new Date().toISOString(),
      excelImported: false,
    };

    const loansCol = collection(firestore, "Loans");
    addDocumentNonBlocking(loansCol, loanData);

    // --- Email Notifications ---
    await sendEmail(
      applicationData.email,
      `Your Loan Application with Corporate Magnate`,
      `Dear ${applicationData.fullName},\n\nThank you for applying. Your application for a loan of ₦${applicationData.loanAmount} has been received. Our team will contact you shortly.\n\nBest regards,\nCorporate Magnate Cooperative Society Ltd.`
    );
    
    return { message: "Application submitted successfully! Our team will contact you shortly.", success: true };

  } catch (error) {
    console.error("Form submission error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { message: `An unexpected error occurred: ${errorMessage}. Please try again.` };
  }
}


export async function submitContactInquiry(prevState: any, formData: FormData) {
  const validatedFields = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    message: formData.get("message"),
  });

  if (!validatedFields.success) {
    return {
      message: "Validation failed. Please check your inputs.",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  const { name, email, message } = validatedFields.data;

  try {
     const { firestore } = initializeFirebase();
     const dataToSave = {
        name,
        email,
        message,
        submissionDate: new Date().toISOString(),
     }
     const collectionRef = collection(firestore, "contactFormSubmissions");
     addDocumentNonBlocking(collectionRef, dataToSave);
    
    const emailSubject = `New Contact Inquiry from ${name}`;
    const emailBody = `
      You have a new message from your website contact form.
      
      Name: ${name}
      Email: ${email}
      
      Message:
      ${message}
    `;

    // Send notification to the company
    await sendEmail("corporatemagnate@outlook.com", emailSubject, emailBody);

    return { message: "Thank you for your message! We will get back to you soon.", success: true };
  } catch (error) {
    console.error("Contact form error:", error);
    return { message: "An unexpected error occurred. Please try again." };
  }
}

export async function uploadExcelFile(formData: FormData): Promise<{ success: boolean, message: string }> {
  const file = formData.get('excelFile') as File;

  if (!file) {
    return { success: false, message: 'No file selected.' };
  }

  const { firestore } = initializeFirebase();
  const storage = getStorage();

  try {
    const storageRef = ref(storage, `excel-imports/${Date.now()}-${file.name}`);
    const uploadResult = await uploadBytes(storageRef, file);
    const fileUrl = await getDownloadURL(uploadResult.ref);

    const excelFilesCol = collection(firestore, 'ExcelFiles');
    // Note: getDownloadURL gives a long-lived HTTPS URL, not the gs:// path.
    // The cloud function expects the gs:// path. Let's save the gs:// path.
    const gsPath = `gs://${uploadResult.ref.bucket}/${uploadResult.ref.fullPath}`;
    
    await addDocumentNonBlocking(excelFilesCol, {
      fileUrl: gsPath, // Store the gs:// path for the cloud function
      uploadedAt: new Date().toISOString(),
      processed: false,
    });
    
    return { success: true, message: 'File uploaded successfully! It will be processed shortly.' };
  } catch (error) {
    console.error('Excel upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message: `File upload failed: ${errorMessage}` };
  }
}
