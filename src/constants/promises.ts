export interface ProductPromise {
  id: 'A' | 'B' | 'C' | 'D';
  headline: string;
  subtext: string;
}

export const INTIMATE_PROMISES: ProductPromise[] = [
  {
    id: 'A',
    headline: "What’s on your mind?",
    subtext: "You don’t need to have it figured out. Start wherever you are.",
  },
  {
    id: 'B',
    headline: "Let’s clear a little space.",
    subtext: "Bring the thought you keep circling back to.",
  },
  {
    id: 'C',
    headline: "What are you carrying today?",
    subtext: "Put it here. We’ll sort through it together.",
  },
  {
    id: 'D',
    headline: "Something on your mind?",
    subtext: "You can start messy.",
  },
];

/**
 * Returns the active promise for the current session, or picks a fresh one
 */
export function getSessionPromise(userId?: string): ProductPromise {
  try {
    const sessionKey = userId ? `clarity_promise_sess_${userId}` : 'clarity_promise_sess_guest';
    const stored = sessionStorage.getItem(sessionKey);
    if (stored !== null) {
      const idx = parseInt(stored, 10);
      if (!isNaN(idx) && idx >= 0 && idx < INTIMATE_PROMISES.length) {
        return INTIMATE_PROMISES[idx];
      }
    }
    // If not in session, rotate to next
    return rotateLoginPromise(userId);
  } catch {
    return INTIMATE_PROMISES[0];
  }
}

/**
 * Advances to the next dynamic promise on user login or refresh
 */
export function rotateLoginPromise(userId?: string): ProductPromise {
  try {
    const counterKey = userId ? `clarity_login_count_${userId}` : 'clarity_login_count_guest';
    const sessionKey = userId ? `clarity_promise_sess_${userId}` : 'clarity_promise_sess_guest';
    
    const lastCountStr = localStorage.getItem(counterKey);
    const lastCount = lastCountStr ? parseInt(lastCountStr, 10) : -1;
    const nextIndex = (lastCount + 1) % INTIMATE_PROMISES.length;
    
    localStorage.setItem(counterKey, nextIndex.toString());
    sessionStorage.setItem(sessionKey, nextIndex.toString());
    
    return INTIMATE_PROMISES[nextIndex];
  } catch {
    return INTIMATE_PROMISES[0];
  }
}
