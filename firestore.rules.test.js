/**
 * Firestore security rules unit tests for Clarity app,
 * covering retrospective entries and dailyRetrospectiveCount cap validation.
 */
const { assertSucceeds, assertFails, initializeTestEnvironment } = require('@firebase/rules-unit-testing');
const fs = require('fs');
const path = require('path');

describe('Clarity Firestore Security Rules', () => {
  let testEnv;

  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'clarity-test-project',
      firestore: {
        rules: fs.readFileSync(path.resolve(__dirname, 'firestore.rules'), 'utf8'),
      },
    });
  });

  after(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    if (testEnv) {
      await testEnv.clearFirestore();
    }
  });

  it('allows authenticated owner to create a retrospective entry', async () => {
    const ctx = testEnv.authenticatedContext('alice');
    const db = ctx.firestore();
    const entryRef = db.doc('users/alice/entries/retro_1');

    await assertSucceeds(
      entryRef.set({
        content: 'Weekly summary of patterns...',
        type: 'retrospective',
        sourceSessionId: 'retro_session_1',
        title: 'Weekly Retrospective',
        createdAt: new Date(),
      })
    );
  });

  it('denies user writing retrospective entry to another user path', async () => {
    const ctx = testEnv.authenticatedContext('alice');
    const db = ctx.firestore();
    const entryRef = db.doc('users/bob/entries/retro_1');

    await assertFails(
      entryRef.set({
        content: 'Stealing data',
        type: 'retrospective',
        sourceSessionId: 'retro_session_1',
        title: 'Steal',
        createdAt: new Date(),
      })
    );
  });

  it('allows counter write when dailyRetrospectiveCount <= 1', async () => {
    const ctx = testEnv.authenticatedContext('alice');
    const db = ctx.firestore();
    const counterRef = db.doc('users/alice/usage/counters');

    await assertSucceeds(
      counterRef.set({
        dailySaveCount: 1,
        dailyGeminiCallCount: 5,
        dailyRetrospectiveCount: 1,
        lastResetDate: '2026-03-06',
      })
    );
  });

  it('denies counter write when dailyRetrospectiveCount exceeds 1', async () => {
    const ctx = testEnv.authenticatedContext('alice');
    const db = ctx.firestore();
    const counterRef = db.doc('users/alice/usage/counters');

    await assertFails(
      counterRef.set({
        dailySaveCount: 0,
        dailyGeminiCallCount: 0,
        dailyRetrospectiveCount: 2,
        lastResetDate: '2026-03-06',
      })
    );
  });
});
