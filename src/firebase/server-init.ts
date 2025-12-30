
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import serviceAccount from '@/lib/serviceAccountKey.json';

// This function is for SERVER-SIDE use only (e.g., in Server Actions, API routes)
export async function initializeServerApp() {
  // Check if the app is already initialized to prevent re-initialization
  if (!admin.apps.length) {
    try {
      // The serviceAccount is imported directly from the JSON file.
      // Ensure the file path is correct and the file contains your actual service account credentials.
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });

    } catch (error: any) {
      console.error("Firebase Admin SDK initialization error:", error.message);
      // Re-throw a more informative error to be caught by the caller
      throw new Error(`Failed to initialize Firebase Admin SDK: ${error.message}`);
    }
  }

  const firestore = getFirestore();
  const storage = getStorage();

  return { app: admin.apps[0]!, firestore, storage };
}
