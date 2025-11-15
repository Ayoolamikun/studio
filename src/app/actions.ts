
"use server";

import { initializeFirebase } from "@/firebase/index";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { loanApplicationSchema, contactSchema } from "@/lib/schemas";
import { collection } from "firebase/firestore";
import { getStorage, ref, uploadBytes } from "firebase/storage";

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
    // 1. Upload files to Firebase Storage
    const passportPhotoRef = ref(storage, `passports/${Date.now()}_${passportPhoto.name}`);
    await uploadBytes(passportPhotoRef, passportPhoto);

    const idDocumentRef = ref(storage, `documents/${Date.now()}_${idDocument.name}`);
    await uploadBytes(idDocumentRef, idDocument);

    // In a real app, you'd get the download URLs. For now, we'll store the path.
    const passportUrl = passportPhotoRef.fullPath;
    const idDocumentUrl = idDocumentRef.fullPath;

    // 2. Create Borrower record (or find existing one)
    // For now, we assume a new borrower for each application for simplicity.
    const borrowerData = {
        fullName: applicationData.fullName,
        email: applicationData.email,
        phoneNumber: applicationData.phoneNumber,
        bvn: applicationData.bvn,
        homeAddress: applicationData.homeAddress,
        employmentPlace: applicationData.employmentPlace,
        passportUrl,
        idDocumentUrl,
        createdAt: new Date().toISOString(),
    };

    const borrowersCol = collection(firestore, "Borrowers");
    const borrowerRef = await addDocumentNonBlocking(borrowersCol, borrowerData);
    
    // 3. Create Loan record
    const loanData = {
      borrowerId: borrowerRef.id,
      amountRequested: parseFloat(applicationData.loanAmount),
      duration: parseInt(applicationData.loanDuration, 10),
      status: "pending",
      amountPaid: 0,
      balance: parseFloat(applicationData.loanAmount), // initial balance
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
