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
  "createdAt"       DATE
);

CREATE TABLE comments (
  id           SERIAL PRIMARY KEY,
  "postId"     INT NOT NULL,
  "userId"     INT,
  author       VARCHAR(120),
  "authorYear" VARCHAR(40),
  text         TEXT NOT NULL,
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

-- ---- Seed data (matches the original in-memory mock content) ------------

INSERT INTO users (id, name, email, password, "yearLevel", diploma, role, "createdAt") VALUES
  (1, 'Alex Tan',      'alex@rp.edu.sg',  'password123', 'Year 2', 'Diploma in Information Technology', 'user',  '2026-01-05'),
  (2, 'Priya Nair',    'priya@rp.edu.sg', 'password123', 'Year 3', 'Diploma in Information Technology', 'user',  '2026-01-06'),
  (3, 'Admin Officer', 'admin@rp.edu.sg', 'admin123',    'Year 3', 'Diploma in Information Technology', 'admin', '2026-01-02');

INSERT INTO posts (id, "userId", author, "authorYear", title, category, content, "suggestedAction", status, upvotes, "createdAt") VALUES
  (1, 2, 'Priya Nair', 'Year 3', 'How I recovered after failing my first internship interview', 'Internship rejection',
   'I failed my first interview because my GitHub was almost empty. I started building one small project every week and writing a short README for each. Three months later my portfolio looked completely different and I got an offer.',
   'Build one small project every week and update my portfolio', 'approved', 42, '2026-02-10'),
  (2, 2, 'Priya Nair', 'Year 3', 'A simple exam prep routine that actually works', 'Exam preparation',
   'Instead of cramming, I studied one topic per day and did a 20-minute recap of the previous day first. Spaced repetition made a huge difference for my grades.',
   'Study one topic daily and recap yesterday''s topic for 20 minutes', 'approved', 35, '2026-02-14'),
  (3, 1, 'Alex Tan', 'Year 2', 'Beating procrastination with the 2-minute rule', 'Time management',
   'Whenever a task felt too big, I told myself to just do 2 minutes of it. Starting is the hardest part, and most times I kept going well past the 2 minutes.',
   'Start every hard task with just 2 focused minutes', 'approved', 28, '2026-02-18'),
  (4, 1, 'Alex Tan', 'Year 2', 'How I finally kept a consistent coding practice', 'Programming practice',
   'I committed to solving one easy algorithm problem every weekday morning before class. Keeping it small and daily made it stick.',
   'Solve one easy coding problem every weekday morning', 'approved', 19, '2026-02-20'),
  (5, 1, 'Alex Tan', 'Year 2', 'My scholarship application checklist', 'Scholarship application',
   'Here is the checklist I used: strong personal statement, two recommendation letters, a clear CCA record, and proof of community work. Start at least a month early.',
   'Prepare scholarship documents one month before the deadline', 'pending', 0, '2026-02-24'),
  (6, 2, 'Priya Nair', 'Year 3', 'Working well in project teams', 'Project teamwork',
   'We used a shared task board and a 10-minute daily check-in. Everyone knew what to do and nothing was forgotten at the last minute.',
   'Run a 10-minute daily team check-in during projects', 'pending', 0, '2026-02-25');

INSERT INTO comments (id, "postId", "userId", author, "authorYear", text, "createdAt") VALUES
  (1, 1, 1, 'Alex Tan',      'Year 2', 'This motivated me to finally start committing daily. Thank you!',  '2026-02-11'),
  (2, 1, 3, 'Admin Officer', 'Year 3', 'Great, honest advice. Portfolios matter a lot for interviews.',    '2026-02-12'),
  (3, 2, 1, 'Alex Tan',      'Year 2', 'The recap-first idea is genius. Trying it this week.',              '2026-02-15');

INSERT INTO habits (id, "userId", "sourcePostId", name, frequency, status, progress, "createdAt") VALUES
  (1, 1, 3,    'Start hard tasks with 2 focused minutes', 'Daily',    'active',    60, '2026-02-19'),
  (2, 1, 4,    'Solve one coding problem each weekday',    'Weekdays', 'active',    40, '2026-02-21'),
  (3, 1, NULL, 'Read 10 pages of a textbook',             'Daily',    'paused',    25, '2026-02-22'),
  (4, 1, 2,    'Recap yesterday''s topic for 20 minutes', 'Daily',    'completed', 100, '2026-02-16');

INSERT INTO calendar_tasks (id, "userId", "habitId", title, date, time, completed) VALUES
  (1, 1, 2,    'Solve one coding problem',       '2026-07-01', '08:00', FALSE),
  (2, 1, 1,    '2-minute start on assignment',   '2026-07-01', '14:00', TRUE),
  (3, 1, NULL, 'Build one small project (weekly)', '2026-07-03', '19:00', FALSE),
  (4, 1, 4,    'Recap yesterday''s topic',       '2026-07-02', '20:00', FALSE),
  (5, 1, 2,    'Solve one coding problem',       '2026-07-04', '08:00', FALSE);

INSERT INTO admin_requests (id, "userId", name, reason, status, "reviewedBy", "reviewedAt") VALUES
  (1, 2, 'Priya Nair', 'I help moderate the study-habits category and would like moderator access.', 'pending', NULL, NULL);

INSERT INTO reports (id, "postId", "reportedBy", reason, status) VALUES
  (1, 4, 'Priya Nair', 'Possible duplicate of another coding-practice post.', 'open');

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
