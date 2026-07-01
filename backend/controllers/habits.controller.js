// Habit / study tracker CRUD. Backed by the MySQL habits table.
const habitsRepo = require("../repositories/habits.repo");

// GET /api/habits?userId=
async function getHabits(req, res) {
  const { userId } = req.query;
  const result = await habitsRepo.find(userId);
  res.json(result);
}

// POST /api/habits
// Used both by the "Create habit" form and the forum "Add to My Tracker"
// button (which passes a sourcePostId).
async function createHabit(req, res) {
  const { userId, name, frequency, sourcePostId } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Habit name is required." });
  }

  const newHabit = await habitsRepo.create({
    userId: userId || 1,
    sourcePostId: sourcePostId || null,
    name,
    frequency: frequency || "Daily",
  });
  res.status(201).json(newHabit);
}

// PUT /api/habits/:id  — update status / progress / mark complete.
async function updateHabit(req, res) {
  const id = Number(req.params.id);
  const existing = await habitsRepo.findById(id);
  if (!existing) return res.status(404).json({ error: "Habit not found." });

  const { status, progress, name, frequency } = req.body;
  const fields = { status, progress, name, frequency };

  // Convenience: marking complete also fills progress to 100%.
  if (status === "completed") fields.progress = 100;

  const updated = await habitsRepo.update(id, fields);
  res.json(updated);
}

// DELETE /api/habits/:id
async function deleteHabit(req, res) {
  const removed = await habitsRepo.remove(Number(req.params.id));
  if (!removed) return res.status(404).json({ error: "Habit not found." });
  res.json({ message: "Habit deleted.", habit: removed });
}

module.exports = { getHabits, createHabit, updateHabit, deleteHabit };
