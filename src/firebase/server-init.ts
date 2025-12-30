
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { firebaseConfig } from '@/firebase/config';

// This function is for SERVER-SIDE use only (e.g., in Server Actions)
export async function initializeServerApp() {
  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
        storageBucket: firebaseConfig.storageBucket,
      });
    } catch (error: any) {
      console.error("Firebase admin initialization error:", error.message);
      // Fallback for local development if env vars are not set
      // This helps in local testing but relies on GOOGLE_APPLICATION_CREDENTIALS
      if (!process.env.FIREBASE_PROJECT_ID) {
         admin.initializeApp({
            storageBucket: firebaseConfig.storageBucket,
         });
      }
    }
  }

  const firestore = getFirestore();
  const storage = getStorage();

  return { app: admin.apps[0], firestore, storage };
}
