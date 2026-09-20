import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBgpW5_Pg5n_wIuKtuZio8EmDqJK7kfSKg",
  authDomain: "spese-comuni-01.firebaseapp.com",
  projectId: "spese-comuni-01",
  storageBucket: "spese-comuni-01.firebasestorage.app",
  messagingSenderId: "1017418738476",
  appId: "1:1017418738476:web:fe9738e1cf112c3f30da89"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);
