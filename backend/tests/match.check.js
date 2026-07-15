// Checks the Study Help matcher against the examples in the CA2 brief.
// Run:  node tests/match.check.js   (from the backend folder)
require("dotenv").config();
const { toKeywords, scoreCourse } = require("../controllers/help.controller");
const repo = require("../repositories/help.repo");

const CASES = [
  ["I struggle with IP addresses", "Networking Basics"],
  ["I do not understand Linux commands", "Linux Essentials"],
  ["Python loops are difficult", "Python Essentials 1"],
  ["I need help securing a network", ["Network Defense", "Cybersecurity Essentials"]],
];

(async () => {
  const courses = await repo.listCourses();
  let pass = 0;
  for (const [q, want] of CASES) {
    const words = toKeywords(q);
    const top = courses
      .map((c) => scoreCourse(c, words))
      .sort((a, b) => b.score - a.score)
      .filter((s) => s.score > 0)
      .slice(0, 4);
    const first = top[0] && top[0].course.name;
    const ok = Array.isArray(want) ? want.includes(first) : first === want;
    if (ok) pass++;
    console.log(`${ok ? "PASS" : "FAIL"}  "${q}"`);
    console.log(`      keywords: [${words.join(", ")}]`);
    console.log(`      ranked:   ${top.map((s) => `${s.course.name}(${s.score})`).join(" > ") || "(none)"}`);
    if (!ok) console.log(`      WANTED:   ${want}`);
  }
  console.log(`\n${pass}/${CASES.length} passed`);
  process.exit(pass === CASES.length ? 0 : 1);
})();
