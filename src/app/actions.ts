
'use server';

import { revalidatePath } from 'next/cache';
import admin from 'firebase-admin';

// Ensure the app is initialized only once.
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const storage = admin.storage();


export async function uploadExcelFile(formData: FormData) {
  try {
    const file = formData.get('excelFile') as File;
    if (!file) {
      return { success: false, message: 'No file provided.' };
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Get a reference to the storage bucket
    const bucket = storage.bucket();
    const fileName = `excel-imports/${Date.now()}-${file.name}`;
    const fileUpload = bucket.file(fileName);

    // Stream the file to Firebase Storage
    const stream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.type,
      },
    });

    await new Promise((resolve, reject) => {
      stream.on('error', reject);
      stream.on('finish', resolve);
      stream.end(buffer);
    });

    const publicUrl = `gs://${bucket.name}/${fileName}`;

    // Create a record in Firestore
    await db.collection('ExcelFiles').add({
      fileName: file.name,
      fileUrl: publicUrl,
      uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      processed: false, // Mark as not processed
      status: 'uploaded',
    });

    revalidatePath('/admin/excel');
    return { success: true, message: 'File uploaded successfully. Processing will begin shortly.' };
  } catch (error: any) {
    console.error('Error in uploadExcelFile:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}


export async function generateExcelReport(formData: FormData) {
    try {
        const month = formData.get('month') as string; // YYYY-MM
        if (!month) {
            return { success: false, message: 'Month is required.' };
        }

        const startDate = new Date(`${month}-01T00:00:00`);
        const endDate = new Date(startDate);
        endDate.setMonth(startDate.getMonth() + 1);
        endDate.setDate(0);
        endDate.setHours(23, 59, 59, 999);

        const loansSnapshot = await db.collection('Loans')
            .where('createdAt', '>=', startDate)
            .where('createdAt', '<=', endDate)
            .get();

        if (loansSnapshot.empty) {
            return { success: false, message: 'No loans found for the selected month.' };
        }

        const loansData = loansSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                createdAt: (data.createdAt.toDate as () => Date)().toISOString(),
                updatedAt: (data.updatedAt.toDate as () => Date)().toISOString(),
            };
        });
        
        return { success: true, message: 'Report generated successfully.', data: loansData };

    } catch (error: any) {
        console.error('Error in generateExcelReport:', error);
        return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
}


export async function addCustomer(formData: FormData) {
    try {
        const name = formData.get('name') as string;
        const email = formData.get('email') as string;
        const phone = formData.get('phone') as string;
        const bvn = formData.get('bvn') as string;

        if (!name || !email || !phone) {
            return { success: false, message: 'Name, email, and phone are required.' };
        }

        const newCustomer = {
            name,
            email,
            phone,
            bvn: bvn || '',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const docRef = await db.collection('Customers').add(newCustomer);

        revalidatePath('/admin/customers');
        return { success: true, message: `Customer "${name}" added successfully with ID ${docRef.id}.` };

    } catch (error: any) {
        console.error('Error in addCustomer:', error);
        return { success: false, message: error.message || 'Failed to add customer.' };
    }
}
