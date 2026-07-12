-- NextStep database schema + seed data (MySQL 8).
-- Run with:  npm run db:init   (from the backend folder)
--
-- Re-running is safe: it drops and recreates the tables with fresh seed data,
-- which mirrors the old "restarting the server resets the demo data" behaviour.

CREATE DATABASE IF NOT EXISTS nextstep
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE nextstep;

-- Drop in an order that respects the (logical) foreign keys.
DROP TABLE IF EXISTS focus_sessions;
DROP TABLE IF EXISTS calendar_tasks;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS habits;
DROP TABLE IF EXISTS admin_requests;
DROP TABLE IF EXISTS post_upvotes;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS users;

-- ---- Tables -------------------------------------------------------------
-- Column names are kept in camelCase to match the JSON the API already sends,
-- so `SELECT *` returns rows the frontend understands without any remapping.

CREATE TABLE users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(120) NOT NULL,
  email      VARCHAR(190) NOT NULL UNIQUE,
  password   VARCHAR(190) NOT NULL,   -- plain text for the prototype; hash with bcrypt later
  yearLevel  VARCHAR(40),
  diploma    VARCHAR(160),
  role       ENUM('user','admin') NOT NULL DEFAULT 'user',
  createdAt  DATE
);

CREATE TABLE posts (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  userId          INT,
  author          VARCHAR(120),
  authorYear      VARCHAR(40),
  title           VARCHAR(255) NOT NULL,
  category        VARCHAR(80),
  content         TEXT NOT NULL,
  suggestedAction VARCHAR(255),
  status          ENUM('approved','pending','rejected') NOT NULL DEFAULT 'pending',
  upvotes         INT NOT NULL DEFAULT 0,
  createdAt       DATE
);

CREATE TABLE comments (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  postId     INT NOT NULL,
  userId     INT,
  author     VARCHAR(120),
  authorYear VARCHAR(40),
  `text`     TEXT NOT NULL,
  createdAt  DATE
);

CREATE TABLE post_upvotes (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  postId    INT NOT NULL,
  userId    INT NOT NULL,
  createdAt DATE DEFAULT (CURRENT_DATE)
);

CREATE TABLE habits (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  userId       INT,
  sourcePostId INT NULL,
  name         VARCHAR(255) NOT NULL,
  frequency    VARCHAR(40),
  status       ENUM('active','completed','paused') NOT NULL DEFAULT 'active',
  progress     INT NOT NULL DEFAULT 0,
  createdAt    DATE
);

CREATE TABLE calendar_tasks (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  userId    INT,
  habitId   INT NULL,
  title     VARCHAR(255) NOT NULL,
  date      DATE NOT NULL,
  time      VARCHAR(5),
  completed TINYINT(1) NOT NULL DEFAULT 0
);

CREATE TABLE focus_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  habitId INT NULL,
  habitName VARCHAR(255) NOT NULL,
  minutes INT NOT NULL,
  date DATE NOT NULL
);

CREATE TABLE admin_requests (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  userId     INT,
  name       VARCHAR(120),
  reason     VARCHAR(500),
  status     ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  reviewedBy VARCHAR(120) NULL,
  reviewedAt DATE NULL
);

CREATE TABLE reports (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  postId     INT,
  reportedBy VARCHAR(120),
  reason     VARCHAR(500),
  status     ENUM('open','resolved') NOT NULL DEFAULT 'open'
);

-- ---- Seed data (matches the original in-memory mock content) ------------

INSERT INTO users (id, name, email, password, yearLevel, diploma, role, createdAt) VALUES
  (1, 'Alex Tan',      'alex@rp.edu.sg',  'password123', 'Year 2', 'Diploma in Information Technology', 'user',  '2026-01-05'),
  (2, 'Priya Nair',    'priya@rp.edu.sg', 'password123', 'Year 3', 'Diploma in Information Technology', 'user',  '2026-01-06'),
  (3, 'Admin Officer', 'admin@rp.edu.sg', 'admin123',    'Year 3', 'Diploma in Information Technology', 'admin', '2026-01-02');

INSERT INTO posts (id, userId, author, authorYear, title, category, content, suggestedAction, status, upvotes, createdAt) VALUES
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

INSERT INTO comments (id, postId, userId, author, authorYear, `text`, createdAt) VALUES
  (1, 1, 1, 'Alex Tan',      'Year 2', 'This motivated me to finally start committing daily. Thank you!',  '2026-02-11'),
  (2, 1, 3, 'Admin Officer', 'Year 3', 'Great, honest advice. Portfolios matter a lot for interviews.',    '2026-02-12'),
  (3, 2, 1, 'Alex Tan',      'Year 2', 'The recap-first idea is genius. Trying it this week.',              '2026-02-15');

INSERT INTO habits (id, userId, sourcePostId, name, frequency, status, progress, createdAt) VALUES
  (1, 1, 3,    'Start hard tasks with 2 focused minutes', 'Daily',    'active',    60, '2026-02-19'),
  (2, 1, 4,    'Solve one coding problem each weekday',    'Weekdays', 'active',    40, '2026-02-21'),
  (3, 1, NULL, 'Read 10 pages of a textbook',             'Daily',    'paused',    25, '2026-02-22'),
  (4, 1, 2,    'Recap yesterday''s topic for 20 minutes', 'Daily',    'completed', 100, '2026-02-16');

INSERT INTO calendar_tasks (id, userId, habitId, title, date, time, completed) VALUES
  (1, 1, 2,    'Solve one coding problem',       '2026-07-01', '08:00', 0),
  (2, 1, 1,    '2-minute start on assignment',   '2026-07-01', '14:00', 1),
  (3, 1, NULL, 'Build one small project (weekly)', '2026-07-03', '19:00', 0),
  (4, 1, 4,    'Recap yesterday''s topic',       '2026-07-02', '20:00', 0),
  (5, 1, 2,    'Solve one coding problem',       '2026-07-04', '08:00', 0);

INSERT INTO focus_sessions (id, userId, habitId, habitName, minutes, date) VALUES
(1,1,2,'Solve one coding problem each weekday',25,'2026-07-06'),
(2,1,4,'Recap yesterday''s topic for 20 minutes',45,'2026-07-07'),
(3,1,NULL,'Free focus',30,'2026-07-08');

INSERT INTO admin_requests (id, userId, name, reason, status, reviewedBy, reviewedAt) VALUES
  (1, 2, 'Priya Nair', 'I help moderate the study-habits category and would like moderator access.', 'pending', NULL, NULL);

INSERT INTO reports (id, postId, reportedBy, reason, status) VALUES
  (1, 4, 'Priya Nair', 'Possible duplicate of another coding-practice post.', 'open');
