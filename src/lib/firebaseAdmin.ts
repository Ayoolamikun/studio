
import admin from 'firebase-admin';

// Check if the app is already initialized to prevent errors
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!privateKey) {
    // Fallback for environments where GOOGLE_APPLICATION_CREDENTIALS might be set
    // (like in some Google Cloud environments)
    console.log("Initializing Firebase Admin with default credentials...");
    admin.initializeApp();
  } else {
    // Explicit initialization using service account details from .env
    console.log("Initializing Firebase Admin with service account...");
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  }
}

export const db = admin.firestore();
export const adminAuth = admin.auth();
export const adminStorage = admin.storage();
