
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// This function is for SERVER-SIDE use only (e.g., in Server Actions, API routes)
export async function initializeServerApp() {
  // Check if the app is already initialized to prevent re-initialization
  if (!admin.apps.length) {
    try {
      // Correctly parse the private key which may be escaped in environment variables
      const privateKey = process.env.FIREBASE_PRIVATE_KEY
        ? JSON.parse(process.env.FIREBASE_PRIVATE_KEY)
        : undefined;

      if (!privateKey) {
        throw new Error("FIREBASE_PRIVATE_KEY environment variable is not set or is invalid.");
      }
      
      // Initialize using server-side environment variables
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
      console.log("Firebase Admin SDK initialized successfully via service account.");
    } catch (error: any) {
      console.error("Firebase Admin SDK initialization error:", error.message);
      // This is a critical error in production.
      throw new Error(`Failed to initialize Firebase Admin SDK: ${error.message}`);
    }
  }

  const firestore = getFirestore();
  const storage = getStorage();

  return { app: admin.apps[0]!, firestore, storage };
}
