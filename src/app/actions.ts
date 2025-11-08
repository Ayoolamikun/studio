"use server";

import { initializeFirebase } from "@/firebase/index";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { applicationSchema, contactSchema } from "@/lib/schemas";
import { collection } from "firebase/firestore";

// This is a mock function to simulate sending an email.
// In a real application, you would integrate an email service like Resend, SendGrid, or Nodemailer.
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
  
  // Quick fix for amount to be string
  if (typeof rawData.amount === 'number') {
      rawData.amount = String(rawData.amount);
  }

  // Handle file
  const documentFile = formData.get("document") as File;
  if(documentFile && documentFile.size > 0) {
      // For now, we'll just store the file name. In a real app, you'd upload this to Firebase Storage.
      rawData.documentUrl = documentFile.name; 
  }
  delete rawData.document; // remove file object

  const validatedFields = applicationSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      message: "Validation failed. Please check your inputs.",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  const { fullName, email, typeOfService } = validatedFields.data;
  
  try {
    const { firestore } = initializeFirebase();
    let collectionName = "";
    let dataToSave: any = {
      ...validatedFields.data,
      submissionDate: new Date().toISOString(),
      status: "pending",
    };

    switch(typeOfService) {
      case "Loan":
        collectionName = "loanApplications";
        break;
      case "Investment":
        collectionName = "investmentPlans"; // Or a new collection for investment applications
        dataToSave.planName = "Custom"; // Example data
        break;
      case "Membership":
        collectionName = "membershipApplications";
        break;
      default:
        throw new Error("Invalid service type");
    }
    
    const collectionRef = collection(firestore, collectionName);
    addDocumentNonBlocking(collectionRef, dataToSave);


    // --- Email Notifications (can be moved to a Firebase Function later) ---
    const emailSubject = `New ${typeOfService} Application from ${fullName}`;
    const emailBody = `
      You have received a new application.
      
      Details:
      ${Object.entries(validatedFields.data)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n")}
    `;

    // Send notification to the company
    await sendEmail("corporatemagnate@outlook.com", emailSubject, emailBody);

    // Send confirmation to the user
    await sendEmail(
      email,
      `Your ${typeOfService} Application with Corporate Magnate`,
      `Dear ${fullName},\n\nThank you for applying. Your application for ${typeOfService} has been received. Our team will contact you shortly.\n\nBest regards,\nCorporate Magnate Cooperative Society Ltd.`
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
