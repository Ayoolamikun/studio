
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
        throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set.");
      }

      // Important: Correctly parse the private key by replacing escaped newlines.
      const serviceAccount = JSON.parse(serviceAccountJson);
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }

      // Initialize using the parsed and corrected service account object
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
      console.log("Firebase Admin SDK initialized successfully.");

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
