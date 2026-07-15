// Flash Quiz question bank. Grouped by real study topics students on NextStep
// actually revise (the app already references Cisco NetAcad, programming and
// operating-systems modules), so the game reinforces coursework rather than
// trivia. Add a topic or questions here and the game picks them up automatically.
//
// Shape: each question has a prompt, four options, and the index of the answer.

export const TOPICS = [
  {
    id: "programming",
    name: "Programming",
    emoji: "💻",
    questions: [
      { q: "Which data structure works on a Last-In-First-Out basis?", options: ["Queue", "Stack", "Array", "Tree"], answer: 1 },
      { q: "What does a 'for' loop primarily provide?", options: ["Decision making", "Repetition", "Data storage", "Error handling"], answer: 1 },
      { q: "What is the time complexity of binary search?", options: ["O(n)", "O(n²)", "O(log n)", "O(1)"], answer: 2 },
      { q: "Which keyword defines a reusable block of code?", options: ["loop", "function", "class", "return"], answer: 1 },
      { q: "A variable that only exists inside a function is called…", options: ["Global", "Static", "Local", "Constant"], answer: 2 },
      { q: "Which symbol usually denotes a single-line comment in JavaScript?", options: ["#", "//", "<!--", "**"], answer: 1 },
    ],
  },
  {
    id: "networking",
    name: "Networking",
    emoji: "🌐",
    questions: [
      { q: "Which layer of the OSI model handles routing?", options: ["Transport", "Network", "Data Link", "Session"], answer: 1 },
      { q: "What does 'IP' stand for?", options: ["Internet Protocol", "Internal Process", "Instant Packet", "Input Port"], answer: 0 },
      { q: "Which device forwards packets between different networks?", options: ["Switch", "Hub", "Router", "Repeater"], answer: 2 },
      { q: "How many bits are in an IPv4 address?", options: ["16", "32", "64", "128"], answer: 1 },
      { q: "Which protocol is connection-oriented and reliable?", options: ["UDP", "ICMP", "TCP", "ARP"], answer: 2 },
      { q: "What port does HTTPS use by default?", options: ["21", "80", "443", "25"], answer: 2 },
    ],
  },
  {
    id: "databases",
    name: "Databases",
    emoji: "🗄️",
    questions: [
      { q: "Which SQL keyword retrieves data from a table?", options: ["GET", "SELECT", "FETCH", "PULL"], answer: 1 },
      { q: "A column that uniquely identifies each row is a…", options: ["Foreign key", "Index", "Primary key", "View"], answer: 2 },
      { q: "Which clause filters rows in a query?", options: ["ORDER BY", "GROUP BY", "WHERE", "HAVING"], answer: 2 },
      { q: "What does 'normalization' reduce?", options: ["Speed", "Redundancy", "Security", "Storage cost only"], answer: 1 },
      { q: "Which JOIN returns only matching rows in both tables?", options: ["LEFT JOIN", "INNER JOIN", "FULL JOIN", "CROSS JOIN"], answer: 1 },
    ],
  },
  {
    id: "study",
    name: "Study Skills",
    emoji: "🧠",
    questions: [
      { q: "The Pomodoro technique alternates focus with…", options: ["Naps", "Short breaks", "Snacks", "Music"], answer: 1 },
      { q: "Recalling info from memory instead of re-reading is called…", options: ["Cramming", "Active recall", "Skimming", "Highlighting"], answer: 1 },
      { q: "Spacing revision over days rather than one session is…", options: ["Massed practice", "Spaced repetition", "Interleaving", "Chunking"], answer: 1 },
      { q: "Which is the healthiest study habit?", options: ["All-nighters", "Consistent daily reviews", "Multitasking", "Skipping breaks"], answer: 1 },
      { q: "Teaching a topic to someone else mainly improves…", options: ["Speed", "Understanding", "Typing", "Grades only"], answer: 1 },
    ],
  },
];
