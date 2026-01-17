import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Validate Firebase config
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.warn('[Firebase] Config is missing credentials. Using fallback mode.');
}

console.log('[Firebase] Initializing with projectId:', firebaseConfig.projectId);

// Initialize Firebase
let app;
let auth;
let db;

try {
  app = initializeApp(firebaseConfig);
  console.log('[Firebase] App initialized successfully');
  
  // Initialize Firestore
  db = getFirestore(app);
  console.log('[Firebase] Firestore initialized');
  
  // Initialize Auth (with error handling)
  try {
    auth = getAuth(app);
    console.log('[Firebase] Auth initialized successfully');
  } catch (authError) {
    console.warn('[Firebase] Auth initialization failed:', authError);
    console.log('[Firebase] App will work in Firestore-only mode');
    // Create a dummy auth object that won't crash the app
    auth = null;
  }
} catch (error) {
  console.error('[Firebase] Initialization error:', error);
  throw error;
}

export { auth, db };
export default app;

