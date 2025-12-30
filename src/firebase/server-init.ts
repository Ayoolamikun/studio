
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// This function is for SERVER-SIDE use only (e.g., in Server Actions, API routes)
export async function initializeServerApp() {
  // Check if the app is already initialized to prevent re-initialization
  if (!admin.apps.length) {
    try {
      // Attempt to initialize using environment variables
      // This is the primary method for Vercel, Firebase Hosting, etc.
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Replace escaped newlines from environment variable
          privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        }),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
      console.log("Firebase Admin SDK initialized successfully.");
    } catch (error: any) {
      console.error("Firebase Admin SDK initialization error:", error.message);
      // This fallback is useful for local development if GOOGLE_APPLICATION_CREDENTIALS is set
      // but should not be relied upon for production deployments.
      if (!process.env.FIREBASE_PROJECT_ID && process.env.NODE_ENV === 'development') {
         console.warn("Falling back to default admin initialization. Ensure GOOGLE_APPLICATION_CREDENTIALS is set for local development.");
         admin.initializeApp({
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
         });
      } else if (process.env.NODE_ENV === 'production') {
        // In production, failure to initialize is a critical error.
        throw new Error(`Failed to initialize Firebase Admin SDK: ${error.message}`);
      }
    }
  }

  const firestore = getFirestore();
  const storage = getStorage();

  return { app: admin.apps[0]!, firestore, storage };
}
