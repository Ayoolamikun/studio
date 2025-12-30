
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
// The service account key is now imported directly from a JSON file.
// This is more secure and reliable than using environment variables for multi-line keys.
import serviceAccount from '@/lib/serviceAccountKey.json';

// This function is for SERVER-SIDE use only (e.g., in Server Actions, API routes)
export async function initializeServerApp() {
  // Check if the app is already initialized to prevent re-initialization
  if (!admin.apps.length) {
    try {
      // Cast the imported JSON to the required type for the credential.
      const credential = admin.credential.cert(serviceAccount as admin.ServiceAccount);

      admin.initializeApp({
        credential,
        storageBucket: 'studio-7087913639-9a972.appspot.com',
      });

    } catch (error: any) {
      console.error("Firebase Admin SDK initialization error:", error.message);
      // Re-throw a more informative error to be caught by the caller.
      // Using standard string concatenation as you suggested for robust error messages.
      throw new Error('Failed to initialize Firebase Admin SDK: ' + error.message);
    }
  }

  const firestore = getFirestore();
  const storage = getStorage();

  return { app: admin.apps[0]!, firestore, storage };
}
