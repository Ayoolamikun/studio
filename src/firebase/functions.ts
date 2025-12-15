'use client';
import { useMemo } from 'react';
import { getFunctions, httpsCallable as originalHttpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { useFirebase } from '@/firebase/provider';

// This custom hook provides a memoized instance of Firebase Functions
export function useFunctions() {
  const { firebaseApp } = useFirebase();
  const functionsInstance = useMemo(() => {
    const functions = getFunctions(firebaseApp);
    if (process.env.NODE_ENV === 'development') {
      // Connect to the emulator in development mode
      connectFunctionsEmulator(functions, 'localhost', 5001);
    }
    return functions;
  }, [firebaseApp]);
  return functionsInstance;
}

// A typed wrapper around httpsCallable
export function httpsCallable<RequestData = unknown, ResponseData = unknown>(
  functionName: string
) {
  const functions = useFunctions();
  return originalHttpsCallable<RequestData, ResponseData>(functions, functionName);
}
