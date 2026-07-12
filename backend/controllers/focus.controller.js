const focusRepo = require("../repositories/focus.repo");
const habitsRepo = require("../repositories/habits.repo");

async function getSessions(req, res) {
  const { userId } = req.query;

  const sessions = await focusRepo.find(userId);

  res.json(sessions);
}

async function createSession(req, res) {
  const {
    userId,
    habitId,
    habitName,
    minutes,
    date,
  } = req.body;

if (!userId) {
    return res.status(400).json({
        error: "User ID is required."
    });
}

if (!minutes || minutes <= 0) {
    return res.status(400).json({
        error: "Minutes must be greater than 0."
    });
}

if (!date) {
    return res.status(400).json({
        error: "Date is required."
    });
}

const session = await focusRepo.create({
  userId,
  habitId,
  habitName: habitName || "Free focus",
  minutes,
  date,
});

// If this focus session is linked to a habit,
// increase the habit's progress by 10%.
if (habitId) {
  await habitsRepo.incrementProgress(habitId);
}

res.status(201).json(session);
}

module.exports = {
  getSessions,
  createSession,
};