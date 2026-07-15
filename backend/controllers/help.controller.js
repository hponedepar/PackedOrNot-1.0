// Study Help — recommends Cisco NetAcad courses for whatever the student is
// struggling with. Done by Khaing Khant Zaw.
//
// How it works, in order:
//   1) Cache   — if we answered this exact question before, return that.
//   2) n8n/AI  — if N8N_WEBHOOK_URL is set in .env, ask the n8n workflow
//                (which uses an AI model) to rank the courses.
//   3) Keyword — otherwise score the question's words against each course's
//                name, description and topics. Simple and always works.
// Every answer is cached, so the demo works even if n8n/AI is offline.
const helpRepo = require("../repositories/help.repo");

// How many courses a single answer may contain.
const MAX_RESULTS = 4;

// Below this match %, we don't really have an answer — the student asked
// something our catalogue doesn't cover ("our team is presenting, what should
// we do"). Rather than dress up an unrelated course as a recommendation, we
// mark the whole answer `weak` and the page says so. Works for both engines:
// the keyword matcher scores 40 when nothing matched, and the AI is told to
// return a low match when nothing fits.
const WEAK_BELOW = 50;

// Tag every card so the page can be honest about a poor answer.
function tagWeak(results) {
  const weak = !results.length || results[0].match < WEAK_BELOW;
  return results.map((r) => ({ ...r, weak }));
}

// Common filler words that appear in any sentence — ignoring them keeps the
// matching focused on the actual subject (e.g. "networking", "python").
//
// The short ones matter more than they look: we deliberately keep 2-letter
// words so "ip" and "os" still match, which means "to" and "in" would sail
// through too — and "to" alone scores every "Introduction to ..." course on
// the list. Anything here is a word no course should ever be picked for.
const STOP_WORDS = new Set([
  // function words (the reason "to" must be here)
  "to", "in", "on", "at", "of", "or", "as", "is", "it", "be", "by", "an", "am",
  "so", "no", "if", "we", "us", "up", "me", "my", "he", "she", "his", "her",
  "was", "were", "been", "will", "shall", "may", "might", "must", "does",
  "all", "out", "over", "than", "then", "now", "get", "got", "make", "makes",
  "made", "sense", "head", "around", "lately", "keep", "keeps", "cannot",
  "the", "and", "with", "that", "this", "have", "has", "had", "was", "are",
  "dont", "don", "doesnt", "do", "does", "did", "know", "where", "what", "when",
  "how", "why", "for", "from", "about", "too", "much", "many", "things",
  "thing", "stuff", "start", "starting", "started", "need", "needs", "want",
  "wants", "help", "helping", "please", "really", "very", "just", "like",
  "some", "any", "can", "cant", "could", "should", "would", "there", "here",
  "which", "them", "they", "you", "your", "our", "not", "but", "get", "getting",
  "struggling", "struggle", "struggles", "hard", "difficult", "difficulty",
  "module", "modules", "course", "courses", "learn", "learning", "understand",
  "understanding", "confused", "confusing", "trouble", "problem", "problems",
  "using", "use", "make", "made", "take", "taking", "still", "also", "into",
]);

// Crude stemmer so a student's wording still matches our keywords:
//   "addresses" -> "address"   "loops" -> "loop"   "securing" -> "secur"
// It only has to be good enough to line two English words up.
function stem(word) {
  if (word.length > 5 && word.endsWith("ing")) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith("es")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s")) return word.slice(0, -1);
  return word;
}

// Turn the student's question into meaningful stemmed keywords.
// "I don't know where to start with Networking!" -> ["network"]
function toKeywords(query) {
  const seen = new Set();
  for (const raw of query.toLowerCase().split(/[^a-z0-9]+/)) {
    // Keep 2-letter words like "ip" and "os" — they carry real meaning here.
    if (raw.length < 2 || STOP_WORDS.has(raw)) continue;
    seen.add(stem(raw));
  }
  return [...seen];
}

// Every distinct stemmed word attached to a course, split into the two places
// it can come from. A hit in `topics` counts for more than a passing mention
// in the description, which is what makes "linux commands" rank Linux
// Essentials (topics: commands) above Linux Unhatched (topics: introduction).
function courseIndex(course) {
  const split = (text) => new Set(
    String(text || "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).map(stem)
  );
  return {
    strong: split(`${course.name} ${course.topics}`),   // title + keywords
    weak: split(course.description),                    // description only
  };
}

// Does this course keyword line up with the student's word?
// Exact match, or a prefix either way — so "secur" (from "securing") reaches
// "security". BOTH sides must be >= 4 characters before we allow a prefix
// match: otherwise a stray one-letter word like the "a" in "in a live
// environment" prefix-matches "address", and every course looks relevant.
const MIN_PREFIX = 4;

function hits(set, word) {
  if (set.has(word)) return true;                 // "ip" still matches "ip" exactly
  if (word.length < MIN_PREFIX) return false;
  for (const k of set) {
    if (k.length < MIN_PREFIX) continue;
    if (k.startsWith(word) || word.startsWith(k)) return true;
  }
  return false;
}

function scoreCourse(course, words) {
  const { strong, weak } = courseIndex(course);
  let score = 0;
  const matched = [];
  for (const word of words) {
    if (hits(strong, word)) { score += 3; matched.push(word); }
    else if (hits(weak, word)) { score += 1; matched.push(word); }
  }
  return { course, score, matched };
}

// The one place a course row becomes the JSON the Study Help page renders.
// Every field except `match` and `reason` comes straight from our database —
// which is why the AI can never invent a course title, price or link.
function shape(course, match, reason) {
  return {
    id: course.id,
    module: course.name,
    provider: course.provider,
    level: course.level,
    format: course.format,
    hours: course.hours,
    description: course.description,
    match,
    url: course.url,
    image: course.image || null,
    cost: course.cost || "Free",
    reason,
    topics: String(course.topics || "").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 4),
  };
}

// Shape a course row + its keyword score into a result.
function toResult(s, bestScore, nothingMatched) {
  return shape(
    s.course,
    // Best match gets 95%; the rest scale down from there.
    nothingMatched ? 40 : Math.round(60 + 35 * (s.score / bestScore)),
    nothingMatched
      ? `A good ${String(s.course.level || "beginner").toLowerCase()} starting point if you are not sure where to begin.`
      : `Matches what you asked about: ${s.matched.join(", ")}.`
  );
}

// ---- The AI step (n8n) ---------------------------------------------------
// The workflow is asked to return only [{ id, match, reason }] — it ranks our
// catalogue, it does not describe courses. Everything below assumes the model
// may still get the formatting wrong, so nothing here throws: if the answer is
// unusable we return null and the caller falls back to keyword matching.

// How long to wait for n8n + the model. Gemini's free tier is genuinely
// variable (measured 5s-37s on the same question), so this is deliberately
// generous: the answer is cached afterwards, so only the FIRST person to ask a
// given question ever waits. Override with N8N_TIMEOUT_MS in .env.
const AI_TIMEOUT_MS = Number(process.env.N8N_TIMEOUT_MS) || 25000;

// Pull a JSON array out of one string, ignoring ```json fences and any chatter
// the model wrapped around it.
function arrayFromString(value) {
  let text = String(value).trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();
  const array = text.match(/\[[\s\S]*\]/);
  if (!array) return null;
  try {
    const parsed = JSON.parse(array[0]);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// Hunt for the picks array anywhere in what n8n sent. We can't rely on one
// field name: an LLM Chain says `text`, other nodes say `output` or `content`,
// and a "Respond With: JSON" node may nest the lot. So walk the whole payload
// and take the first array that actually looks like picks.
function deepFindPicks(value, depth = 0) {
  if (value == null || depth > 5) return null;

  if (Array.isArray(value)) {
    if (value.some((v) => v && typeof v === "object" && "id" in v)) return value;
    for (const item of value) {
      const found = deepFindPicks(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (typeof value === "string") return arrayFromString(value);

  if (typeof value === "object") {
    for (const item of Object.values(value)) {
      const found = deepFindPicks(item, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

// Dig the array out of whatever came back, then keep only usable picks.
function parseAiPicks(payload) {
  const raw = deepFindPicks(payload);
  if (!Array.isArray(raw)) return null;

  const picks = raw
    .map((p) => ({
      id: Number(p && p.id),
      match: Number(p && p.match),
      reason: typeof (p && p.reason) === "string" ? p.reason.trim() : "",
    }))
    .filter((p) => Number.isInteger(p.id));

  return picks.length ? picks : null;
}

// Turn the AI's picks into results, using OUR course rows for every fact.
// Unknown ids (a hallucinated course) and duplicates are dropped.
function mergePicks(picks, courses) {
  const byId = new Map(courses.map((c) => [Number(c.id), c]));
  const out = [];
  for (const p of picks) {
    const course = byId.get(p.id);
    if (!course || out.some((r) => r.id === course.id)) continue;
    const match = Number.isFinite(p.match) ? Math.max(1, Math.min(100, Math.round(p.match))) : 80;
    out.push(shape(course, match, p.reason || "Recommended for what you asked about."));
    if (out.length >= MAX_RESULTS) break;
  }
  return out;
}

// Ask the n8n workflow to rank the catalogue. Returns null on any problem
// (not configured, timeout, HTTP error, unparseable answer, no usable ids).
async function askAi(query, courses) {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) return null;

  // Send only what the model needs to RANK: the id to pick, the title, the
  // level, and the keywords. Descriptions nearly double the prompt and the
  // model never has to repeat them back — the reply is just ids. A smaller
  // prompt is a faster reply, which matters on Gemini's free tier.
  const lean = courses.map((c) => ({
    id: c.id,
    name: c.name,
    level: c.level,
    topics: c.topics,
  }));

  // Without a timeout a hanging workflow would hang the page mid-demo.
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), AI_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, courses: lean }),
      signal: abort.signal,
    });
    if (!response.ok) {
      console.log(`  n8n replied ${response.status}; using keyword matching.`);
      return null;
    }

    // The workflow may answer with JSON or plain text — read it either way.
    const body = await response.text();
    let payload;
    try { payload = JSON.parse(body); } catch { payload = body; }

    const picks = parseAiPicks(payload);
    if (!picks) {
      // Show what actually came back — usually an n8n error object, which is
      // far more useful than "unexpected answer".
      const snippet = body.replace(/\s+/g, " ").slice(0, 160);
      console.log("  n8n answer wasn't the expected [{id,match,reason}]; using keyword matching.");
      console.log(`    it replied: ${snippet}`);
      return null;
    }

    const results = mergePicks(picks, courses);
    if (!results.length) {
      console.log("  n8n picked no course we actually have; using keyword matching.");
      return null;
    }
    return results;
  } catch (err) {
    const why = err.name === "AbortError" ? `no reply in ${AI_TIMEOUT_MS}ms` : err.message;
    console.log(`  n8n unavailable (${why}); using keyword matching.`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// POST /api/help/recommend   body: { query }
async function recommend(req, res) {
  const query = (req.body.query || "").trim();
  if (!query) {
    return res.status(400).json({ error: "Please tell us what you need help with." });
  }

  // 1) Answered before? Return the cached answer.
  const cached = await helpRepo.findCached(query);
  if (cached) {
    return res.json(JSON.parse(cached.results));
  }

  const courses = await helpRepo.listCourses();

  // 2) AI step: let the n8n workflow rank our catalogue. Anything wrong with
  //    it (down, slow, bad answer) returns null and we quietly fall through to
  //    keyword matching, so the page always answers.
  const aiResults = await askAi(query, courses);
  if (aiResults) {
    const tagged = tagWeak(aiResults);
    await helpRepo.saveCache(query, tagged);
    return res.json(tagged);
  }

  // 3) Keyword matching: score every course, best first.
  const words = toKeywords(query);
  const scored = courses.map((course) => scoreCourse(course, words)).sort((a, b) => b.score - a.score);

  // Take the best few; if nothing matched at all, still suggest two
  // beginner-friendly courses so the student never gets an empty answer.
  let top = scored.filter((s) => s.score > 0).slice(0, MAX_RESULTS);
  const nothingMatched = top.length === 0;
  if (nothingMatched) {
    top = scored.filter((s) => String(s.course.level).toLowerCase() === "beginner").slice(0, 2);
    if (!top.length) top = scored.slice(0, 2);
  }

  const bestScore = nothingMatched ? 1 : top[0].score;
  const results = tagWeak(top.map((s) => toResult(s, bestScore, nothingMatched)));

  await helpRepo.saveCache(query, results);
  res.json(results);
}

module.exports = { recommend, toKeywords, scoreCourse, parseAiPicks, mergePicks, tagWeak };
