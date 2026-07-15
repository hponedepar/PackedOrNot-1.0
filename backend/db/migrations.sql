-- NextStep additive migration. Done by Khaing Khant Zaw.
--
-- IMPORTANT: this file is NOT schema.sql. It only ADDS things — it never
-- drops a table or deletes a row — because the Supabase database is shared
-- with the whole team. Running `npm run db:init` would wipe everyone's data;
-- run `npm run db:migrate` instead.
--
-- Every statement is idempotent, so running it twice is harmless.

-- ---- 1) Forum posts: study vs habit --------------------------------------
-- Each question now belongs to exactly one forum. Existing rows default to
-- 'study', which is what they were before this column existed.
ALTER TABLE posts ADD COLUMN IF NOT EXISTS "forumType" VARCHAR(10) NOT NULL DEFAULT 'study';

-- Only ever allow the two known values.
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_forumtype_check;
ALTER TABLE posts ADD CONSTRAINT posts_forumtype_check CHECK ("forumType" IN ('study', 'habit'));

-- Filtering by forum happens on every forum page load.
CREATE INDEX IF NOT EXISTS posts_forumtype_idx ON posts ("forumType");

-- Move the existing stress question into the Habit forum so both tabs have
-- real demo content. Narrow WHERE clause: it only matches that one seeded row.
UPDATE posts
   SET "forumType" = 'habit', category = 'Mental wellness'
 WHERE "forumType" = 'study'
   AND LOWER(title) LIKE '%manage stress%';

-- ---- 2) Study plans: the student's objective ------------------------------
-- Free-text "what am I trying to achieve" note from the New Study Plan form.
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS message TEXT;

-- ---- 3) NetAcad catalogue: image + cost -----------------------------------
ALTER TABLE netacad_courses ADD COLUMN IF NOT EXISTS image VARCHAR(300);
ALTER TABLE netacad_courses ADD COLUMN IF NOT EXISTS cost VARCHAR(40) NOT NULL DEFAULT 'Free';

-- Match on name so re-running never duplicates a course, and so the four
-- courses that already exist keep their ids (nothing else has to change).
ALTER TABLE netacad_courses DROP CONSTRAINT IF EXISTS netacad_courses_name_key;
ALTER TABLE netacad_courses ADD CONSTRAINT netacad_courses_name_key UNIQUE (name);

-- Sharper keywords on the existing rows so real questions match. For example
-- "I struggle with IP addresses" has to reach Networking Basics.
UPDATE netacad_courses
   SET topics = 'networking, network, ip, ip address, ip addressing, subnet, subnetting, router, routing, switch, wifi, internet, protocol, lan, ethernet, dns, dhcp'
 WHERE name = 'Networking Basics';

UPDATE netacad_courses
   SET topics = 'python, programming, coding, loop, loops, variable, variables, function, functions, condition, conditionals, syntax, list, string, beginner, algorithm'
 WHERE name = 'Python Essentials 1';

UPDATE netacad_courses
   SET topics = 'hardware, computer, component, cpu, ram, memory, storage, motherboard, pc, peripheral, troubleshooting'
 WHERE name = 'Computer Hardware Basics';

-- url is set by the UPDATE statements below (matched by name), so it is not
-- part of this VALUES list.
INSERT INTO netacad_courses (name, provider, level, format, hours, description, topics, cost)
SELECT v.name, v.provider, v.level, v.format, v.hours, v.description, v.topics, 'Free'
  FROM (VALUES
    ('Networking Devices and Initial Configuration', 'Cisco Networking Academy', 'Beginner', 'Self-paced', 24,
     'Configure switches, routers and wireless devices, and take your first steps in building a small network.',
     'networking device, switch, router, wireless, configuration, configure, cli, ios, initial setup, small network, vlan'),
    ('Introduction to Cybersecurity', 'Cisco Networking Academy', 'Beginner', 'Self-paced', 6,
     'Learn what cybersecurity is, why attacks happen, and how to protect your own data and privacy online.',
     'cybersecurity, cyber, security, privacy, attack, threat, phishing, malware, data protection, online safety'),
    ('Cybersecurity Essentials', 'Cisco Networking Academy', 'Intermediate', 'Self-paced', 30,
     'Build core cybersecurity skills: protecting networks and data, cryptography, and defending against threats.',
     'cybersecurity, security, network security, securing, secure, cryptography, encryption, threat, vulnerability, defence, defense, confidentiality'),
    ('Operating Systems Basics', 'Cisco Networking Academy', 'Beginner', 'Self-paced', 6,
     'Understand what an operating system does, how it manages processes and memory, and how to work with files.',
     'operating system, os, windows, process, processes, thread, memory, memory management, scheduling, file system, kernel, boot'),
    ('Linux Unhatched', 'Cisco Networking Academy', 'Beginner', 'Self-paced', 8,
     'Your very first look at Linux: try basic commands in a live environment and see what Linux is used for.',
     'linux, introduction, first steps, try linux, beginner, unhatched, open source, distribution'),
    ('Linux Essentials', 'Cisco Networking Academy', 'Beginner', 'Self-paced', 70,
     'Learn the Linux command line properly: commands, the shell, files, permissions and basic scripting.',
     'linux, command, commands, command line, terminal, shell, bash, file, files, permission, permissions, scripting, script, directory, sudo, grep'),
    ('Python Essentials 2', 'Python Institute', 'Intermediate', 'Self-paced', 40,
     'Go beyond the basics with modules, packages, exceptions, file handling and object-oriented programming.',
     'python, module, modules, package, packages, exception, exceptions, oop, class, classes, object, inheritance, file handling, advanced python'),
    ('JavaScript Essentials 1', 'Cisco Networking Academy', 'Beginner', 'Self-paced', 30,
     'Learn JavaScript from scratch and start making web pages interactive in the browser.',
     'javascript, js, web, website, browser, dom, frontend, variable, function, event, html, interactive'),
    ('Data Analytics Essentials', 'Cisco Networking Academy', 'Beginner', 'Self-paced', 30,
     'Learn how to collect, clean, analyse and visualise data so you can turn numbers into decisions.',
     'data analytics, data, analytics, analysis, excel, sql, visualisation, visualization, dashboard, chart, statistics, dataset'),
    ('Introduction to Data Science', 'Cisco Networking Academy', 'Beginner', 'Self-paced', 6,
     'Discover what data science is, what data scientists actually do, and how data drives real decisions.',
     'data science, data, machine learning, ai, artificial intelligence, model, prediction, big data, dataset'),
    ('Internet of Things', 'Cisco Networking Academy', 'Beginner', 'Self-paced', 20,
     'Explore how everyday devices connect, sense and share data, and how IoT systems are put together.',
     'iot, internet of things, sensor, sensors, device, connected, smart home, embedded, automation, arduino, raspberry pi'),
    ('Endpoint Security', 'Cisco Networking Academy', 'Intermediate', 'Self-paced', 27,
     'Secure the devices on a network: antivirus, hardening, access control and endpoint monitoring.',
     'endpoint, endpoint security, antivirus, malware, hardening, access control, device security, patch, firewall, host'),
    ('Network Defense', 'Cisco Networking Academy', 'Intermediate', 'Self-paced', 27,
     'Learn to defend a network: monitoring traffic, firewalls, access control lists and responding to attacks.',
     'network defense, network defence, securing, secure, security, network security, firewall, monitoring, acl, intrusion, attack, incident response, protect network'),
    ('Cloud and Virtualization Concepts', 'Cisco Networking Academy', 'Beginner', 'Self-paced', 20,
     'Understand virtual machines, containers and the cloud services modern applications actually run on.',
     'cloud, virtualization, virtualisation, virtual machine, vm, container, docker, aws, azure, hypervisor, saas, server')
  ) AS v(name, provider, level, format, hours, description, topics)
 WHERE NOT EXISTS (SELECT 1 FROM netacad_courses c WHERE c.name = v.name);

-- Real NetAcad course links, applied by name so ids never matter.
UPDATE netacad_courses SET url = 'https://www.netacad.com/courses/networking-devices-and-initial-configuration' WHERE name = 'Networking Devices and Initial Configuration';
UPDATE netacad_courses SET url = 'https://www.netacad.com/courses/introduction-to-cybersecurity'   WHERE name = 'Introduction to Cybersecurity';
UPDATE netacad_courses SET url = 'https://www.netacad.com/courses/cybersecurity-essentials'        WHERE name = 'Cybersecurity Essentials';
UPDATE netacad_courses SET url = 'https://www.netacad.com/courses/operating-systems-basics'        WHERE name = 'Operating Systems Basics';
UPDATE netacad_courses SET url = 'https://www.netacad.com/courses/linux-unhatched'                 WHERE name = 'Linux Unhatched';
UPDATE netacad_courses SET url = 'https://www.netacad.com/courses/linux-essentials'                WHERE name = 'Linux Essentials';
UPDATE netacad_courses SET url = 'https://www.netacad.com/courses/python-essentials-2'             WHERE name = 'Python Essentials 2';
UPDATE netacad_courses SET url = 'https://www.netacad.com/courses/javascript-essentials-1'         WHERE name = 'JavaScript Essentials 1';
UPDATE netacad_courses SET url = 'https://www.netacad.com/courses/data-analytics-essentials'       WHERE name = 'Data Analytics Essentials';
UPDATE netacad_courses SET url = 'https://www.netacad.com/courses/introduction-to-data-science'    WHERE name = 'Introduction to Data Science';
UPDATE netacad_courses SET url = 'https://www.netacad.com/courses/internet-of-things'              WHERE name = 'Internet of Things';
UPDATE netacad_courses SET url = 'https://www.netacad.com/courses/endpoint-security'               WHERE name = 'Endpoint Security';
UPDATE netacad_courses SET url = 'https://www.netacad.com/courses/network-defense'                 WHERE name = 'Network Defense';
UPDATE netacad_courses SET url = 'https://www.netacad.com/courses/cloud-and-virtualization-concepts' WHERE name = 'Cloud and Virtualization Concepts';

-- Cached answers were produced by the old matcher, so drop them (not the
-- table) — otherwise old results would keep being served.
DELETE FROM recommendations;

-- Seeding above used generated ids; keep the sequence ahead of them.
SELECT setval(pg_get_serial_sequence('netacad_courses', 'id'), (SELECT MAX(id) FROM netacad_courses));
