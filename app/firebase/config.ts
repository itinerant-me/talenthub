import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDOw9vxsNjRXcOGBU3DG8QN2k7F7mQPaLs",
  authDomain: "tidyhire-talenthub.firebaseapp.com",
  projectId: "tidyhire-talenthub",
  storageBucket: "tidyhire-talenthub.firebasestorage.app",
  messagingSenderId: "79545023979",
  appId: "1:79545023979:web:2114dda9c05fd815cfadae"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db }; 