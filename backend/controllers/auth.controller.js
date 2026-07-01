// Handles register / login. Backed by the MySQL users table.
const usersRepo = require("../repositories/users.repo");

// Remove the password before sending a user object back to the client.
function safeUser(user) {
  const { password, ...rest } = user;
  return rest;
}

// POST /api/auth/register
async function register(req, res) {
  const { name, email, password, yearLevel, diploma } = req.body;

  if (!name || !email || !password || !yearLevel || !diploma) {
    return res.status(400).json({ error: "All fields are required." });
  }

  const exists = await usersRepo.findByEmail(email);
  if (exists) {
    return res.status(409).json({ error: "An account with this email already exists." });
  }

  const newUser = await usersRepo.create({
    name,
    email,
    password, // TODO: hash with bcrypt before final submission.
    yearLevel,
    diploma,
    role: "user",
    createdAt: new Date().toISOString().slice(0, 10),
  });

  // A fake token so the flow looks like a real app. Swap for JWT later.
  const token = "demo-token-" + newUser.id;
  res.status(201).json({ token, user: safeUser(newUser) });
}

// POST /api/auth/login
async function login(req, res) {
  const { email, password } = req.body;

  const user = await usersRepo.findByEmail(email || "");
  if (!user || user.password !== password) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const token = "demo-token-" + user.id;
  res.json({ token, user: safeUser(user) });
}

// GET /api/auth/users  (helper for the demo / admin views)
async function listUsers(req, res) {
  const users = await usersRepo.listAll();
  res.json(users.map(safeUser));
}

module.exports = { register, login, listUsers };
