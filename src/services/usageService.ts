import { db, dbCompatAdapter, auth } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { incrementCounter } from '../counterService.js';
import { UserUsage } from '../types';

export const DAILY_SAVE_CAP = 5;
export const DAILY_GEMINI_CAP = 60;
export const DAILY_RETROSPECTIVE_CAP = 1;
export const SESSION_TURN_CAP = 20;

export function getTodayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Subscribes to real-time updates for a user's daily usage counters.
 */
export function subscribeUserUsage(uid: string, callback: (usage: UserUsage) => void) {
  const counterRef = doc(db, `users/${uid}/usage/counters`);
  const todayStr = getTodayDateStr();

  return onSnapshot(counterRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      if (data.lastResetDate === todayStr) {
        callback({
          dailySaveCount: data.dailySaveCount || 0,
          dailyGeminiCallCount: data.dailyGeminiCallCount || 0,
          dailyRetrospectiveCount: data.dailyRetrospectiveCount || 0,
          lastResetDate: todayStr,
        });
      } else {
        callback({
          dailySaveCount: 0,
          dailyGeminiCallCount: 0,
          dailyRetrospectiveCount: 0,
          lastResetDate: todayStr,
        });
      }
    } else {
      callback({
        dailySaveCount: 0,
        dailyGeminiCallCount: 0,
        dailyRetrospectiveCount: 0,
        lastResetDate: todayStr,
      });
    }
  }, (err) => {
    console.error('Failed to load usage counters from Firestore:', err);
    callback({
      dailySaveCount: 0,
      dailyGeminiCallCount: 0,
      dailyRetrospectiveCount: 0,
      lastResetDate: todayStr,
    });
  });
}

async function resolveAdmin(isAdmin?: boolean): Promise<boolean> {
  if (isAdmin !== undefined) return isAdmin;
  try {
    if (auth.currentUser) {
      const tokenRes = await auth.currentUser.getIdTokenResult();
      return tokenRes.claims.isAdmin === true;
    }
  } catch (e) {
    // ignore
  }
  return false;
}

/**
 * Attempts to increment the daily save counter atomically via counterService.js.
 * Throws 'CAP_REACHED' if already at cap and not admin.
 */
export async function incrementDailySave(uid: string, isAdmin?: boolean): Promise<number> {
  const adminVal = await resolveAdmin(isAdmin);
  const todayStr = getTodayDateStr();
  return incrementCounter(dbCompatAdapter, uid, 'dailySaveCount', DAILY_SAVE_CAP, todayStr, adminVal);
}

/**
 * Attempts to increment the daily Gemini call counter atomically via counterService.js.
 * Throws 'CAP_REACHED' if already at cap and not admin.
 */
export async function incrementDailyGeminiCall(uid: string, isAdmin?: boolean): Promise<number> {
  const adminVal = await resolveAdmin(isAdmin);
  const todayStr = getTodayDateStr();
  return incrementCounter(dbCompatAdapter, uid, 'dailyGeminiCallCount', DAILY_GEMINI_CAP, todayStr, adminVal);
}

/**
 * Attempts to increment the daily retrospective counter atomically via counterService.js.
 * Throws 'CAP_REACHED' if already at cap and not admin.
 */
export async function incrementDailyRetrospective(uid: string, isAdmin?: boolean): Promise<number> {
  const adminVal = await resolveAdmin(isAdmin);
  const todayStr = getTodayDateStr();
  return incrementCounter(dbCompatAdapter, uid, 'dailyRetrospectiveCount', DAILY_RETROSPECTIVE_CAP, todayStr, adminVal);
}
