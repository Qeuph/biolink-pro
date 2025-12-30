import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBDWC-5Hgn1WfBuwQLEKjZxYiY46EfNlKY",
  authDomain: "biolink-pro-362b4.firebaseapp.com",
  projectId: "biolink-pro-362b4",
  storageBucket: "biolink-pro-362b4.firebasestorage.app",
  messagingSenderId: "211687101012",
  appId: "1:211687101012:web:3ccc43c381a1c15af653c1"
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
