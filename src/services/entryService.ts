import { db } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  query, 
  orderBy, 
  onSnapshot,
  Timestamp,
  deleteDoc
} from 'firebase/firestore';
import { JournalEntry, EntryType } from '../types';

/**
 * Strips all undefined properties from an object recursively
 */
function cleanPayload<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) {
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key]) && !(obj[key] instanceof Date) && !(obj[key] instanceof Timestamp)) {
        result[key] = cleanPayload(obj[key]);
      } else {
        result[key] = obj[key];
      }
    }
  }
  return result;
}

/**
 * Creates and persists a journal entry in users/{uid}/entries/{entryId}
 */
export async function createJournalEntry(
  uid: string, 
  data: { 
    content: string; 
    type: EntryType; 
    sourceSessionId: string;
    title?: string;
  }
): Promise<JournalEntry> {
  const entryData = cleanPayload({
    content: data.content,
    type: data.type,
    sourceSessionId: data.sourceSessionId,
    title: data.title || '',
    createdAt: Timestamp.now(),
  });

  const entriesCol = collection(db, `users/${uid}/entries`);
  const newEntryRef = doc(entriesCol);
  await setDoc(newEntryRef, entryData);
  return {
    id: newEntryRef.id,
    ...entryData,
  };
}

/**
 * Subscribes to the user's journal entries sorted newest first.
 */
export function subscribeJournalEntries(
  uid: string, 
  callback: (entries: JournalEntry[]) => void
) {
  const entriesCol = collection(db, `users/${uid}/entries`);
  const q = query(entriesCol, orderBy('createdAt', 'desc'));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const entries: JournalEntry[] = snapshot.docs.map((docSnap) => {
      const d = docSnap.data();
      return {
        id: docSnap.id,
        content: d.content || '',
        type: d.type || 'journal',
        sourceSessionId: d.sourceSessionId || '',
        title: d.title || '',
        createdAt: d.createdAt || Timestamp.now(),
      };
    });
    callback(entries);
  }, (err) => {
    console.error('Failed to load journal entries from Firestore:', err);
    callback([]);
  });

  return () => {
    unsubscribe();
  };
}

/**
 * Deletes a journal entry from Firestore
 */
export async function deleteJournalEntry(uid: string, entryId: string): Promise<void> {
  const entryRef = doc(db, `users/${uid}/entries/${entryId}`);
  await deleteDoc(entryRef);
}

