import { initializeApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

// Helper to get env variable safely
const getEnv = (key: string) => {
  // Try import.meta.env (Vite) first, then process.env (Node/Compat)
  // @ts-ignore
  return import.meta.env?.[key] || process.env?.[key] || "";
};

const firebaseConfig = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY"),
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnv("VITE_FIREBASE_APP_ID")
};

// Check if config is present (at least API Key and Project ID)
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && 
  firebaseConfig.projectId && 
  firebaseConfig.apiKey.length > 0
);

let db: Firestore;

if (isFirebaseConfigured) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  } catch (error) {
    console.error("Firebase initialization error:", error);
    // We'll fallback to local storage if init fails
  }
} else {
  console.log("⚠️ Firebase Configuration missing. App is running in LocalStorage (Offline) mode.");
}

export { db };