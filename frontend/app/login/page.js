"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Logo from "@/components/Logo";
import { useAuth } from "@/lib/auth";
import { AuthAPI, EmailOtpAPI } from "@/lib/api";
import { CheckIcon } from "@/lib/icons";

const YEARS = ["Year 1", "Year 2", "Year 3"];
const DIPLOMAS = [
  "Diploma in Information Technology",
  "Diploma in Applied AI & Analytics",
  "Diploma in Cybersecurity & Digital Forensics",
  "Diploma in Business",
  "Diploma in Engineering",
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [mode, setMode] = useState("login"); // "login" | "register"
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Form fields
  const [email, setEmail] = useState("alex@rp.edu.sg");
  const [password, setPassword] = useState("password123");
  const [name, setName] = useState("");
  const [yearLevel, setYearLevel] = useState("Year 1");
  const [diploma, setDiploma] = useState(DIPLOMAS[0]);

  // Email-verification (OTP) state. In register mode the email must be verified
  // BEFORE the rest of the form appears (same flow as AIdPulse).
  //   otp = null                     -> no code sent yet (show "Verify email")
  //   otp = { mode:"real", token }   -> code emailed; verified on the server
  //   otp = { mode:"demo", demoCode }-> email not configured; code shown here
  //   emailVerified = true           -> unlock name / password / year / diploma
  const [emailVerified, setEmailVerified] = useState(false);
  const [otp, setOtp] = useState(null);
  const [code, setCode] = useState("");
  const [otpError, setOtpError] = useState("");

  // Start in register mode if the URL says ?mode=register. Sign-up starts with
  // blank email + password (the demo prefill is only for the login screen).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "register") { setMode("register"); setEmail(""); setPassword(""); }
  }, []);

  // Reset the verification flow (used when switching mode or changing email).
  function resetVerification() {
    setEmailVerified(false); setOtp(null); setCode(""); setOtpError("");
  }
  function switchMode(m) {
    setMode(m); setError(""); resetVerification();
    // Don't carry the demo login credentials into the sign-up form.
    if (m === "register") { setEmail(""); setPassword(""); }
  }

  // Login, or (register) create the account once the email is verified.
  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const data = mode === "login"
        ? await AuthAPI.login(email, password)
        : await AuthAPI.register({ name, email, password, yearLevel, diploma });
      login(data.user);
      router.push("/dashboard");
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  // Step 1: email a 6-digit code. If email isn't configured (503) fall back to
  // an on-screen demo code so the demo always works.
  async function sendVerification() {
    if (!email.includes("@")) { setOtpError("Enter a valid email first."); return; }
    setOtpError(""); setCode(""); setLoading(true);
    try {
      const { token } = await EmailOtpAPI.send(email);
      setOtp({ mode: "real", token });
    } catch (err) {
      if (err.status === 503) {
        setOtp({ mode: "demo", demoCode: String(Math.floor(100000 + Math.random() * 900000)) });
      } else { setOtpError(err.message); }
    } finally { setLoading(false); }
  }

  // Step 2: check the code -> unlock the rest of the sign-up form.
  async function verifyEmail() {
    setOtpError(""); setLoading(true);
    try {
      if (otp.mode === "real") await EmailOtpAPI.verify(email, code, otp.token);
      else if (code.trim() !== otp.demoCode) throw new Error("Incorrect code. Please check and try again.");
      setEmailVerified(true);
      setOtp(null); setCode("");
    } catch (err) { setOtpError(err.message); }
    finally { setLoading(false); }
  }

  // Quick-fill helpers so the demo is friction-free.
  function fillDemo(kind) {
    switchMode("login");
    if (kind === "admin") { setEmail("admin@rp.edu.sg"); setPassword("admin123"); }
    else { setEmail("alex@rp.edu.sg"); setPassword("password123"); }
  }

  const registering = mode === "register";
  const emailLocked = registering && (emailVerified || !!otp); // don't let them edit mid-verify

  return (
    <div className="auth-page" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <Link href="/" className="brand mb-24" style={{ justifyContent: "center", display: "flex", fontSize: 22 }}>
          <Logo size={38} />
        </Link>

        <Card>
          <h1 style={{ fontSize: 22, fontWeight: 750 }}>
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="muted small mt-8 mb-16">
            {mode === "login"
              ? "Log in to continue turning advice into action."
              : "Verify your email, then finish setting up your account."}
          </p>

          {error && <div className="banner mb-16" style={{ background: "var(--red-050)", color: "var(--red)", borderColor: "rgba(239,68,68,0.3)" }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            {/* ---- Email (always first) ---- */}
            <div className="field-group">
              <label className="field">Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@rp.edu.sg"
                autoComplete={registering ? "off" : "username"}
                required
                disabled={emailLocked}
              />

              {/* Verify-email button (register, before a code is sent) */}
              {registering && !emailVerified && !otp && (
                <Button type="button" size="sm" className="mt-8" onClick={sendVerification} disabled={loading}>
                  {loading ? "Sending…" : "Verify email"}
                </Button>
              )}

              {/* Verified badge */}
              {registering && emailVerified && (
                <p className="small mt-8" style={{ color: "var(--green)", fontWeight: 650 }}>
                  <CheckIcon size={14} /> Email verified
                  <button type="button" className="btn btn-sm btn-ghost" style={{ marginLeft: 8 }} onClick={resetVerification}>change</button>
                </p>
              )}
            </div>

            {/* ---- Code entry (register, code sent, not yet verified) ---- */}
            {registering && otp && !emailVerified && (
              <div className="field-group" style={{ padding: "12px", background: "var(--surface-2)", borderRadius: 12, border: "1px solid var(--border)" }}>
                {otp.mode === "demo" && (
                  <div className="banner mb-16" style={{ background: "var(--amber-050, #fef3c7)", color: "var(--amber, #b45309)", borderColor: "rgba(245,158,11,0.35)" }}>
                    Demo mode (email not configured) — your code is <strong style={{ letterSpacing: 2 }}>{otp.demoCode}</strong>
                  </div>
                )}
                {otpError && <div className="banner mb-16" style={{ background: "var(--red-050)", color: "var(--red)", borderColor: "rgba(239,68,68,0.3)" }}>{otpError}</div>}
                <label className="field">Enter the 6-digit code sent to your email</label>
                <input
                  className="input"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  inputMode="numeric"
                  autoFocus
                  style={{ letterSpacing: 6, textAlign: "center", fontSize: 20 }}
                />
                <div className="row gap-8 mt-8" style={{ flexWrap: "wrap" }}>
                  <Button type="button" variant="primary" size="sm" onClick={verifyEmail} disabled={loading || code.length < 6}>
                    {loading ? "Verifying…" : "Verify code"}
                  </Button>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={sendVerification} disabled={loading}>Resend</button>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={resetVerification}>Change email</button>
                </div>
              </div>
            )}

            {/* ---- Login: password directly ---- */}
            {mode === "login" && (
              <div className="field-group">
                <label className="field">Password</label>
                <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
              </div>
            )}

            {/* ---- Register: the rest of the form, only after the email is verified ---- */}
            {registering && emailVerified && (
              <>
                <div className="field-group">
                  <label className="field">Full name</label>
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alex Tan" required />
                </div>
                <div className="field-group">
                  <label className="field">Password</label>
                  <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Choose a password" autoComplete="new-password" required />
                </div>
                <div className="field-group">
                  <label className="field">Year level</label>
                  <div className="chip-row">
                    {YEARS.map((y) => (
                      <button type="button" key={y} className={"filter-chip" + (yearLevel === y ? " active" : "")} onClick={() => setYearLevel(y)}>{y}</button>
                    ))}
                  </div>
                </div>
                <div className="field-group">
                  <label className="field">Diploma</label>
                  <select className="select" value={diploma} onChange={(e) => setDiploma(e.target.value)}>
                    {DIPLOMAS.map((d) => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div className="field-group">
                  <label className="field">Role</label>
                  <input className="input" value="User" disabled />
                  <p className="small muted mt-8">New accounts are created as <strong>User</strong>. Admin access is granted by a moderator.</p>
                </div>
              </>
            )}

            {/* Submit — shown for login, or for register once the email is verified */}
            {(mode === "login" || emailVerified) && (
              <Button variant="primary" className="btn-block" type="submit" disabled={loading}>
                {loading ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
              </Button>
            )}
          </form>

          <div className="divider" />

          <div className="center small muted">
            {mode === "login" ? (
              <>New here? <button className="btn btn-sm btn-ghost" onClick={() => switchMode("register")}>Create an account</button></>
            ) : (
              <>Already have an account? <button className="btn btn-sm btn-ghost" onClick={() => switchMode("login")}>Log in</button></>
            )}
          </div>
        </Card>

        {/* Demo credentials — handy during the presentation */}
        <Card className="mt-16" style={{ background: "var(--surface-2)" }}>
          <div className="small" style={{ fontWeight: 700, marginBottom: 8 }}>Demo accounts</div>
          <div className="row gap-8" style={{ flexWrap: "wrap" }}>
            <Button size="sm" onClick={() => fillDemo("user")}>Student: alex@rp.edu.sg</Button>
            <Button size="sm" onClick={() => fillDemo("admin")}>Admin: admin@rp.edu.sg</Button>
          </div>
          <p className="small muted mt-8">Passwords: <code>password123</code> (student) &middot; <code>admin123</code> (admin)</p>
        </Card>
      </div>
    </div>
  );
}
