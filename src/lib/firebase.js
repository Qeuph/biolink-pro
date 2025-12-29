import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDIuvZF7X3fTKn6QjCFjneVWe4em9dJLGM",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "biolink-pro-c6e8e.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "biolink-pro-c6e8e",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "biolink-pro-c6e8e.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "865275605116",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:865275605116:web:60698d09ca8c676f1899f9",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-CY7P1TLMTT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize Analytics only in browser
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Helper for Firestore batch operations
export const batch = () => getFirestore().batch();

// Security rules validation helper
export const validateUsername = (username) => {
  const regex = /^[a-zA-Z0-9_]{3,30}$/;
  return regex.test(username);
};

export const validateEmailDomain = (email) => {
  const allowedDomains = ['gmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'proton.me', 'hotmail.com', 'me.com'];
  const domain = email.split('@')[1]?.toLowerCase();
  return allowedDomains.includes(domain);
};
