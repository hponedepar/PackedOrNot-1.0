// Study Plans: a plan (module) that contains lessons you tick off.
// Backed by the study_plans + lessons tables.
const plansRepo = require("../repositories/plans.repo");

// GET /api/plans?userId=1  -> plans with nested lessons
async function getPlans(req, res) {
  const plans = await plansRepo.findByUser(req.query.userId);
  res.json(plans);
}

// POST /api/plans  { userId, name, module?, message?, frequency?, sourcePostId?, lessons? }
// `lessons` is an optional array of plan-item titles — each becomes its own row
// in the lessons table, which is what the tick-boxes and the progress % read.
// Used by both the New Study Plan form and the forum's "Add to Study Planner".
async function createPlan(req, res) {
  const { userId, name, module, message, frequency, sourcePostId, lessons } = req.body;

  // Subject name is required.
  const subject = typeof name === "string" ? name.trim() : "";
  if (!userId || !subject) {
    return res.status(400).json({ error: "userId and a subject name are required." });
  }

  // Drop blank plan items here too, so an empty box can never become a lesson
  // even if the request didn't come from our own form.
  const items = Array.isArray(lessons)
    ? lessons.map((t) => (typeof t === "string" ? t.trim() : "")).filter(Boolean)
    : [];

  const plan = await plansRepo.createPlan({
    userId: Number(userId),
    name: subject,
    module: (module && module.trim()) || null,
    message: (message && message.trim()) || null,
    frequency: frequency || null,
    sourcePostId: sourcePostId ? Number(sourcePostId) : null,
    lessons: items,
    createdAt: new Date().toISOString().slice(0, 10),
  });
  res.status(201).json(plan);
}

// DELETE /api/plans/:id
async function deletePlan(req, res) {
  const removed = await plansRepo.removePlan(Number(req.params.id));
  if (!removed) return res.status(404).json({ error: "Plan not found." });
  res.json({ message: "Plan deleted.", id: Number(req.params.id) });
}

// POST /api/plans/:id/lessons  { title }
async function addLesson(req, res) {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: "title is required." });
  const lesson = await plansRepo.addLesson(Number(req.params.id), title);
  res.status(201).json(lesson);
}

// PUT /api/plans/:id/lessons/:lessonId  { completed }
async function updateLesson(req, res) {
  const lesson = await plansRepo.setLessonCompleted(
    Number(req.params.lessonId),
    Boolean(req.body.completed)
  );
  if (!lesson) return res.status(404).json({ error: "Lesson not found." });
  res.json(lesson);
}

module.exports = { getPlans, createPlan, deletePlan, addLesson, updateLesson };
