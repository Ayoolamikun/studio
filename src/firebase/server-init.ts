
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { firebaseConfig } from '@/firebase/config';

// This function is for SERVER-SIDE use only (e.g., in Server Actions)
export async function initializeServerApp() {
  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  const firestore = getFirestore(app);
  const storage = getStorage(app);
  return { app, firestore, storage };
}
