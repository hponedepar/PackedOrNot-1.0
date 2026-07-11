# NextStep — Team Handoff (CA2, 5-day sprint)

The **UI for every feature is already built and clickable** (with demo data).
Each member picks a feature, implements its backend, and deletes the demo
fallback. The frontend calls are already written in `frontend/lib/api.js`,
so when your endpoints return the right shape, the page starts working
automatically and the amber "Demo data" banner disappears.

**How to run:** `npm run dev` from the repo root (MySQL must be running;
`cd backend && npm run db:init` re-seeds the database).

---

## Feature ownership

| # | Member | Feature | Frontend (done ✅ / to polish) | Backend (YOU build) |
|---|--------|---------|-------------------------------|----------------------|
| 1 | ______ | **Study Plans** | `app/plans/page.js` ✅ | `/api/plans` CRUD + lessons (tables: `study_plans`, `lessons`) |
| 2 | ______ | **Forum + Add-to-Tracker** | `app/forum/page.js` ✅ (customise modal done, already wired) | Already works — extend with: edit/delete own post, comment moderation status |
| 3 | ______ | **Calendar + Dashboard** | `app/calendar/page.js`, `app/dashboard/page.js` ✅ | Extend dashboard stats to include plans + focus minutes (JOINs) |
| 4 | ______ | **Focus Timer** | `app/timer/page.js` ✅ (timer logic works) | `/api/focus-sessions` (table: `focus_sessions`) + bump linked habit's progress on session insert |
| 5 | ______ | **AI Study Help (n8n + NetAcad)** | `app/help/page.js` ✅ | `POST /api/help/recommend` → call n8n webhook → cache in `recommendations` table (cache = demo fallback!) |
| 6 | ______ | **Admin + Real Auth** | `app/admin/page.js` ✅ | bcrypt password hashing + JWT middleware on admin routes; comment approve/reject |

Rule from the lecturer: everyone explains their own code — request flow is
`page.js → lib/api.js → route → controller → repository → SQL`.

---

## API contracts (what your endpoint must return)

All response shapes match the demo data at the top of each page file — open
your page's file and copy the `DEMO_*` constant as your reference.

### 1. Study Plans (`backend/routes/plans.routes.js` — new)
- `GET /api/plans?userId=1` → `[{ id, name, module, lessons: [{ id, title, completed }] }]`
- `POST /api/plans` body `{ userId, name, module }` → created plan (with empty `lessons: []`)
- `POST /api/plans/:id/lessons` body `{ title }` → created lesson
- `PUT /api/plans/:planId/lessons/:lessonId` body `{ completed }` → updated lesson
- `DELETE /api/plans/:id`

### 4. Focus Sessions (`backend/routes/focus.routes.js` — new)
- `GET /api/focus-sessions?userId=1` → `[{ id, habitId, habitName, minutes, date }]` (newest first)
- `POST /api/focus-sessions` body `{ userId, habitId|null, habitName, minutes, date }`
  → also `UPDATE habits SET progress = LEAST(progress + 10, 100) WHERE id = habitId`

### 5. AI Help (`backend/routes/help.routes.js` — new)
- `POST /api/help/recommend` body `{ query }` →
  `[{ id, module, provider, match, url, reason, topics: [] }]`
- Flow: Express → n8n webhook (env var `N8N_WEBHOOK_URL`) → AI ranks NetAcad
  modules → store in `recommendations` → return. On n8n failure, return the
  cached rows for similar queries. **Never let the demo depend on n8n being up.**

### Suggested schema additions (add to `backend/db/schema.sql`)

```sql
CREATE TABLE study_plans (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  userId    INT NOT NULL,
  name      VARCHAR(160) NOT NULL,
  module    VARCHAR(160),
  createdAt DATE
);

CREATE TABLE lessons (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  planId    INT NOT NULL,
  title     VARCHAR(255) NOT NULL,
  completed TINYINT(1) NOT NULL DEFAULT 0
);

CREATE TABLE focus_sessions (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  userId    INT NOT NULL,
  habitId   INT NULL,
  habitName VARCHAR(255),
  minutes   INT NOT NULL,
  date      DATE NOT NULL
);

CREATE TABLE recommendations (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  query    VARCHAR(255) NOT NULL,
  module   VARCHAR(255) NOT NULL,
  provider VARCHAR(160),
  matchPct INT,
  url      VARCHAR(500),
  reason   TEXT,
  topics   VARCHAR(500)  -- comma-separated is fine for the prototype
);
```

Copy an existing feature as your template: `routes/habits.routes.js` →
`controllers/habits.controller.js` → `repositories/habits.repo.js` is the
cleanest example of the full pattern.

---

## 5-day plan

| Day | Goal |
|-----|------|
| 1 | Everyone picks a feature; add the schema above to `schema.sql` + seed rows; run `npm run db:init`; each member creates `feature/<name>` branch |
| 2–3 | Build your backend (route + controller + repo). Test with the UI — the amber banner disappearing = your feature works. Add 1 test per feature in `backend/tests/api.test.js` |
| 4 | Merge everything to `main`, integration test the full flow (advice → tracker → timer → dashboard), fix bugs, richer seed data so no page looks empty |
| 5 | Slides (App Idea/USP → 1 slide per feature **with screenshot + your name** → contribution table) + rehearse: each person demos their feature and explains the request flow behind one button click |

### Presentation tip (from the lecturer)
Don't say *"clicking this adds a habit"*. Say: *"When I click Add to My
Tracker, the frontend POSTs to `/api/habits`; the controller validates the
body, the repository INSERTs a row with `sourcePostId` linking back to the
post, and the tracker page re-fetches — that's why the habit shows a
'from advice' badge."*
