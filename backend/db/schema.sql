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
DROP TABLE IF EXISTS sorting_items CASCADE;
DROP TABLE IF EXISTS sorting_sets CASCADE;
DROP TABLE IF EXISTS quiz_questions CASCADE;
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
  -- Which forum the question lives in. The Study and Habit forums are kept
  -- completely separate: every query filters on this. (Khaing Khant Zaw)
  "forumType"       VARCHAR(10) NOT NULL DEFAULT 'study' CHECK ("forumType" IN ('study', 'habit')),
  upvotes           INT NOT NULL DEFAULT 0,
  downvotes         INT NOT NULL DEFAULT 0,   -- 👎 on the question (Andrea Ho)
  "createdAt"       DATE
);

CREATE INDEX posts_forumtype_idx ON posts ("forumType");

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
  name        VARCHAR(160) NOT NULL UNIQUE,
  provider    VARCHAR(160),
  level       VARCHAR(40),
  format      VARCHAR(80),
  hours       INT,           -- estimated course length
  description VARCHAR(500),
  topics      VARCHAR(300),  -- comma-separated keywords used for matching
  url         VARCHAR(300),
  image       VARCHAR(300),  -- optional banner image; NULL = use the CSS thumbnail
  cost        VARCHAR(40) NOT NULL DEFAULT 'Free'
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
  message        TEXT,          -- the student's objective, e.g. "prepare for next week's test"
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

-- Flash Quiz question bank, keyed by `subject`. A subject is matched
-- (case-insensitively) to a student's study-plan names (see `study_plans`
-- above) to decide which topics appear in the game. "correctIndex" is 0..3
-- into ("optionA", "optionB", "optionC", "optionD").
CREATE TABLE quiz_questions (
  id             SERIAL PRIMARY KEY,
  subject        VARCHAR(120) NOT NULL,
  question       VARCHAR(400) NOT NULL,
  "optionA"      VARCHAR(200) NOT NULL,
  "optionB"      VARCHAR(200) NOT NULL,
  "optionC"      VARCHAR(200) NOT NULL,
  "optionD"      VARCHAR(200) NOT NULL,
  "correctIndex" SMALLINT NOT NULL
);
CREATE INDEX idx_quiz_subject ON quiz_questions (subject);

-- Speed Sorting Challenge. A "set" is a collection of terms that each belong to
-- a category; the game asks the player to sort terms into the right category
-- bins against the clock. Built-in sets ("userId" NULL) are seeded per subject
-- and matched to study plans; upload sets are parsed from a student's revision file.
CREATE TABLE sorting_sets (
  id          SERIAL PRIMARY KEY,
  "userId"    INT NULL,
  title       VARCHAR(160) NOT NULL,
  subject     VARCHAR(120) NULL,   -- matched to study plans; NULL = general
  source      VARCHAR(20) NOT NULL DEFAULT 'builtin' CHECK (source IN ('builtin', 'upload')),
  filename    VARCHAR(200) NULL,
  "createdAt" DATE
);

CREATE TABLE sorting_items (
  id       SERIAL PRIMARY KEY,
  "setId"  INT NOT NULL,
  term     VARCHAR(160) NOT NULL,
  category VARCHAR(120) NOT NULL
);
CREATE INDEX idx_sort_set ON sorting_items ("setId");

-- ---- Seed data (matches the original in-memory mock content) ------------

INSERT INTO users (id, name, email, password, "yearLevel", diploma, role, "createdAt") VALUES
  (1, 'Alex Tan',      'alex@rp.edu.sg',  'password123', 'Year 2', 'Diploma in Information Technology', 'user',  '2026-01-05'),
  (2, 'Priya Nair',    'priya@rp.edu.sg', 'password123', 'Year 3', 'Diploma in Information Technology', 'user',  '2026-01-06'),
  (3, 'Admin Officer', 'admin@rp.edu.sg', 'admin123',    'Year 3', 'Diploma in Information Technology', 'admin', '2026-01-02'),
  -- Year 1 student who asks for help on the forum (Done by Andrea Ho).
  (4, 'Bryan Lee',     'bryan@rp.edu.sg', 'password123', 'Year 1', 'Diploma in Information Technology', 'user',  '2026-01-08');

-- Demo forum threads (Done by Andrea Ho). The programming question lives in
-- the Study forum; the stress question lives in the Habit forum — so each tab
-- has real content and you can see the two are kept apart.
INSERT INTO posts (id, "userId", author, "authorYear", title, category, content, "suggestedAction", status, "forumType", upvotes, downvotes, "createdAt") VALUES
  (1, 4, 'Bryan Lee', 'Year 1', 'Struggling with Programming Fundamentals — any senior advice?', 'Programming practice',
   'Hi I am year 1 student so right now I am having problem with the programming fundamental course mostly right now. Can any seniors suggest any advices or solutions for this?',
   NULL, 'approved', 'study', 12, 1, '2026-07-12'),
  (2, 4, 'Bryan Lee', 'Year 1', 'How do you guys manage stress?', 'Mental wellness',
   'Hi, I am year 1 and I just want to ask for like how you guys manage the stress??',
   NULL, 'approved', 'habit', 9, 0, '2026-07-14');

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
-- Rows 8+ are a run of completed daily study tasks (2026-06-25 → 07-12) that
-- gives Alex an 18-day streak on the Progress page. Today (07-13) is left
-- incomplete on purpose, so the "keep your streak alive" nudge shows.
INSERT INTO calendar_tasks (id, "userId", "habitId", "planId", title, date, time, completed) VALUES
  (1, 1, 2,    NULL, 'Solve one coding problem',         '2026-07-01', '08:00', FALSE),
  (2, 1, 1,    NULL, '2-minute start on assignment',     '2026-07-01', '14:00', TRUE),
  (3, 1, NULL, NULL, 'Build one small project (weekly)', '2026-07-03', '19:00', FALSE),
  (4, 1, 4,    NULL, 'Recap yesterday''s topic',         '2026-07-02', '20:00', TRUE),
  (5, 1, 2,    NULL, 'Solve one coding problem',         '2026-07-04', '08:00', TRUE),
  (6, 1, NULL, 1,    'Biology revision',                 '2026-07-02', '16:00', FALSE),
  (7, 1, NULL, 2,    'Operating Systems review',         '2026-07-03', '10:00', TRUE),
  (8,  1, 2,    NULL, 'Solve one coding problem',         '2026-06-25', '08:00', TRUE),
  (9,  1, 4,    NULL, 'Recap yesterday''s topic',         '2026-06-26', '20:00', TRUE),
  (10, 1, 1,    NULL, '2-minute start on assignment',     '2026-06-27', '14:00', TRUE),
  (11, 1, 3,    NULL, 'Read 10 pages of a textbook',      '2026-06-28', '21:00', TRUE),
  (12, 1, 2,    NULL, 'Solve one coding problem',         '2026-06-29', '08:00', TRUE),
  (13, 1, 4,    NULL, 'Recap yesterday''s topic',         '2026-06-30', '20:00', TRUE),
  (14, 1, 2,    NULL, 'Solve one coding problem',         '2026-07-05', '08:00', TRUE),
  (15, 1, 1,    NULL, '2-minute start on assignment',     '2026-07-06', '14:00', TRUE),
  (16, 1, 3,    NULL, 'Read 10 pages of a textbook',      '2026-07-07', '21:00', TRUE),
  (17, 1, 2,    NULL, 'Solve one coding problem',         '2026-07-08', '08:00', TRUE),
  (18, 1, 4,    NULL, 'Recap yesterday''s topic',         '2026-07-09', '20:00', TRUE),
  (19, 1, 2,    NULL, 'Solve one coding problem',         '2026-07-10', '08:00', TRUE),
  (20, 1, 1,    NULL, '2-minute start on assignment',     '2026-07-11', '14:00', TRUE),
  (21, 1, 3,    NULL, 'Read 10 pages of a textbook',      '2026-07-12', '21:00', TRUE),
  (22, 1, 2,    NULL, 'Solve one coding problem',         '2026-07-13', '08:00', FALSE),
  (23, 1, NULL, NULL, 'Recap yesterday''s topic',         '2026-07-15', '20:00', FALSE);

INSERT INTO admin_requests (id, "userId", name, reason, status, "reviewedBy", "reviewedAt") VALUES
  (1, 2, 'Priya Nair', 'I help moderate the study-habits category and would like moderator access.', 'pending', NULL, NULL);

INSERT INTO reports (id, "postId", "reportedBy", reason, status) VALUES
  (1, 1, 'Alex Tan', 'Flagged for moderator review.', 'open'),
  (2, 4, 'Priya Nair', 'Possible duplicate of another coding-practice post.', 'open');

-- The Cisco NetAcad catalogue Study Help searches. Done by Khaing Khant Zaw.
-- `topics` is the keyword list the matcher scores a student's question against,
-- so it deliberately includes the words students actually type ("ip address",
-- "loops", "linux commands") rather than only the official course wording.
INSERT INTO netacad_courses (id, name, provider, level, format, hours, description, topics, url) VALUES
  (1, 'Networking Basics', 'Cisco Networking Academy', 'Beginner', 'Self-paced', 22,
   'Start learning the basics of computer networking and discover how networks work, from your home Wi-Fi to the wider internet.',
   'networking, network, ip, ip address, ip addressing, subnet, subnetting, router, routing, switch, wifi, internet, protocol, lan, ethernet, dns, dhcp',
   'https://www.netacad.com/courses/networking-basics'),
  (2, 'Computer Hardware Basics', 'Cisco Networking Academy', 'Beginner', 'Self-paced', 6,
   'Learn the basics of computer hardware and discover the components inside a computer and how they work together.',
   'hardware, computer, component, cpu, ram, memory, storage, motherboard, pc, peripheral, troubleshooting',
   'https://www.netacad.com/courses/computer-hardware-basics'),
  (3, 'Python Essentials 1', 'Python Institute', 'Beginner', 'Self-paced', 40,
   'Learn fundamental concepts of computer programming and start building coding skills with the Python language.',
   'python, programming, coding, loop, loops, variable, variables, function, functions, condition, conditionals, syntax, list, string, beginner, algorithm',
   'https://www.netacad.com/courses/python-essentials-1'),
  (4, 'DevNet Associate (C270-005-AY2026S1)', 'Republic Polytechnic', 'Intermediate', 'Instructor-led', 70,
   'Get ready for the DevNet Associate certification and learn software development and automation for modern Cisco networks.',
   'devnet, devops, automation, api, apis, rest, python, networking, software development, cicd',
   'https://www.netacad.com/courses/devnet-associate'),
  (5, 'Networking Devices and Initial Configuration', 'Cisco Networking Academy', 'Beginner', 'Self-paced', 24,
   'Configure switches, routers and wireless devices, and take your first steps in building a small network.',
   'networking device, switch, router, wireless, configuration, configure, cli, ios, initial setup, small network, vlan',
   'https://www.netacad.com/courses/networking-devices-and-initial-configuration'),
  (6, 'Introduction to Cybersecurity', 'Cisco Networking Academy', 'Beginner', 'Self-paced', 6,
   'Learn what cybersecurity is, why attacks happen, and how to protect your own data and privacy online.',
   'cybersecurity, cyber, security, privacy, attack, threat, phishing, malware, data protection, online safety',
   'https://www.netacad.com/courses/introduction-to-cybersecurity'),
  (7, 'Cybersecurity Essentials', 'Cisco Networking Academy', 'Intermediate', 'Self-paced', 30,
   'Build core cybersecurity skills: protecting networks and data, cryptography, and defending against threats.',
   'cybersecurity, security, network security, securing, secure, cryptography, encryption, threat, vulnerability, defence, defense, confidentiality',
   'https://www.netacad.com/courses/cybersecurity-essentials'),
  (8, 'Operating Systems Basics', 'Cisco Networking Academy', 'Beginner', 'Self-paced', 6,
   'Understand what an operating system does, how it manages processes and memory, and how to work with files.',
   'operating system, os, windows, process, processes, thread, memory, memory management, scheduling, file system, kernel, boot',
   'https://www.netacad.com/courses/operating-systems-basics'),
  (9, 'Linux Unhatched', 'Cisco Networking Academy', 'Beginner', 'Self-paced', 8,
   'Your very first look at Linux: try basic commands in a live environment and see what Linux is used for.',
   'linux, introduction, first steps, try linux, beginner, unhatched, open source, distribution',
   'https://www.netacad.com/courses/linux-unhatched'),
  (10, 'Linux Essentials', 'Cisco Networking Academy', 'Beginner', 'Self-paced', 70,
   'Learn the Linux command line properly: commands, the shell, files, permissions and basic scripting.',
   'linux, command, commands, command line, terminal, shell, bash, file, files, permission, permissions, scripting, script, directory, sudo, grep',
   'https://www.netacad.com/courses/linux-essentials'),
  (11, 'Python Essentials 2', 'Python Institute', 'Intermediate', 'Self-paced', 40,
   'Go beyond the basics with modules, packages, exceptions, file handling and object-oriented programming.',
   'python, module, modules, package, packages, exception, exceptions, oop, class, classes, object, inheritance, file handling, advanced python',
   'https://www.netacad.com/courses/python-essentials-2'),
  (12, 'JavaScript Essentials 1', 'Cisco Networking Academy', 'Beginner', 'Self-paced', 30,
   'Learn JavaScript from scratch and start making web pages interactive in the browser.',
   'javascript, js, web, website, browser, dom, frontend, variable, function, event, html, interactive',
   'https://www.netacad.com/courses/javascript-essentials-1'),
  (13, 'Data Analytics Essentials', 'Cisco Networking Academy', 'Beginner', 'Self-paced', 30,
   'Learn how to collect, clean, analyse and visualise data so you can turn numbers into decisions.',
   'data analytics, data, analytics, analysis, excel, sql, visualisation, visualization, dashboard, chart, statistics, dataset',
   'https://www.netacad.com/courses/data-analytics-essentials'),
  (14, 'Introduction to Data Science', 'Cisco Networking Academy', 'Beginner', 'Self-paced', 6,
   'Discover what data science is, what data scientists actually do, and how data drives real decisions.',
   'data science, data, machine learning, ai, artificial intelligence, model, prediction, big data, dataset',
   'https://www.netacad.com/courses/introduction-to-data-science'),
  (15, 'Internet of Things', 'Cisco Networking Academy', 'Beginner', 'Self-paced', 20,
   'Explore how everyday devices connect, sense and share data, and how IoT systems are put together.',
   'iot, internet of things, sensor, sensors, device, connected, smart home, embedded, automation, arduino, raspberry pi',
   'https://www.netacad.com/courses/internet-of-things'),
  (16, 'Endpoint Security', 'Cisco Networking Academy', 'Intermediate', 'Self-paced', 27,
   'Secure the devices on a network: antivirus, hardening, access control and endpoint monitoring.',
   'endpoint, endpoint security, antivirus, malware, hardening, access control, device security, patch, firewall, host',
   'https://www.netacad.com/courses/endpoint-security'),
  (17, 'Network Defense', 'Cisco Networking Academy', 'Intermediate', 'Self-paced', 27,
   'Learn to defend a network: monitoring traffic, firewalls, access control lists and responding to attacks.',
   'network defense, network defence, securing, secure, security, network security, firewall, monitoring, acl, intrusion, attack, incident response, protect network',
   'https://www.netacad.com/courses/network-defense'),
  (18, 'Cloud and Virtualization Concepts', 'Cisco Networking Academy', 'Beginner', 'Self-paced', 20,
   'Understand virtual machines, containers and the cloud services modern applications actually run on.',
   'cloud, virtualization, virtualisation, virtual machine, vm, container, docker, aws, azure, hypervisor, saas, server',
   'https://www.netacad.com/courses/cloud-and-virtualization-concepts');

-- Alex's study plans. "Operating Systems" has a matching quiz_questions bank
-- below, so the Flash Quiz / Speed Sort can offer that topic; "Biology" does
-- not yet, so those games fall back to showing every available subject.
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

-- Flash Quiz question bank. Subjects here are matched to study-plan names.
INSERT INTO quiz_questions (subject, question, "optionA", "optionB", "optionC", "optionD", "correctIndex") VALUES
  -- Programming
  ('Programming', 'Which data structure works on a Last-In-First-Out basis?', 'Queue', 'Stack', 'Array', 'Tree', 1),
  ('Programming', 'What does a ''for'' loop primarily provide?', 'Decision making', 'Repetition', 'Data storage', 'Error handling', 1),
  ('Programming', 'What is the time complexity of binary search?', 'O(n)', 'O(n squared)', 'O(log n)', 'O(1)', 2),
  ('Programming', 'Which keyword defines a reusable block of code?', 'loop', 'function', 'class', 'return', 1),
  ('Programming', 'A variable that only exists inside a function is called…', 'Global', 'Static', 'Local', 'Constant', 2),
  ('Programming', 'Which symbol denotes a single-line comment in JavaScript?', '#', '//', '<!--', '**', 1),
  -- Networking
  ('Networking', 'Which layer of the OSI model handles routing?', 'Transport', 'Network', 'Data Link', 'Session', 1),
  ('Networking', 'What does ''IP'' stand for?', 'Internet Protocol', 'Internal Process', 'Instant Packet', 'Input Port', 0),
  ('Networking', 'Which device forwards packets between different networks?', 'Switch', 'Hub', 'Router', 'Repeater', 2),
  ('Networking', 'How many bits are in an IPv4 address?', '16', '32', '64', '128', 1),
  ('Networking', 'Which protocol is connection-oriented and reliable?', 'UDP', 'ICMP', 'TCP', 'ARP', 2),
  ('Networking', 'What port does HTTPS use by default?', '21', '80', '443', '25', 2),
  -- Databases
  ('Databases', 'Which SQL keyword retrieves data from a table?', 'GET', 'SELECT', 'FETCH', 'PULL', 1),
  ('Databases', 'A column that uniquely identifies each row is a…', 'Foreign key', 'Index', 'Primary key', 'View', 2),
  ('Databases', 'Which clause filters rows in a query?', 'ORDER BY', 'GROUP BY', 'WHERE', 'HAVING', 2),
  ('Databases', 'What does normalization mainly reduce?', 'Speed', 'Redundancy', 'Security', 'Storage cost only', 1),
  ('Databases', 'Which JOIN returns only matching rows in both tables?', 'LEFT JOIN', 'INNER JOIN', 'FULL JOIN', 'CROSS JOIN', 1),
  -- Operating Systems
  ('Operating Systems', 'Which component decides which process uses the CPU next?', 'Compiler', 'CPU scheduler', 'Linker', 'Loader', 1),
  ('Operating Systems', 'Which is NOT a typical process state?', 'Ready', 'Running', 'Waiting', 'Compiling', 3),
  ('Operating Systems', 'Virtual memory lets a system…', 'Delete files', 'Use disk as extra RAM', 'Overclock the CPU', 'Encrypt data', 1),
  ('Operating Systems', 'Which is a required condition for deadlock?', 'Mutual exclusion', 'Infinite loops', 'High CPU usage', 'Fast disk', 0),
  ('Operating Systems', 'What unit does the OS schedule for execution?', 'File', 'Process', 'Folder', 'Driver', 1),
  -- Study Skills (available if a student adds this as a plan)
  ('Study Skills', 'The Pomodoro technique alternates focus with…', 'Naps', 'Short breaks', 'Snacks', 'Music', 1),
  ('Study Skills', 'Recalling information from memory instead of re-reading is…', 'Cramming', 'Active recall', 'Skimming', 'Highlighting', 1),
  ('Study Skills', 'Spacing revision over days rather than one session is…', 'Massed practice', 'Spaced repetition', 'Interleaving', 'Chunking', 1),
  ('Study Skills', 'Which is the healthiest study habit?', 'All-nighters', 'Consistent daily reviews', 'Multitasking', 'Skipping breaks', 1),
  ('Study Skills', 'Teaching a topic to someone else mainly improves…', 'Speed', 'Understanding', 'Typing', 'Grades only', 1);

-- Speed Sorting sets. Subject-tagged ones (Programming … Operating Systems) match
-- Alex's study plans; the NULL-subject ones (Animals, Chemistry) are general and
-- always available. Upload sets get added at runtime by students.
INSERT INTO sorting_sets (id, "userId", title, subject, source, filename, "createdAt") VALUES
  (1, NULL, 'Programming Concepts',            'Programming',       'builtin', NULL, '2026-01-10'),
  (2, NULL, 'Networking Essentials',           'Networking',        'builtin', NULL, '2026-01-10'),
  (3, NULL, 'Database Basics',                 'Databases',         'builtin', NULL, '2026-01-10'),
  (4, NULL, 'Operating Systems',               'Operating Systems', 'builtin', NULL, '2026-01-10'),
  (5, NULL, 'Animal Classes',                  NULL,                'builtin', NULL, '2026-01-10'),
  (6, NULL, 'Chemistry: Acids, Bases & Salts', NULL,                'builtin', NULL, '2026-01-10');

INSERT INTO sorting_items ("setId", term, category) VALUES
  -- Programming
  (1, 'let score = 0',            'Variable'),
  (1, 'const name = "Ada"',       'Variable'),
  (1, 'int count;',               'Variable'),
  (1, 'function add(a, b)',       'Function'),
  (1, 'def greet():',             'Function'),
  (1, 'return total',             'Function'),
  (1, 'for (i = 0; i < n; i++)',  'Loop'),
  (1, 'while (running)',          'Loop'),
  (1, 'items.forEach(...)',       'Loop'),
  (1, 'if (x > 5)',               'Condition'),
  (1, 'else if (y)',              'Condition'),
  (1, 'switch (day)',             'Condition'),
  -- Networking
  (2, 'Router',        'Device'),
  (2, 'Switch',        'Device'),
  (2, 'Firewall',      'Device'),
  (2, 'TCP',           'Protocol'),
  (2, 'HTTP',          'Protocol'),
  (2, 'DNS',           'Protocol'),
  (2, 'IPv4 address',  'Addressing'),
  (2, 'MAC address',   'Addressing'),
  (2, 'Subnet mask',   'Addressing'),
  -- Databases
  (3, 'SELECT',       'SQL Command'),
  (3, 'INSERT',       'SQL Command'),
  (3, 'UPDATE',       'SQL Command'),
  (3, 'PRIMARY KEY',  'Constraint'),
  (3, 'FOREIGN KEY',  'Constraint'),
  (3, 'NOT NULL',     'Constraint'),
  (3, 'INNER JOIN',   'Join'),
  (3, 'LEFT JOIN',    'Join'),
  (3, 'CROSS JOIN',   'Join'),
  -- Operating Systems
  (4, 'Ready',                    'Process State'),
  (4, 'Running',                  'Process State'),
  (4, 'Waiting',                  'Process State'),
  (4, 'Round Robin',              'Scheduler'),
  (4, 'First-Come First-Served',  'Scheduler'),
  (4, 'Priority',                 'Scheduler'),
  (4, 'Paging',                   'Memory'),
  (4, 'Segmentation',             'Memory'),
  (4, 'Swapping',                 'Memory'),
  -- Animals
  (5, 'Dog',        'Mammal'),
  (5, 'Whale',      'Mammal'),
  (5, 'Bat',        'Mammal'),
  (5, 'Snake',      'Reptile'),
  (5, 'Lizard',     'Reptile'),
  (5, 'Crocodile',  'Reptile'),
  (5, 'Eagle',      'Bird'),
  (5, 'Penguin',    'Bird'),
  (5, 'Owl',        'Bird'),
  -- Chemistry
  (6, 'HCl',         'Acid'),
  (6, 'H2SO4',       'Acid'),
  (6, 'Citric acid', 'Acid'),
  (6, 'NaOH',        'Base'),
  (6, 'KOH',         'Base'),
  (6, 'Ammonia',     'Base'),
  (6, 'NaCl',        'Salt'),
  (6, 'KNO3',        'Salt'),
  (6, 'CaCO3',       'Salt');

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
SELECT setval(pg_get_serial_sequence('focus_sessions', 'id'),  (SELECT MAX(id) FROM focus_sessions));
SELECT setval(pg_get_serial_sequence('quiz_questions', 'id'),  (SELECT MAX(id) FROM quiz_questions));
SELECT setval(pg_get_serial_sequence('sorting_sets', 'id'),    (SELECT MAX(id) FROM sorting_sets));
SELECT setval(pg_get_serial_sequence('sorting_items', 'id'),   (SELECT MAX(id) FROM sorting_items));
