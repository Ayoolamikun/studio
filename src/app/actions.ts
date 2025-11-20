
"use server";

import { initializeFirebase } from "@/firebase/index";
import { addDoc, collection } from "firebase/firestore";
import { loanApplicationSchema } from "@/lib/schemas";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export async function submitApplication(prevState: any, formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());
  
  // The file input is handled separately, so we only validate the text fields.
  const validatedFields = loanApplicationSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      message: "Validation failed. Please check your inputs.",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  const { firestore } = initializeFirebase();
  const file = formData.get("uploadedDocumentUrl") as File;

  try {
    const docToSave = {
      ...validatedFields.data,
      amountRequested: parseFloat(validatedFields.data.amountRequested),
      submissionDate: new Date().toISOString(),
      // Use the file name if a file was uploaded, otherwise indicate no file.
      uploadedDocumentUrl: file && file.size > 0 ? file.name : "No file uploaded",
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
