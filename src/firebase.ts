import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  orderBy, 
  getDocs,
  onSnapshot,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyBgzmy2LRp0LdxQtV62N-L5xkLZszajs40",
  authDomain: "clarity-journal-app-1.firebaseapp.com",
  projectId: "clarity-journal-app-1",
  storageBucket: "clarity-journal-app-1.firebasestorage.app",
  messagingSenderId: "320426146926",
  appId: "1:320426146926:web:5f256df452f5389747ba7f"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app, "clarity-login");
export const googleProvider = new GoogleAuthProvider();

// Custom adapter to ensure counterService.js can call db.doc(...) and db.runTransaction(...)
export const dbCompatAdapter = {
  doc: (pathStr: string) => doc(db, pathStr),
  runTransaction: (fn: (transaction: any) => Promise<any>) => runTransaction(db, fn)
};

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Sync profile document to users/{uid}
    const userDocRef = doc(db, `users/${user.uid}`);
    await setDoc(userDocRef, {
      uid: user.uid,
      displayName: user.displayName || 'Anonymous Journaler',
      email: user.email || '',
      photoURL: user.photoURL || '',
      lastLogin: new Date().toISOString()
    }, { merge: true });
    
    return user;
  } catch (error: any) {
    console.error('Sign-in error:', error);
    throw error;
  }
}

export async function logoutUser() {
  await firebaseSignOut(auth);
}

export { 
  onAuthStateChanged, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  onSnapshot, 
  serverTimestamp 
};
export type { User };
