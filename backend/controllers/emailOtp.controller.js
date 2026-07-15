// Email verification for sign-up (OTP). Same pattern as AIdPulse:
//
//   Delivery  — the browser calls /api/email-otp/send; the server makes a
//               6-digit code and forwards { email, code } to an n8n workflow
//               that emails it via Gmail. The webhook URL + Gmail creds stay
//               on the server; the code never goes back to the browser.
//   Verify    — no database. /send returns an HMAC-signed token that binds
//               the email + a hash of the code + an expiry (signed with
//               EMAIL_OTP_SECRET). /verify recomputes the HMAC and does a
//               constant-time compare, so the flow is completely stateless.
//   Fallback  — if the webhook or secret isn't configured, the routes return
//               503 and the frontend shows an on-screen demo code instead, so
//               the demo always works with no email backend.
const crypto = require("crypto");

const SECRET = process.env.EMAIL_OTP_SECRET;         // signs the token
const WEBHOOK = process.env.N8N_OTP_WEBHOOK_URL;     // n8n workflow that emails via Gmail
const CODE_TTL_MS = 10 * 60 * 1000;                  // codes expire after 10 minutes

// Per-email send history (in memory) for rate limiting: email -> [timestamps].
const sendLog = new Map();

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
const sign = (payload) => crypto.createHmac("sha256", SECRET).update(payload).digest("hex");

// Constant-time equality that never throws on length mismatch: hash both
// sides to a fixed 32 bytes first, then compare.
function safeEqual(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// Build a signed, self-contained token: base64url("email:hash(code):expiry.sig").
function makeToken(email, code) {
  const payload = `${email}:${sha256(code)}:${Date.now() + CODE_TTL_MS}`;
  return Buffer.from(`${payload}.${sign(payload)}`).toString("base64url");
}

// POST /api/email-otp/send  { email }  ->  { token }
async function send(req, res) {
  const email = String(req.body.email || "").trim().toLowerCase();
  if (!email.includes("@")) return res.status(400).json({ error: "A valid email is required." });

  // No webhook / secret configured -> tell the frontend to use the demo code.
  if (!SECRET || !WEBHOOK) return res.status(503).json({ error: "Email verification is not configured." });

  // Rate limit: at most 5 per hour, and at least 30 seconds apart.
  const now = Date.now();
  const hist = (sendLog.get(email) || []).filter((t) => now - t < 3600_000);
  if (hist.length >= 5) return res.status(429).json({ error: "Too many codes requested. Please try again later." });
  if (hist.length && now - hist[hist.length - 1] < 30_000) {
    return res.status(429).json({ error: "Please wait 30 seconds before requesting another code." });
  }

  const code = String(crypto.randomInt(100000, 1000000)); // secure 6-digit code
  const token = makeToken(email, code);

  // Forward to n8n (which sends the Gmail). The code stays server-side.
  try {
    const r = await fetch(WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    if (!r.ok) throw new Error(`n8n responded ${r.status}`);
  } catch (err) {
    return res.status(502).json({ error: "Could not send the verification email right now." });
  }

  hist.push(now);
  sendLog.set(email, hist);
  console.log(`[email-otp] code sent to *@${email.split("@")[1]}`); // log only the domain, never the code
  res.json({ token, expiresInSec: CODE_TTL_MS / 1000 });
}

// POST /api/email-otp/verify  { email, code, token }  ->  { verified: true }
async function verify(req, res) {
  if (!SECRET) return res.status(503).json({ error: "Email verification is not configured." });
  const email = String(req.body.email || "").trim().toLowerCase();
  const code = String(req.body.code || "").trim();
  const token = String(req.body.token || "");

  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const dot = decoded.lastIndexOf(".");
    const payload = decoded.slice(0, dot);
    const sig = decoded.slice(dot + 1);

    // 1) token untampered?
    if (!safeEqual(sig, sign(payload))) {
      return res.status(400).json({ error: "Invalid or tampered token." });
    }
    const [tokEmail, codeHash, expiry] = payload.split(":");
    // 2) same email + not expired?
    if (tokEmail !== email) return res.status(400).json({ error: "This code was sent to a different email." });
    if (Date.now() > Number(expiry)) return res.status(400).json({ error: "That code has expired. Request a new one." });
    // 3) code correct? (constant-time compare of the hashes)
    if (!safeEqual(sha256(code), codeHash)) {
      return res.status(400).json({ error: "Incorrect code. Please check and try again." });
    }
    res.json({ verified: true });
  } catch {
    res.status(400).json({ error: "Invalid code." });
  }
}

module.exports = { send, verify };
