// Speed Sorting Challenge — assembles playable sets and turns an uploaded
// revision file into a new set. Deliberately NOT AI: the file is parsed
// deterministically into terms + categories, so the unique value is the timed
// drag-sort game, not generated content.
//
//   GET  /api/sorting?userId=1        -> sets available to the student
//   POST /api/sorting/upload          -> { userId, filename, content } parsed into a set
//   DELETE /api/sorting/:id           -> remove one of the student's upload sets
const repo = require("../repositories/sorting.repo");

const EMOJI = {
  programming: "💻", networking: "🌐", databases: "🗄️",
  "operating systems": "🖥️", biology: "🧬", chemistry: "⚗️",
};
const emojiFor = (set) => {
  if (set.source === "upload") return "📄";
  const key = (set.subject || set.title || "").toLowerCase();
  for (const k of Object.keys(EMOJI)) if (key.includes(k)) return EMOJI[k];
  return "🗂️";
};

// Attach items (grouped) + the ordered list of categories to each set.
function shapeSets(sets, itemRows) {
  const bySet = {};
  for (const r of itemRows) (bySet[r.setId] ||= []).push({ term: r.term, category: r.category });
  return sets
    .map((s) => {
      const items = bySet[s.id] || [];
      const categories = [...new Set(items.map((i) => i.category))];
      return {
        id: s.id,
        title: s.title,
        subject: s.subject,
        source: s.source,
        emoji: emojiFor(s),
        categories,
        items,
      };
    })
    // Only sets that are actually playable (>=2 categories, >=4 items).
    .filter((s) => s.categories.length >= 2 && s.items.length >= 4);
}

async function getSorting(req, res) {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "userId is required." });

  const subjects = await repo.planSubjects(userId);
  const [builtin, uploads] = await Promise.all([repo.builtinSets(subjects), repo.uploadSets(userId)]);
  const fromPlans = builtin.some((s) => s.subject); // at least one plan-matched set
  const all = [...uploads, ...builtin]; // show the student's own sets first
  const items = await repo.itemsForSets(all.map((s) => s.id));

  res.json({ fromPlans, sets: shapeSets(all, items) });
}

// Parse a plain-text/CSV revision file into { term, category } pairs.
// Supported formats (auto-detected):
//   "Category: term1, term2, term3"   (one category per line)
//   "term, category"                  (CSV pairs, one per line)
function parseRevisionFile(content) {
  const lines = String(content || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items = [];
  const useColon = lines.some((l) => l.includes(":"));

  for (const line of lines) {
    if (useColon) {
      const idx = line.indexOf(":");
      if (idx === -1) continue;
      const category = line.slice(0, idx).trim();
      const terms = line.slice(idx + 1).split(",").map((t) => t.trim()).filter(Boolean);
      for (const term of terms) {
        if (category && term) items.push({ term: term.slice(0, 160), category: category.slice(0, 120) });
      }
    } else {
      const parts = line.split(",").map((p) => p.trim());
      if (parts.length >= 2 && parts[0] && parts[1]) {
        items.push({ term: parts[0].slice(0, 160), category: parts[1].slice(0, 120) });
      }
    }
    if (items.length >= 80) break; // sane cap
  }
  return items;
}

async function uploadSet(req, res) {
  const { userId, filename, content } = req.body;
  if (!userId) return res.status(400).json({ error: "userId is required." });
  if (!content || !content.trim()) return res.status(400).json({ error: "The file appears to be empty." });

  const items = parseRevisionFile(content);
  const categories = new Set(items.map((i) => i.category));
  if (items.length < 4 || categories.size < 2) {
    return res.status(422).json({
      error:
        "Couldn't build a sorting set from this file. Use lines like \"Category: item1, item2, item3\" " +
        "(at least 2 categories and 4 items).",
    });
  }

  const base = (filename || "My revision set").replace(/\.[^.]+$/, "").trim() || "My revision set";
  const created = await repo.createUploadSet({ userId, title: base.slice(0, 160), filename, items });

  const rows = await repo.itemsForSets([created.id]);
  res.status(201).json(shapeSets([created], rows)[0]);
}

async function deleteSet(req, res) {
  const id = Number(req.params.id);
  const set = await repo.findSet(id);
  if (!set) return res.status(404).json({ error: "Set not found." });
  if (set.source !== "upload") return res.status(403).json({ error: "Built-in sets can't be deleted." });
  await repo.removeSet(id);
  res.json({ message: "Set deleted.", id });
}

module.exports = { getSorting, uploadSet, deleteSet };
