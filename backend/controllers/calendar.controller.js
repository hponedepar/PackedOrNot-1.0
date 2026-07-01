// Calendar planner CRUD. Backed by the MySQL calendar_tasks table.
const calendarRepo = require("../repositories/calendar.repo");

// GET /api/calendar?userId=
async function getTasks(req, res) {
  const { userId } = req.query;
  const result = await calendarRepo.find(userId);
  res.json(result);
}

// POST /api/calendar
async function createTask(req, res) {
  const { userId, habitId, title, date, time } = req.body;
  if (!title || !date) {
    return res.status(400).json({ error: "Task title and date are required." });
  }

  const newTask = await calendarRepo.create({
    userId: userId || 1,
    habitId: habitId || null,
    title,
    date,
    time: time || "09:00",
  });
  res.status(201).json(newTask);
}

// PUT /api/calendar/:id  — toggle / set completion.
async function updateTask(req, res) {
  const id = Number(req.params.id);
  const existing = await calendarRepo.findById(id);
  if (!existing) return res.status(404).json({ error: "Task not found." });

  const { completed, title, date, time } = req.body;
  const updated = await calendarRepo.update(id, { completed, title, date, time });
  res.json(updated);
}

// DELETE /api/calendar/:id
async function deleteTask(req, res) {
  const removed = await calendarRepo.remove(Number(req.params.id));
  if (!removed) return res.status(404).json({ error: "Task not found." });
  res.json({ message: "Task deleted.", task: removed });
}

module.exports = { getTasks, createTask, updateTask, deleteTask };
