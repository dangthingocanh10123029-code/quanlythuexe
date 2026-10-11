import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyDEEZskDHI4NvBKnmrO58IbnGLSSnUEYKw",
  authDomain: "car-rental-adv.firebaseapp.com",
  projectId: "car-rental-adv",
  storageBucket: "car-rental-adv.firebasestorage.app",
  messagingSenderId: "730119150751",
  appId: "1:730119150751:web:41dc6974d405005ac016aa"
};

// Initialize Firebase with error handling
let app;
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
} catch (error) {
  console.error("Firebase initialization error:", error);
  app = initializeApp(firebaseConfig);
}

// Keep both auth and firestore exports
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;