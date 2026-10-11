import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

// Project Firebase của nhóm (rento-app-e2c08)
const firebaseConfig = {
  apiKey: "AIzaSyCIWs_gfPp0uj2mpGamm_Bonf8RSdAOvsU",
  authDomain: "rento-app-e2c08.firebaseapp.com",
  projectId: "rento-app-e2c08",
  storageBucket: "rento-app-e2c08.firebasestorage.app",
  messagingSenderId: "1012164056693",
  appId: "1:1012164056693:web:dc5313d656cd1d856b4a3c",
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