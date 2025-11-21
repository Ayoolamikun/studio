
"use server";

import { initializeFirebase } from "@/firebase/index";
import { addDoc, collection } from "firebase/firestore";
import { loanApplicationSchema } from "@/lib/schemas";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

type FormState = {
    success: boolean;
    message: string;
}

export async function submitApplication(prevState: FormState, formData: FormData): Promise<FormState> {
  const { firestore, firebaseApp } = initializeFirebase();
  const rawData = Object.fromEntries(formData.entries());
  
  // The 'uploadedDocumentUrl' from FormData is a File object, which Zod can't handle directly in the schema.
  // We extract it and will process it separately.
  const file = rawData.uploadedDocumentUrl instanceof File ? rawData.uploadedDocumentUrl : undefined;

  // Let's validate the rest of the fields.
  const validatedFields = loanApplicationSchema.safeParse(rawData);

  if (!validatedFields.success) {
    const errorMessages = Object.values(validatedFields.error.flatten().fieldErrors).flat().join(' ');
    return {
      success: false,
      message: `Validation failed: ${errorMessages || "Please check your inputs."}`,
    };
  }

  let fileUrl = "No file uploaded";
  try {
    // 1. Handle file upload if a file exists
    if (file && file.size > 0) {
        const storage = getStorage(firebaseApp);
        const storageRef = ref(storage, `loan-documents/${Date.now()}-${file.name}`);
        const uploadResult = await uploadBytes(storageRef, file);
        fileUrl = await getDownloadURL(uploadResult.ref); // Get the public URL
    }

    // 2. Prepare the document to be saved in Firestore
    const docToSave = {
      ...validatedFields.data,
      submissionDate: new Date().toISOString(),
      uploadedDocumentUrl: fileUrl, // Save the download URL or the "No file" string
    };
    
    // We remove the file object itself before saving to Firestore.
    delete (docToSave as any).uploadedDocumentUrlFile;

    // 3. Save the document to Firestore
    const collectionRef = collection(firestore, "loanApplications");
    
    addDoc(collectionRef, docToSave)
        .catch(error => {
            console.error("Firestore Error:", error);
            // This is non-blocking, so we emit the error for the listener to catch
            errorEmitter.emit(
                'permission-error',
                new FirestorePermissionError({
                    path: collectionRef.path,
                    operation: 'create',
                    requestResourceData: docToSave,
                })
            )
        });

    return { success: true, message: "Application submitted successfully! Our team will contact you shortly." };

  } catch (error) {
    console.error("Form submission error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `An unexpected error occurred: ${errorMessage}. Please try again.` };
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
        
        // The cloud function will be triggered by this upload.
        // We'll also create a record in Firestore to track this upload.
        const { firestore } = initializeFirebase();
        const fileRecord = {
            fileName: file.name,
            fileUrl: `gs://${uploadResult.metadata.bucket}/${uploadResult.metadata.fullPath}`, // GCS URI for the function
            downloadUrl: await getDownloadURL(uploadResult.ref), // Public URL for client access if needed
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
