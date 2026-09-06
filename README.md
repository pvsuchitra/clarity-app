# Clarity — A Quiet Space to Think

A personal journaling and habit-coaching web app built with Google AI
Studio, Firebase, and the Gemini API, as part of the Accelerate AI with
Cloud Run challenge.

Clarity gives users two guided, scope-locked conversation paths — habit
coaching and journal reflection — plus periodic retrospectives that
synthesize past entries into a reflective summary. Every architectural
decision here traces back to a security-first "constitution" written
before any code was generated (see [Security & Threat Model](#security--threat-model)
below).

---

## Features

### Core (base challenge requirements)
- **Google Sign-In authentication** via Firebase Auth, no password
  handling in application code.
- **Multi-turn AI conversation** with Gemini, via a custom Express
  backend (`server.ts`) that holds five fixed, version-controlled prompt
  templates and validates every request's `templateId` against that
  fixed set — no client-supplied instruction text ever reaches Gemini.
  Templates: `habit-tracking`, `journal-reflection`, `intake-router`,
  `session-summarizer`, `retrospective-summary`.
- **Owner-isolated Firestore storage**, every document scoped to
  `users/{uid}`, enforced at the rules layer, not just in application
  code, verified with an automated test suite (see [Testing](#testing)).
- **Secret Manager–backed Gemini key**, retrieved server-side at
  runtime on Cloud Run, never present in client code or committed
  configuration files.

### Enhancements beyond the base spec (Phase 3)
- **Server-side template-only enforcement with mandatory human-confirmed
  routing.** A freeform "Drop a thought here" entry point is classified
  by a narrowly-scoped `intake-router` template (classification only,
  nothing else), but the app never auto-routes silently — the user is
  always shown a confirm-or-switch step before a session opens. Combined
  with per-feature template locking, this closes the "becomes a general
  chatbot" failure mode structurally, not just through prompt wording.
- **Retrospective synthesis.** A `retrospective-summary` template reads
  back a user's own saved entries over a selected period (week / month /
  year) and produces a reflective summary, explicitly instructed to treat
  retrieved entries as inert data, never as instructions (mitigating
  indirect prompt injection via the user's own stored content). Users can
  continue a retrospective's closing thought directly into a new live
  session.
- **Concurrency-safe daily rate limiting.** Save count, Gemini call
  count, and retrospective count are all enforced via a single Firestore
  `runTransaction`, verified with dedicated race-condition tests proving
  concurrent requests cannot jointly exceed the cap.
- **Pre-session cap gating.** Users are warned before starting a
  conversation they won't be able to save, not left to discover the cap
  after investing in a session.
- **Distilled session storage.** Saved entries are AI-generated summaries
  of a conversation, not raw transcript dumps, reducing storage footprint
  and improving readability.
- **Signed admin bypass via Firebase custom claims**, verified in the
  rules test suite, for testing without disabling the cap for real users.
- **Continue from Archive.** Any saved habit or journal entry, and any
  Insight (retrospective), can be reopened as the seed for a brand new
  live session, subject to the same pre-session cap check as every other
  entry point.
- **Confirmed delete**, with a confirmation step, on any saved entry.
  Deleting does not restore the day's used save allowance, closing an
  obvious delete-then-resave loophole around the daily cap.

> **Note on naming:** the "Insight" feature visible in the UI is the
> retrospective synthesis feature described above — internally it uses
> `type: "retrospective"` and the `retrospective-summary` template name.
> The UI label was simplified for users; the underlying schema and
> template names were kept as-is rather than renamed mid-build.

---

## Tech Stack

| Component | Technology | Purpose |
|---|---|---|
| User Identity | Firebase Authentication (Google Sign-In) | Secure sign-in, no password storage |
| Backend Database | Cloud Firestore | User-isolated storage for entries, sessions, usage counters |
| AI Engine | Gemini API via Firebase AI Logic | Server-side templated conversation, classification, and summarization |
| Secrets | Google Cloud Secret Manager | Gemini API key, retrieved server-side only |
| Hosting | Google Cloud Run | Public deployment |

---

## Security & Threat Model

Before any code was generated, a structured threat analysis was performed
across five zones (Input Surfaces, Planning & Reasoning, Tool Execution,
Memory & State, Inter-System Communication), following OWASP Top 10 (Web)
and OWASP Top 10 for LLM Applications.

| Zone | Risk | Countermeasure |
|---|---|---|
| Input Surfaces | Prompt injection, oversized payloads | Strict schema validation, content size caps, HTML-safe rendering |
| Planning & Reasoning | Scope drift, system instruction bypass | Server-side template locking (template-only mode), narrowly-scoped intake router, human-confirmed routing |
| Tool Execution | N/A for this build | No external function/tool calls exposed to the model |
| Memory & State — cross-user leakage | Unauthorized read/write across accounts | Owner-bound Firestore rules (`request.auth.uid == userId`), verified with 20 automated rules tests covering every collection |

**Role-based access control (RBAC):** an admin role is implemented via
signed Firebase custom claims (`isAdmin`), set server-side only via the
Admin SDK, never client-settable. Firestore rules check for this claim
using safe key access (`'isAdmin' in request.auth.token`) to grant a
scoped bypass of daily usage caps for testing, while normal users remain
fully capped. This satisfies the RBAC requirement from the project's
security constitution without weakening enforcement for real users.
| Memory & State — write-skew | Concurrent requests bypassing daily caps | Atomic `runTransaction` increments, verified with dedicated race-condition tests |
| Inter-System Communication | Gemini API key exposure | Key retrieved exclusively via Secret Manager at runtime, never in client code |

### Firestore Security Rules (excerpt)
Full rules live in `firestore.rules`. Core principle: deny by default,
explicit owner-bound access only, field-level validation on every write.

```javascript
match /users/{userId}/entries/{entryId} {
  allow read: if request.auth != null && request.auth.uid == userId;
  allow create: if request.auth != null
    && request.auth.uid == userId
    && request.resource.data.keys().hasAll(['content', 'type', 'sourceSessionId', 'createdAt'])
    && request.resource.data.content is string
    && request.resource.data.content.size() < 5000
    && request.resource.data.type in ['habit', 'journal', 'summary', 'retrospective']
    && request.resource.data.createdAt is timestamp;
  allow update, delete: if request.auth != null && request.auth.uid == userId;
}
```

---

## Testing

- **`firestore.rules.test.js`** — 20 automated tests against the Firebase
  Local Emulator Suite, covering cross-user isolation, field validation,
  and cap enforcement for every collection (`users`, `entries`,
  `usage/counters`, `sessions`).
- **`counter.race.test.js`** — 3 tests proving the daily-cap increment
  logic cannot be bypassed by concurrent requests.

Run locally:
```bash
npm install --save-dev @firebase/rules-unit-testing jest
firebase emulators:exec --only firestore "npx jest --verbose"
```

A full manual walkthrough checklist (authentication, isolation, template
scope-lock, error handling, and deployment verification) is maintained
separately and available on request.

**Live isolation verification:** beyond automated rules tests, the
deployed app was tested end-to-end with multiple real Google accounts
signed in simultaneously from separate devices. Each account's entries,
save counts, and Insights were confirmed fully isolated in the Firebase
Console — no cross-user data was visible in either direction.

---

## Setup & Deployment

### Prerequisites
- Node.js, `firebase-tools`, and the `gcloud` CLI installed.
- A Firebase project with Firestore, Authentication (Google provider),
  and Firebase AI Logic (Gemini Developer API) enabled.

### 1. Environment
```bash
gcloud services enable run.googleapis.com secretmanager.googleapis.com firestore.googleapis.com
```

### 2. Secret Manager
```bash
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 3. Firestore rules
Deploy `firestore.rules` via the Firebase Console (Firestore Database →
Rules → paste → Publish) or:
```bash
firebase deploy --only firestore:rules
```

### 4. Deploy to Cloud Run

**Primary path (used for this submission):** Google AI Studio's built-in
**Publish** button handles building, pushing, and deploying to Cloud Run
directly, including provisioning the service. Click Publish, follow the
prompts to choose a unique App URL, and the live Cloud Run service is
created automatically.

**Manual alternative (for reproducing outside AI Studio):**
```bash
gcloud run deploy clarity-journal-app \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --update-secrets=GEMINI_API_KEY=GEMINI_API_KEY:latest
```

### 5. Post-deploy
Add the deployed App URL to Firebase Console → Authentication →
Settings → Authorized domains, or sign-in will fail on the live site.

### 6. Campaign verification label
Via AI Studio: open **Advanced settings** on the published app to find
the underlying Cloud Run service name, then in Cloud Console → Cloud Run
→ Services, select it → **Labels** → add key `dev-tutorial`, value
`cloud-run-ai-challenge` → Save.

Or via CLI:
```bash
gcloud run services update clarity-journal-app \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## Known Limitations (documented, not hidden)

- **Client-computed date for daily reset.** `todayStr` is currently
  computed in the browser rather than server-side, meaning a technically
  sophisticated user could manipulate their local clock to reset their
  daily cap early. Bounded impact (a handful of extra actions per day at
  most), accepted for this build. **Planned hardening:** move this
  computation into a Cloud Function so the date is derived server-side
  and cannot be client-influenced.
- **Session turn-cap relies on client-supplied count.** The 20-turn
  session limit in `/api/chat` currently trusts a client-provided
  `sessionTurnCount` rather than verifying against the server-stored
  session document. Bounded impact (unusually long conversations are
  possible, but the independently-enforced daily save and Gemini-call
  caps still hold regardless). **Planned hardening:** validate turn count
  against `users/{uid}/sessions/{sessionId}` server-side rather than
  trusting the request body.
- **Crash/error logging is not yet implemented.** Errors currently
  surface only in-browser. **Planned upgrade:** a dedicated `errorLogs`
  collection capturing error messages and stack traces (explicitly
  excluding any user-authored content) for developer review, gated by
  admin-only read access.
- Race-condition tests approximate concurrency from a single Node
  process; sufficient to prove transaction logic correctness, not a full
  substitute for production load testing.

---

## License

MIT License — see [LICENSE](./LICENSE) for details.

© 2026 Clarity.
