"use server";

import { initializeFirebase } from "@/firebase/index";
import { addDoc, collection } from "firebase/firestore";
import { loanApplicationSchema } from "@/lib/schemas";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export async function submitApplication(prevState: any, formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());
  
  const { uploadedDocumentUrl, ...textData } = rawData;

  const validatedFields = loanApplicationSchema.safeParse(textData);

  if (!validatedFields.success) {
    return {
      message: "Validation failed. Please check your inputs.",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  const { firestore } = initializeFirebase();

  try {
    const docToSave = {
      ...validatedFields.data,
      amountRequested: parseFloat(validatedFields.data.amountRequested),
      submissionDate: new Date().toISOString(),
      uploadedDocumentUrl: formData.get("uploadedDocumentUrl") ? (formData.get("uploadedDocumentUrl") as File).name : "No file uploaded",
    };

    const collectionRef = collection(firestore, "loanApplications");
    
    addDoc(collectionRef, docToSave)
        .catch(error => {
            errorEmitter.emit(
                'permission-error',
                new FirestorePermissionError({
                    path: collectionRef.path,
                    operation: 'create',
                    requestResourceData: docToSave,
                })
            )
        });


    return { message: "Application submitted successfully! Our team will contact you shortly.", success: true };

  } catch (error) {
    console.error("Form submission error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { message: `An unexpected error occurred: ${errorMessage}. Please try again.` };
  }
}
