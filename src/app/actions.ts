
"use server";

import { initializeServerApp } from "@/firebase/server-init";
import { addDoc, collection, getFirestore } from "firebase/firestore";
import { loanApplicationSchema } from "@/lib/schemas";
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

type FormState = {
    success: boolean;
    message: string;
}

export async function submitApplication(prevState: FormState, formData: FormData): Promise<FormState> {
  const { app } = await initializeServerApp();
  const firestore = getFirestore(app);
  
  // Manually construct the object and parse the number correctly.
  const rawData = {
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    phoneNumber: formData.get('phoneNumber'),
    typeOfService: formData.get('typeOfService'),
    employmentType: formData.get('employmentType'),
    preferredContactMethod: formData.get('preferredContactMethod'),
    amountRequested: parseFloat(formData.get('amountRequested') as string) || 0,
  };
  
  const validatedFields = loanApplicationSchema.safeParse(rawData);

  if (!validatedFields.success) {
    const errorMessages = Object.values(validatedFields.error.flatten().fieldErrors).flat().join(' ');
    return {
      success: false,
      message: `Validation failed: ${errorMessages || "Please check your inputs."}`,
    };
  }

  let fileUrl = "No file uploaded";
  const file = formData.get('uploadedDocumentUrl') as File;

  try {
    // 1. Handle file upload if a file exists
    if (file && file.size > 0) {
        const storage = getStorage(app);
        const storageRef = ref(storage, `loan-documents/${Date.now()}-${file.name}`);
        
        // Convert file to buffer for upload
        const fileBuffer = await file.arrayBuffer();
        await uploadBytes(storageRef, fileBuffer, { contentType: file.type });

        fileUrl = await getDownloadURL(storageRef);
    }

    // 2. Prepare the document to be saved in Firestore
    const docToSave = {
      ...validatedFields.data,
      submissionDate: new Date().toISOString(),
      uploadedDocumentUrl: fileUrl, 
    };
    
    // 3. Save the document to Firestore
    const collectionRef = collection(firestore, "loanApplications");
    await addDoc(collectionRef, docToSave);

    return { success: true, message: "Application submitted successfully! Our team will contact you shortly." };

  } catch (error) {
    console.error("Form submission error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `An unexpected error occurred: ${errorMessage}. Please try again.` };
  }
}


export async function uploadExcelFile(formData: FormData) {
    const { app } = await initializeServerApp();
    const storage = getStorage(app);
    const firestore = getFirestore(app);
    const file = formData.get('excelFile') as File;

    if (!file || file.size === 0) {
        return { success: false, message: 'No file selected for upload.' };
    }

    try {
        const storageRef = ref(storage, `excel-imports/${Date.now()}-${file.name}`);
        const fileBuffer = await file.arrayBuffer();
        const uploadResult = await uploadBytes(storageRef, fileBuffer, { contentType: file.type });
        
        const fileRecord = {
            fileName: file.name,
            fileUrl: `gs://${uploadResult.metadata.bucket}/${uploadResult.metadata.fullPath}`,
            downloadUrl: await getDownloadURL(uploadResult.ref),
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
