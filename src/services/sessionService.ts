import { db } from '../firebase';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { TemplateId, SessionDoc } from '../types';

export async function initSessionDoc(uid: string, sessionId: string, templateId: TemplateId): Promise<SessionDoc> {
  const initialData: SessionDoc = {
    sessionId,
    turnCount: 0,
    templateId,
    startedAt: new Date().toISOString(),
  };

  const sessionRef = doc(db, `users/${uid}/sessions/${sessionId}`);
  const snap = await getDoc(sessionRef);

  if (snap.exists()) {
    const d = snap.data();
    return {
      sessionId,
      turnCount: d.turnCount || 0,
      templateId: d.templateId || templateId,
      startedAt: d.startedAt || new Date().toISOString(),
    };
  }

  await setDoc(sessionRef, initialData);
  return initialData;
}

export async function updateSessionTurnCount(uid: string, sessionId: string, turnCount: number): Promise<void> {
  const sessionRef = doc(db, `users/${uid}/sessions/${sessionId}`);
  await updateDoc(sessionRef, { turnCount });
}
