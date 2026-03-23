import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBBZWPzpJ_z4BlNSnAJb2ER8cIszTDsdvU", 
  authDomain: "pharmacyinventorysystem-c8c47.firebaseapp.com", 
  projectId: "pharmacyinventorysystem-c8c47", 
  storageBucket: "pharmacyinventorysystem-c8c47.firebasestorage.app", 
  messagingSenderId: "155832331024", 
  appId: "1:155832331024:web:7bac0f095823c1d4e8d395", 
  measurementId: "G-LD5G7NEJJ9" 
};

console.log('[Firebase] Initializing with projectId:', firebaseConfig.projectId);

// Initialize Firebase
let app;
let auth;
let db;
let analytics;

try {
  app = initializeApp(firebaseConfig);
  console.log('[Firebase] App initialized successfully');
  
  // Initialize Firestore
  db = getFirestore(app);
  console.log('[Firebase] Firestore initialized');
  
  // Initialize Auth
  auth = getAuth(app);
  console.log('[Firebase] Auth initialized successfully');

  // Initialize Analytics (only works in browser environments)
  if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
    console.log('[Firebase] Analytics initialized');
  }
} catch (error) {
  console.error('[Firebase] Initialization error:', error);
  throw error;
}

export { auth, db, analytics };
export default app;

