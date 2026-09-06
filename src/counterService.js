/**
 * Atomically increments a usage counter field, enforcing a cap inside the
 * same transaction that reads the current value. This must be the only
 * code path that writes dailySaveCount or dailyGeminiCallCount.
 *
 * @param {firebase.firestore.Firestore} db
 * @param {string} uid
 * @param {'dailySaveCount' | 'dailyGeminiCallCount' | 'dailyRetrospectiveCount'} field
 * @param {number} cap
 * @param {string} todayStr - YYYY-MM-DD
 * @param {boolean} [isAdmin=false]
 * @returns {Promise<number>} the new count after increment
 * @throws {Error} 'CAP_REACHED' if the field is already at cap and not admin
 */
async function incrementCounter(db, uid, field, cap, todayStr, isAdmin = false) {
  const counterRef = db.doc(`users/${uid}/usage/counters`);

  return await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(counterRef);
    const exists = typeof snap.exists === 'function' ? snap.exists() : snap.exists;
    const data = exists
      ? snap.data()
      : { dailySaveCount: 0, dailyGeminiCallCount: 0, dailyRetrospectiveCount: 0, lastResetDate: todayStr };

    // Reset counters if it's a new day, still inside the same transaction
    const isToday = data.lastResetDate === todayStr;
    const current = isToday
      ? data[field] || 0
      : 0;

    if (!isAdmin && current >= cap) {
      throw new Error('CAP_REACHED');
    }

    const next = current + 1;
    const updated = {
      dailySaveCount: field === 'dailySaveCount' ? next : (isToday ? (data.dailySaveCount || 0) : 0),
      dailyGeminiCallCount: field === 'dailyGeminiCallCount' ? next : (isToday ? (data.dailyGeminiCallCount || 0) : 0),
      dailyRetrospectiveCount: field === 'dailyRetrospectiveCount' ? next : (isToday ? (data.dailyRetrospectiveCount || 0) : 0),
      lastResetDate: todayStr,
    };

    if (exists) {
      transaction.update(counterRef, updated);
    } else {
      transaction.set(counterRef, updated);
    }

    return next;
  });
}

export { incrementCounter };
