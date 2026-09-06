import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

export function subscribeUserProfile(uid: string, callback: (profile: { hasSeenOnboarding?: boolean }) => void) {
  const userRef = doc(db, `users/${uid}`);
  return onSnapshot(userRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      callback({
        hasSeenOnboarding: data.hasSeenOnboarding ?? false
      });
    } else {
      callback({ hasSeenOnboarding: false });
    }
  }, (err) => {
    console.error('Failed to load user profile:', err);
    callback({ hasSeenOnboarding: false });
  });
}

export async function setHasSeenOnboarding(uid: string) {
  const userRef = doc(db, `users/${uid}`);
  await setDoc(userRef, { hasSeenOnboarding: true }, { merge: true });
}
