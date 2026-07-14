-- NextStep database schema + seed data (PostgreSQL, hosted on Supabase).
-- Run with:  npm run db:init   (from the backend folder)
--
-- Re-running is safe: it drops and recreates the tables with fresh seed data,
-- which mirrors the old "restarting the server resets the demo data" behaviour.
--
-- NOTE: column names are camelCase to match the JSON the API already sends.
-- Postgres folds unquoted names to lowercase, so camelCase columns are
-- double-quoted everywhere ("yearLevel", "createdAt", ...).

-- CASCADE so it works even if a teammate created these tables with real
-- foreign-key constraints; we recreate everything from scratch anyway.
DROP TABLE IF EXISTS recommendations CASCADE;
DROP TABLE IF EXISTS netacad_courses CASCADE;
DROP TABLE IF EXISTS focus_sessions CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS study_plans CASCADE;
DROP TABLE IF EXISTS calendar_tasks CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS habits CASCADE;
DROP TABLE IF EXISTS admin_requests CASCADE;
DROP TABLE IF EXISTS post_upvotes CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ---- Tables -------------------------------------------------------------

CREATE TABLE users (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  email       VARCHAR(190) NOT NULL UNIQUE,
  password    VARCHAR(190) NOT NULL,   -- plain text for the prototype; hash with bcrypt later
  "yearLevel" VARCHAR(40),
  diploma     VARCHAR(160),
  role        VARCHAR(20) NOT NULL DEFAULT 'user',      -- 'user' | 'admin'
  "isBanned"  BOOLEAN NOT NULL DEFAULT FALSE,           -- admin can ban/unban users
  "createdAt" DATE
);

CREATE TABLE posts (
  id                SERIAL PRIMARY KEY,
  "userId"          INT,
  author            VARCHAR(120),
  "authorYear"      VARCHAR(40),
  title             VARCHAR(255) NOT NULL,
  category          VARCHAR(80),
  content           TEXT NOT NULL,
  "suggestedAction" VARCHAR(255),
  status            VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'approved' | 'pending' | 'rejected'
  upvotes           INT NOT NULL DEFAULT 0,
  downvotes         INT NOT NULL DEFAULT 0,   -- 👎 on the question (Andrea Ho)
  "createdAt"       DATE
);

CREATE TABLE comments (
  id           SERIAL PRIMARY KEY,
  "postId"     INT NOT NULL,
  "userId"     INT,
  author       VARCHAR(120),
  "authorYear" VARCHAR(40),
  text         TEXT NOT NULL,
  likes        INT NOT NULL DEFAULT 0,   -- 👍 on a piece of advice
  dislikes     INT NOT NULL DEFAULT 0,   -- 👎 on a piece of advice
  "createdAt"  DATE
);

-- One row per user per post; columns intentionally unquoted (they fold to
-- lowercase) to match the queries in posts.repo.js toggleUpvote().
CREATE TABLE post_upvotes (
  id        SERIAL PRIMARY KEY,
  postId    INT NOT NULL,
  userId    INT NOT NULL,
  createdAt DATE DEFAULT CURRENT_DATE,
  UNIQUE (postId, userId)
);

CREATE TABLE habits (
  id             SERIAL PRIMARY KEY,
  "userId"       INT,
  "sourcePostId" INT NULL,
  name           VARCHAR(255) NOT NULL,
  frequency      VARCHAR(40),
  status         VARCHAR(20) NOT NULL DEFAULT 'active',  -- 'active' | 'completed' | 'paused'
  progress       INT NOT NULL DEFAULT 0,
  "createdAt"    DATE
);

CREATE TABLE calendar_tasks (
  id        SERIAL PRIMARY KEY,
  "userId"  INT,
  "habitId" INT NULL,
  "planId"  INT NULL,   -- set when the task was scheduled from a Study Plan (WK)
  title     VARCHAR(255) NOT NULL,
  date      DATE NOT NULL,
  time      VARCHAR(5),
  completed BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE admin_requests (
  id           SERIAL PRIMARY KEY,
  "userId"     INT,
  name         VARCHAR(120),
  reason       VARCHAR(500),
  status       VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
  "reviewedBy" VARCHAR(120) NULL,
  "reviewedAt" DATE NULL
);

CREATE TABLE reports (
  id           SERIAL PRIMARY KEY,
  "postId"     INT,
  "reportedBy" VARCHAR(120),
  reason       VARCHAR(500),
  status       VARCHAR(20) NOT NULL DEFAULT 'open'      -- 'open' | 'resolved'
);

-- Study Help (AI course recommendations). Done by Khaing Khant Zaw.
-- Our own catalogue of Cisco NetAcad courses (NetAcad has no public API,
-- so we keep the course info in our database and link out to the real site).
CREATE TABLE netacad_courses (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(160) NOT NULL,
  provider    VARCHAR(160),
  level       VARCHAR(40),
  format      VARCHAR(80),
  hours       INT,           -- estimated course length
  description VARCHAR(500),
  topics      VARCHAR(300),  -- comma-separated keywords used for matching
  url         VARCHAR(300)
);

-- Cache of past answers, so repeated questions are instant and the demo
-- still works even if the AI / n8n step is offline. Done by Khaing Khant Zaw.
CREATE TABLE recommendations (
  id          SERIAL PRIMARY KEY,
  query       VARCHAR(255) NOT NULL,
  results     TEXT NOT NULL,  -- the JSON answer we sent back
  "createdAt" DATE
);

-- Study Plans: a plan (a module) contains many lessons. Progress on the
-- dashboard = completed lessons / total lessons.
CREATE TABLE study_plans (
  id             SERIAL PRIMARY KEY,
  "userId"       INT NOT NULL,
  name           VARCHAR(160) NOT NULL,
  module         VARCHAR(160),
  frequency      VARCHAR(40),   -- how often to work on it (from the advice modal)
  "sourcePostId" INT NULL,      -- set when the plan was created from a forum post's advice
  "createdAt"    DATE
);

CREATE TABLE lessons (
  id        SERIAL PRIMARY KEY,
  "planId"  INT NOT NULL,
  title     VARCHAR(255) NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE
);

-- Focus Timer: one row per finished focus session. The dashboard's
-- "Focused today" sums minutes where date = today.
CREATE TABLE focus_sessions (
  id          SERIAL PRIMARY KEY,
  "userId"    INT NOT NULL,
  "habitId"   INT NULL,
  "habitName" VARCHAR(255),
  minutes     INT NOT NULL,
  date        DATE NOT NULL
);

-- ---- Seed data (matches the original in-memory mock content) ------------

INSERT INTO users (id, name, email, password, "yearLevel", diploma, role, "createdAt") VALUES
  (1, 'Alex Tan',      'alex@rp.edu.sg',  'password123', 'Year 2', 'Diploma in Information Technology', 'user',  '2026-01-05'),
  (2, 'Priya Nair',    'priya@rp.edu.sg', 'password123', 'Year 3', 'Diploma in Information Technology', 'user',  '2026-01-06'),
  (3, 'Admin Officer', 'admin@rp.edu.sg', 'admin123',    'Year 3', 'Diploma in Information Technology', 'admin', '2026-01-02'),
  -- Year 1 student who asks for help on the forum (Done by Andrea Ho).
  (4, 'Bryan Lee',     'bryan@rp.edu.sg', 'password123', 'Year 1', 'Diploma in Information Technology', 'user',  '2026-01-08');

-- Demo forum threads: a programming question and a stress-management question,
-- each with a senior's reply (Done by Andrea Ho).
INSERT INTO posts (id, "userId", author, "authorYear", title, category, content, "suggestedAction", status, upvotes, downvotes, "createdAt") VALUES
  (1, 4, 'Bryan Lee', 'Year 1', 'Struggling with Programming Fundamentals — any senior advice?', 'Programming practice',
   'Hi I am year 1 student so right now I am having problem with the programming fundamental course mostly right now. Can any seniors suggest any advices or solutions for this?',
   NULL, 'approved', 12, 1, '2026-07-12'),
  (2, 4, 'Bryan Lee', 'Year 1', 'How do you guys manage stress?', 'Study habits',
   'Hi, I am year 1 and I just want to ask for like how you guys manage the stress??',
   NULL, 'approved', 9, 0, '2026-07-14');

INSERT INTO comments (id, "postId", "userId", author, "authorYear", text, likes, dislikes, "createdAt") VALUES
  -- The senior's reply to Bryan's programming question (becomes a study plan in the demo).
  (1, 1, 2, 'Priya Nair', 'Year 3', 'HII!! I just want to say that it is totally normal to struggle because I was in the same boat as you. At my time, I just went through this website called W3 School website. There they have like all these beginner programmes for python. I just practise using that. Hope this helps!.', 15, 0, '2026-07-12'),
  -- The senior's reply to the stress question.
  (2, 2, 2, 'Priya Nair', 'Year 3', 'FOr me meditation works the same for me or doing what you love. For my case is just playing chess.Hope this helps', 11, 0, '2026-07-14');

INSERT INTO habits (id, "userId", "sourcePostId", name, frequency, status, progress, "createdAt") VALUES
  (1, 1, 3,    'Start hard tasks with 2 focused minutes', 'Daily',    'active',    60, '2026-02-19'),
  (2, 1, 4,    'Solve one coding problem each weekday',    'Weekdays', 'active',    40, '2026-02-21'),
  (3, 1, NULL, 'Read 10 pages of a textbook',             'Daily',    'paused',    25, '2026-02-22'),
  (4, 1, 2,    'Recap yesterday''s topic for 20 minutes', 'Daily',    'completed', 100, '2026-02-16');

-- Calendar tasks: some come from habits (orange), some from study plans
-- (purple), some are plain (WK). habitId / planId link them to their source.
INSERT INTO calendar_tasks (id, "userId", "habitId", "planId", title, date, time, completed) VALUES
  (1, 1, 2,    NULL, 'Solve one coding problem',         '2026-07-01', '08:00', FALSE),
  (2, 1, 1,    NULL, '2-minute start on assignment',     '2026-07-01', '14:00', TRUE),
  (3, 1, NULL, NULL, 'Build one small project (weekly)', '2026-07-03', '19:00', FALSE),
  (4, 1, 4,    NULL, 'Recap yesterday''s topic',         '2026-07-02', '20:00', FALSE),
  (5, 1, 2,    NULL, 'Solve one coding problem',         '2026-07-04', '08:00', FALSE),
  (6, 1, NULL, 1,    'Biology revision',                 '2026-07-02', '16:00', FALSE),
  (7, 1, NULL, 2,    'Operating Systems review',         '2026-07-03', '10:00', FALSE);

INSERT INTO admin_requests (id, "userId", name, reason, status, "reviewedBy", "reviewedAt") VALUES
  (1, 2, 'Priya Nair', 'I help moderate the study-habits category and would like moderator access.', 'pending', NULL, NULL);

INSERT INTO reports (id, "postId", "reportedBy", reason, status) VALUES
  (1, 1, 'Alex Tan', 'Flagged for moderator review.', 'open');

-- The NetAcad courses I have taken so far. Done by Khaing Khant Zaw.
INSERT INTO netacad_courses (id, name, provider, level, format, hours, description, topics, url) VALUES
  (1, 'Networking Basics', 'Cisco Networking Academy', 'Beginner', 'Self-paced', 22,
   'Start learning the basics of computer networking and discover how networks work, from your home Wi-Fi to the wider internet.',
   'networking, network, networks, ip address, router, switch, wifi, internet, protocols, lan',
   'https://www.netacad.com/courses/networking-basics'),
  (2, 'Computer Hardware Basics', 'Cisco Networking Academy', 'Beginner', 'Self-paced', 6,
   'Learn the basics of computer hardware and discover the components inside a computer and how they work together.',
   'hardware, computer, components, cpu, ram, memory, storage, motherboard, pc, operating system',
   'https://www.netacad.com/courses/computer-hardware-basics'),
  (3, 'Python Essentials 1', 'Python Institute', 'Beginner', 'Self-paced', 40,
   'Learn fundamental concepts of computer programming and start building coding skills with the Python language.',
   'python, programming, coding, code, variables, loops, functions, algorithms, basics',
   'https://www.netacad.com/courses/python-essentials-1'),
  (4, 'DevNet Associate (C270-005-AY2026S1)', 'Republic Polytechnic', 'Intermediate', 'Instructor-led', 70,
   'Get ready for the DevNet Associate certification and learn software development and automation for modern Cisco networks.',
   'devnet, devops, automation, api, apis, rest, python, networking, software development, cicd',
   'https://www.netacad.com/courses/devnet-associate');

-- Study plans + lessons for Alex (userId 1). Matches the dashboard numbers:
-- 2 plans, 3 of 8 lessons completed.
INSERT INTO study_plans (id, "userId", name, module, "createdAt") VALUES
  (1, 1, 'Biology',           'C205 Biology Fundamentals', '2026-02-15'),
  (2, 1, 'Operating Systems', 'C270 Operating Systems',    '2026-02-18');

INSERT INTO lessons (id, "planId", title, completed) VALUES
  (1, 1, 'Cell structure & organelles', TRUE),
  (2, 1, 'Photosynthesis',              TRUE),
  (3, 1, 'Cellular respiration',        FALSE),
  (4, 1, 'Genetics & heredity',         FALSE),
  (5, 1, 'Ecosystems',                  FALSE),
  (6, 2, 'Processes & threads',         TRUE),
  (7, 2, 'CPU scheduling',              FALSE),
  (8, 2, 'Memory management',           FALSE);

-- Focus sessions for Alex. Two are dated today (CURRENT_DATE) so the
-- dashboard's "Focused today" reads 70 min right after seeding; one is older.
INSERT INTO focus_sessions ("userId", "habitId", "habitName", minutes, date) VALUES
  (1, 2,    'Solve one coding problem each weekday', 25, CURRENT_DATE),
  (1, 4,    'Recap yesterday''s topic for 20 minutes', 45, CURRENT_DATE),
  (1, 2,    'Solve one coding problem each weekday', 25, CURRENT_DATE - 8);

-- Seeding used explicit ids, so move each table's auto-increment sequence
-- past them (otherwise the next INSERT would reuse id 1 and fail).
SELECT setval(pg_get_serial_sequence('users', 'id'),           (SELECT MAX(id) FROM users));
SELECT setval(pg_get_serial_sequence('posts', 'id'),           (SELECT MAX(id) FROM posts));
SELECT setval(pg_get_serial_sequence('comments', 'id'),        (SELECT MAX(id) FROM comments));
SELECT setval(pg_get_serial_sequence('habits', 'id'),          (SELECT MAX(id) FROM habits));
SELECT setval(pg_get_serial_sequence('calendar_tasks', 'id'),  (SELECT MAX(id) FROM calendar_tasks));
SELECT setval(pg_get_serial_sequence('admin_requests', 'id'),  (SELECT MAX(id) FROM admin_requests));
SELECT setval(pg_get_serial_sequence('reports', 'id'),         (SELECT MAX(id) FROM reports));
SELECT setval(pg_get_serial_sequence('netacad_courses', 'id'), (SELECT MAX(id) FROM netacad_courses));
SELECT setval(pg_get_serial_sequence('study_plans', 'id'),     (SELECT MAX(id) FROM study_plans));
SELECT setval(pg_get_serial_sequence('lessons', 'id'),         (SELECT MAX(id) FROM lessons));
