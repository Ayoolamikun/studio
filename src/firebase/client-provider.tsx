
'use client';

import React, { type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { app, auth, firestore, storage, functions } from '@/firebase';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  // The Firebase services are now initialized directly in the index file.
  // We just need to pass them to the provider.
  return (
    <FirebaseProvider
      firebaseApp={app}
      auth={auth}
      firestore={firestore}
      storage={storage}
      functions={functions}
    >
      {children}
    </FirebaseProvider>
  );
}
