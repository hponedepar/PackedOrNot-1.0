// Checks the Study Help AI step survives the shapes n8n / Gemini really send.
// Run:  node tests/ai.check.js   (from the backend folder)
//
// Nothing here touches the network — it feeds parseAiPicks/mergePicks the
// replies we expect to see, plus the malformed ones we must survive.
const { parseAiPicks, mergePicks } = require("../controllers/help.controller");

// A stand-in catalogue: only ids 1 and 10 exist.
const COURSES = [
  { id: 1, name: "Networking Basics", provider: "Cisco", level: "Beginner", format: "Self-paced", hours: 22, description: "d", topics: "ip, network", url: "https://x/1", cost: "Free", image: null },
  { id: 10, name: "Linux Essentials", provider: "Cisco", level: "Beginner", format: "Self-paced", hours: 70, description: "d", topics: "linux, shell", url: "https://x/10", cost: "Free", image: null },
];

let pass = 0, fail = 0;
const ok = (cond, label) => {
  if (cond) { pass++; console.log("  PASS  " + label); }
  else { fail++; console.log("  FAIL  " + label); }
};

const GOOD = [{ id: 1, match: 95, reason: "covers IP addressing" }];

console.log("\n--- shapes that must work ---");
ok(parseAiPicks(GOOD)?.[0].id === 1, "a plain array (Respond With: JSON)");
ok(parseAiPicks({ text: JSON.stringify(GOOD) })?.[0].id === 1, "{ text } from a Basic LLM Chain node");
ok(parseAiPicks(JSON.stringify(GOOD))?.[0].id === 1, "a raw JSON string (Respond With: Text)");
ok(parseAiPicks("```json\n" + JSON.stringify(GOOD) + "\n```")?.[0].id === 1, "markdown-fenced JSON");
ok(parseAiPicks({ text: "```\n" + JSON.stringify(GOOD) + "\n```" })?.[0].id === 1, "{ text } wrapping a fenced array");
ok(parseAiPicks('Sure! Here you go:\n[{"id":10,"match":80,"reason":"r"}]')?.[0].id === 10, "chatty model that adds a preamble");
ok(parseAiPicks([{ id: "1", match: "95", reason: "r" }])?.[0].id === 1, "ids/matches sent as strings");

// We must not depend on the field being called "text" — different n8n nodes
// and models name it differently, and JSON mode can nest the whole thing.
ok(parseAiPicks({ output: JSON.stringify(GOOD) })?.[0].id === 1, "{ output } instead of { text }");
ok(parseAiPicks({ content: JSON.stringify(GOOD) })?.[0].id === 1, "{ content } instead of { text }");
ok(parseAiPicks([{ json: { text: JSON.stringify(GOOD) } }])?.[0].id === 1, "n8n item array: [{ json: { text } }]");
ok(parseAiPicks({ data: { response: { text: JSON.stringify(GOOD) } } })?.[0].id === 1, "deeply nested text");
ok(parseAiPicks({ text: GOOD })?.[0].id === 1, "{ text } already parsed into an array");

console.log("\n--- rubbish that must NOT crash (falls back to keywords) ---");
for (const [label, input] of [
  ["null", null],
  ["undefined", undefined],
  ["empty string", ""],
  ["plain prose, no JSON", "I recommend Networking Basics!"],
  ["an object, not an array", { id: 1 }],
  ["empty array", []],
  ["broken JSON", "[{id: 1, match:}"],
  ["array of junk", [1, 2, 3]],
  ["missing ids", [{ match: 90, reason: "r" }]],
]) {
  let threw = false, out;
  try { out = parseAiPicks(input); } catch { threw = true; }
  ok(!threw && (out === null || out.length === 0), label + " -> null, no throw");
}

console.log("\n--- merge uses OUR data, never the AI's ---");
const merged = mergePicks(
  [{ id: 1, match: 95, reason: "because IP" }],
  COURSES
);
ok(merged[0].module === "Networking Basics" && merged[0].url === "https://x/1", "title + url come from the database");
ok(merged[0].reason === "because IP" && merged[0].match === 95, "reason + match come from the AI");

const hallucinated = mergePicks(
  [{ id: 999, match: 99, reason: "invented course" }, { id: 10, match: 70, reason: "real" }],
  COURSES
);
ok(hallucinated.length === 1 && hallucinated[0].id === 10, "a hallucinated course id is dropped");

const dupes = mergePicks([{ id: 1, match: 90, reason: "a" }, { id: 1, match: 80, reason: "b" }], COURSES);
ok(dupes.length === 1, "duplicate ids collapse to one card");

const silly = mergePicks([{ id: 1, match: 5000, reason: "r" }], COURSES);
ok(silly[0].match === 100, "an out-of-range match is clamped to 100");

const noMatch = mergePicks([{ id: 1, reason: "r" }], COURSES);
ok(noMatch[0].match === 80, "a missing match falls back to 80");

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
