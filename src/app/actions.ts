
"use server";

import { initializeFirebase } from "@/firebase/index";
import { addDoc, collection } from "firebase/firestore";
import { loanApplicationSchema } from "@/lib/schemas";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { getStorage, ref, uploadBytes } from 'firebase/storage';

export async function submitApplication(prevState: any, formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());
  
  const validatedFields = loanApplicationSchema.safeParse(rawData);

  if (!validatedFields.success) {
    console.error("Validation Errors:", validatedFields.error.flatten().fieldErrors);
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
      uploadedDocumentUrl: file && file.size > 0 ? file.name : "No file uploaded",
    };

    const collectionRef = collection(firestore, "loanApplications");
    
    addDoc(collectionRef, docToSave)
        .catch(error => {
            console.error("Firestore Error:", error);
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

export async function uploadExcelFile(formData: FormData) {
    const { firebaseApp } = initializeFirebase();
    const storage = getStorage(firebaseApp);
    const file = formData.get('excelFile') as File;

    if (!file || file.size === 0) {
        return { success: false, message: 'No file selected for upload.' };
    }

    try {
        const storageRef = ref(storage, `excel-imports/${Date.now()}-${file.name}`);
        const uploadResult = await uploadBytes(storageRef, file);

        // This part is crucial. The cloud function will be triggered by this upload.
        // We just need to confirm the upload was successful on the client side.
        
        // Also, let's create a record in Firestore to track this upload.
        const { firestore } = initializeFirebase();
        const fileRecord = {
            fileName: file.name,
            fileUrl: `gs://${uploadResult.metadata.bucket}/${uploadResult.metadata.fullPath}`,
            uploadedAt: new Date().toISOString(),
            processed: false, // The Cloud Function will set this to true
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
