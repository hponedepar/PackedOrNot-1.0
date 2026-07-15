// Flash Quiz — assembles the game's topics FROM the student's study plans.
//
// GET /api/quiz?userId=1
//   1. Read the subjects the student is studying (their study plans).
//   2. Keep only those we have a question bank for (case-insensitive match).
//   3. Group the questions into topics the frontend renders directly.
// If none of the student's plans have questions yet, we fall back to every
// available subject so the game is never empty (flagged with fromPlans:false).
const quizRepo = require("../repositories/quiz.repo");

const EMOJI = {
  programming: "💻",
  networking: "🌐",
  databases: "🗄️",
  "operating systems": "🖥️",
  "study skills": "🧠",
  biology: "🧬",
};
const emojiFor = (s) => EMOJI[s.toLowerCase()] || "📘";
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function getQuiz(req, res) {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "userId is required." });

  const [planSubjects, bankSubjects] = await Promise.all([
    quizRepo.subjectsForUser(userId),
    quizRepo.subjectsWithQuestions(),
  ]);

  // Match the student's plan subjects to the question bank, case-insensitively,
  // resolving to the bank's canonical spelling.
  const bankByLower = new Map(bankSubjects.map((s) => [s.toLowerCase(), s]));
  let subjects = [...new Set(
    planSubjects.map((s) => bankByLower.get(s.toLowerCase())).filter(Boolean)
  )];

  const fromPlans = subjects.length > 0;
  if (!fromPlans) subjects = bankSubjects; // fallback: offer everything

  const rows = await quizRepo.questionsForSubjects(subjects);
  const bySubject = {};
  for (const r of rows) {
    (bySubject[r.subject] ||= []).push({
      q: r.question,
      options: [r.optionA, r.optionB, r.optionC, r.optionD],
      answer: r.correctIndex,
    });
  }

  const topics = subjects
    .filter((s) => bySubject[s] && bySubject[s].length)
    .map((s) => ({ id: slug(s), name: s, emoji: emojiFor(s), questions: bySubject[s] }));

  res.json({ fromPlans, topics });
}

module.exports = { getQuiz };
