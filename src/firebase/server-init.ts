
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// This function is for SERVER-SIDE use only (e.g., in Server Actions, API routes)
export async function initializeServerApp() {
  // Check if the app is already initialized to prevent re-initialization
  if (!admin.apps.length) {
    try {
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

      if (!serviceAccountJson) {
        throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set or is empty.");
      }

      const serviceAccount = JSON.parse(serviceAccountJson);

      // Initialize using the parsed service account object
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
