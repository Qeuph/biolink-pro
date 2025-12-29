import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDIuvZF7X3fTKn6QjCFjneVWe4em9dJLGM",
  authDomain: "biolink-pro-c6e8e.firebaseapp.com",
  projectId: "biolink-pro-c6e8e",
  storageBucket: "biolink-pro-c6e8e.firebasestorage.app",
  messagingSenderId: "865275605116",
  appId: "1:865275605116:web:60698d09ca8c676f1899f9",
  measurementId: "G-CY7P1TLMTT"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
