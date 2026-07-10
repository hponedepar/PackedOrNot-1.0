"use client";
// Settings and Privacy — one page per section, opened from the sidebar
// dropdown. Sections: account, privacy, notifications, appearance,
// security, about.
//
// What's REAL vs DEMO in this prototype:
//   real — app mode switch, focus-timer default, log out, download-my-data
//          (assembles your rows from the live API into a JSON file),
//          all toggles persist locally via lib/prefs.js
//   demo — profile save, change password, connected accounts, blocked
//          users, sessions, delete account (flash a notice; backend later)
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import { useAuth } from "@/lib/auth";
import { useMode } from "@/lib/mode";
import { PREF_DEFAULTS, readPrefs, writePrefs } from "@/lib/prefs";
import { HabitsAPI, CalendarAPI, PostsAPI } from "@/lib/api";
import { BookIcon, TargetIcon, LogoutIcon, ExternalIcon } from "@/lib/icons";

const SECTIONS = {
  account: { title: "Account", sub: "Your profile, password and account controls." },
  privacy: { title: "Privacy", sub: "Control what others see and what the app keeps." },
  notifications: { title: "Notifications", sub: "Choose what NextStep tells you about, and when." },
  appearance: { title: "Appearance", sub: "Make the app look the way you like." },
  security: { title: "Security", sub: "Sessions, alerts and keeping your account safe." },
  about: { title: "About & Support", sub: "App info, policies and getting help." },
};

// ---- small building blocks ------------------------------------------------

function Toggle({ on, onChange, label }) {
  return (
    <button
      type="button" role="switch" aria-checked={on} aria-label={label}
      className={"switch" + (on ? " on" : "")}
      onClick={() => onChange(!on)}
    />
  );
}

function Row({ title, desc, children }) {
  return (
    <div className="settings-row">
      <div>
        <div className="small" style={{ fontWeight: 650 }}>{title}</div>
        {desc && <div className="small muted">{desc}</div>}
      </div>
      {children}
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div className="settings-section">
      <div className="settings-label">{label}</div>
      {children}
    </div>
  );
}

// ---- page ------------------------------------------------------------------

export default function SettingsSectionPage() {
  const params = useParams();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { mode, setMode } = useMode();

  const section = SECTIONS[params.section] ? params.section : "account";
  const meta = SECTIONS[section];

  const [prefs, setPrefs] = useState(PREF_DEFAULTS);
  const [notice, setNotice] = useState("");
  const [profile, setProfile] = useState({ name: "", email: "", yearLevel: "", diploma: "" });
  const [blocked, setBlocked] = useState(["Jordan Lim"]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => { setPrefs(readPrefs()); }, []);
  useEffect(() => {
    if (user) setProfile({ name: user.name, email: user.email, yearLevel: user.yearLevel, diploma: user.diploma });
  }, [user]);

  function update(patch) { setPrefs(writePrefs(patch)); }
  function flash(msg) { setNotice(msg); setTimeout(() => setNotice(""), 3000); }
  function demo(what) { flash(`${what} — demo for now, wired to the backend later.`); }

  function handleLogout() { logout(); router.replace("/login"); }

  // Real: assemble this user's rows from the live API into a JSON download.
  async function downloadMyData() {
    try {
      const [habits, tasks, posts] = await Promise.all([
        HabitsAPI.list(user.id), CalendarAPI.list(user.id), PostsAPI.list(),
      ]);
      const payload = {
        exportedAt: new Date().toISOString(),
        user,
        habits,
        calendarTasks: tasks,
        forumPosts: posts.filter((p) => p.userId === user.id),
        preferences: readPrefs(),
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "nextstep-my-data.json";
      a.click();
      URL.revokeObjectURL(a.href);
      flash("Your data export was downloaded as nextstep-my-data.json.");
    } catch (err) {
      flash("Could not export data: " + err.message);
    }
  }

  return (
    <AppShell title="Settings and Privacy" subtitle={meta.sub}>
      {/* Section chips — quick switching without the sidebar */}
      <div className="chip-row mb-24">
        {Object.entries(SECTIONS).map(([slug, s]) => (
          <Link key={slug} href={`/settings/${slug}`} className={"filter-chip" + (slug === section ? " active" : "")}>
            {s.title}
          </Link>
        ))}
      </div>

      {notice && <div className="banner mb-16" style={{ background: "var(--green-050)", color: "var(--green)", borderColor: "rgba(5,150,105,0.3)" }}>{notice}</div>}

      <Card style={{ maxWidth: 720 }}>
        {/* ================= ACCOUNT ================= */}
        {section === "account" && (
          <>
            <Section label="Profile">
              <div className="grid grid-2" style={{ gap: 12 }}>
                <div className="field-group" style={{ marginBottom: 0 }}>
                  <label className="field">Full name</label>
                  <input className="input" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
                </div>
                <div className="field-group" style={{ marginBottom: 0 }}>
                  <label className="field">Email</label>
                  <input className="input" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
                </div>
                <div className="field-group" style={{ marginBottom: 0 }}>
                  <label className="field">Year level</label>
                  <select className="select" value={profile.yearLevel} onChange={(e) => setProfile({ ...profile, yearLevel: e.target.value })}>
                    {["Year 1", "Year 2", "Year 3"].map((y) => <option key={y}>{y}</option>)}
                  </select>
                </div>
                <div className="field-group" style={{ marginBottom: 0 }}>
                  <label className="field">Diploma</label>
                  <input className="input" value={profile.diploma} onChange={(e) => setProfile({ ...profile, diploma: e.target.value })} />
                </div>
              </div>
              <Button variant="primary" size="sm" className="mt-16" onClick={() => demo("Profile update")}>Save profile</Button>
            </Section>

            <Section label="Change password">
              <div className="grid grid-2" style={{ gap: 12 }}>
                <input className="input" type="password" placeholder="Current password" />
                <div />
                <input className="input" type="password" placeholder="New password" />
                <input className="input" type="password" placeholder="Confirm new password" />
              </div>
              <Button size="sm" className="mt-16" onClick={() => demo("Password change")}>Update password</Button>
            </Section>

            <Section label="Connected accounts">
              <Row title="Google" desc="Sign in with your RP Google account."><Button size="sm" onClick={() => demo("Google linking")}>Connect</Button></Row>
              <Row title="Apple" desc="Sign in with your Apple ID."><Button size="sm" onClick={() => demo("Apple linking")}>Connect</Button></Row>
            </Section>

            <Section label="Session">
              <Row title={user?.name || "You"} desc="Signed in on this device.">
                <Button size="sm" variant="danger" onClick={handleLogout}><LogoutIcon size={15} /> Log out</Button>
              </Row>
            </Section>

            <Section label="Danger zone">
              <Row title="Deactivate account" desc="Temporarily hide your profile and posts.">
                <Button size="sm" onClick={() => demo("Deactivation")}>Deactivate</Button>
              </Row>
              <Row title="Delete account" desc="Permanently removes your account and data.">
                <Button size="sm" variant="danger" onClick={() => setConfirmDelete(true)}>Delete…</Button>
              </Row>
            </Section>
          </>
        )}

        {/* ================= PRIVACY ================= */}
        {section === "privacy" && (
          <>
            <Section label="Visibility">
              <Row title="Post to forum anonymously" desc={'Your posts show as "RP Student" instead of your name.'}>
                <Toggle on={prefs.postAnonymously} onChange={(v) => update({ postAnonymously: v })} label="Post anonymously" />
              </Row>
              <Row title="Hide my year level" desc="Removes the year badge from your posts and comments.">
                <Toggle on={prefs.hideYearLevel} onChange={(v) => update({ hideYearLevel: v })} label="Hide year level" />
              </Row>
              <Row title="Activity status" desc="Let others see when you're online.">
                <Toggle on={prefs.activityStatus} onChange={(v) => update({ activityStatus: v })} label="Activity status" />
              </Row>
            </Section>

            <Section label="Blocked users">
              {blocked.length === 0 && <p className="muted small">You haven&rsquo;t blocked anyone.</p>}
              {blocked.map((name) => (
                <Row key={name} title={name} desc="Can't see your posts or comment on them.">
                  <Button size="sm" onClick={() => { setBlocked((b) => b.filter((n) => n !== name)); flash(`${name} unblocked.`); }}>Unblock</Button>
                </Row>
              ))}
            </Section>

            <Section label="Your data">
              <Row title="Download my data" desc="Get a JSON copy of your habits, plans, posts and preferences.">
                <Button size="sm" variant="primary" onClick={downloadMyData}>Download</Button>
              </Row>
              <Row title="Clear search history" desc="Removes your forum search history on this device.">
                <Button size="sm" onClick={() => flash("Search history cleared.")}>Clear</Button>
              </Row>
              <Row title="Opt out of analytics" desc="Stop sharing anonymous usage statistics.">
                <Toggle on={prefs.analyticsOptOut} onChange={(v) => update({ analyticsOptOut: v })} label="Opt out of analytics" />
              </Row>
            </Section>
          </>
        )}

        {/* ================= NOTIFICATIONS ================= */}
        {section === "notifications" && (
          <>
            <Section label="Channels">
              <Row title="Push notifications" desc="On this device."><Toggle on={prefs.notifPush} onChange={(v) => update({ notifPush: v })} label="Push" /></Row>
              <Row title="Email" desc={user?.email}><Toggle on={prefs.notifEmail} onChange={(v) => update({ notifEmail: v })} label="Email" /></Row>
              <Row title="In-app" desc="Banners inside NextStep."><Toggle on={prefs.notifInApp} onChange={(v) => update({ notifInApp: v })} label="In-app" /></Row>
            </Section>

            <Section label="Tell me about">
              <Row title="Replies to my posts"><Toggle on={prefs.evReplies} onChange={(v) => update({ evReplies: v })} label="Replies" /></Row>
              <Row title="Upvotes on my advice"><Toggle on={prefs.evUpvotes} onChange={(v) => update({ evUpvotes: v })} label="Upvotes" /></Row>
              <Row title="Study & habit reminders"><Toggle on={prefs.evReminders} onChange={(v) => update({ evReminders: v })} label="Reminders" /></Row>
              <Row title="Weekly progress digest"><Toggle on={prefs.evDigest} onChange={(v) => update({ evDigest: v })} label="Weekly digest" /></Row>
            </Section>

            <Section label="Quiet hours">
              <Row title="Don't notify me between" desc="Reminders wait until quiet hours end.">
                <div className="row gap-8">
                  <select className="select" style={{ width: 96 }} value={prefs.quietFrom} onChange={(e) => update({ quietFrom: e.target.value })}>
                    {["20:00", "21:00", "22:00", "23:00", "00:00"].map((t) => <option key={t}>{t}</option>)}
                  </select>
                  <span className="small muted">to</span>
                  <select className="select" style={{ width: 96 }} value={prefs.quietTo} onChange={(e) => update({ quietTo: e.target.value })}>
                    {["06:00", "07:00", "08:00", "09:00"].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </Row>
            </Section>
          </>
        )}

        {/* ================= APPEARANCE ================= */}
        {section === "appearance" && (
          <>
            <Section label="Theme">
              <Row title="App mode" desc="Study is purple with study tools; Habit is warm orange.">
                <div className="mode-switch" style={{ margin: 0 }}>
                  <button className={"mode-btn" + (mode === "study" ? " active" : "")} onClick={() => setMode("study")}><BookIcon size={14} /> Study</button>
                  <button className={"mode-btn" + (mode === "habit" ? " active" : "")} onClick={() => setMode("habit")}><TargetIcon size={14} /> Habit</button>
                </div>
              </Row>
              <Row title="Colour scheme" desc="Dark mode is on the roadmap.">
                <select className="select" style={{ width: 130 }} value={prefs.theme} onChange={(e) => { update({ theme: e.target.value }); if (e.target.value !== "Light") demo("Dark mode"); }}>
                  {["Light", "Dark", "System"].map((t) => <option key={t}>{t}</option>)}
                </select>
              </Row>
            </Section>

            <Section label="Reading">
              <Row title="Font size">
                <div className="chip-row">
                  {["Small", "Medium", "Large"].map((s) => (
                    <button key={s} className={"filter-chip" + (prefs.fontSize === s ? " active" : "")} onClick={() => update({ fontSize: s })}>{s}</button>
                  ))}
                </div>
              </Row>
              <Row title="Language">
                <select className="select" style={{ width: 150 }} value={prefs.language} onChange={(e) => { update({ language: e.target.value }); if (e.target.value !== "English") demo("Translation"); }}>
                  {["English", "中文", "Bahasa Melayu", "தமிழ்"].map((l) => <option key={l}>{l}</option>)}
                </select>
              </Row>
            </Section>

            <Section label="Focus timer">
              <Row title="Default session length" desc="Used when the timer page opens.">
                <select className="select" style={{ width: 110 }} value={prefs.timerDefault} onChange={(e) => update({ timerDefault: Number(e.target.value) })}>
                  {[15, 25, 45, 60].map((m) => <option key={m} value={m}>{m} min</option>)}
                </select>
              </Row>
            </Section>
          </>
        )}

        {/* ================= SECURITY ================= */}
        {section === "security" && (
          <>
            <Section label="Active sessions">
              <Row title="This device" desc="Windows · Chrome · Singapore · active now">
                <span className="badge badge-green"><span className="dot" /> Current</span>
              </Row>
              <Row title="iPhone 13" desc="Safari · Singapore · 2 days ago">
                <Button size="sm" onClick={() => demo("Remote session logout")}>Log out</Button>
              </Row>
              <Row title="Log out of all devices" desc="Ends every session, including this one.">
                <Button size="sm" variant="danger" onClick={handleLogout}>Log out all</Button>
              </Row>
            </Section>

            <Section label="Alerts">
              <Row title="Login alerts" desc="Email me when a new device signs in.">
                <Toggle on={prefs.loginAlerts} onChange={(v) => update({ loginAlerts: v })} label="Login alerts" />
              </Row>
              <Row title="Two-factor authentication" desc="Extra code at login. Planned with the JWT upgrade.">
                <Button size="sm" onClick={() => demo("Two-factor setup")}>Set up</Button>
              </Row>
            </Section>
          </>
        )}

        {/* ================= ABOUT ================= */}
        {section === "about" && (
          <>
            <Section label="App">
              <Row title="Version" desc="NextStep 1.0.0 — C270 DevOps Essentials CA2 prototype" />
              <Row title="What's new" desc="Study/Habit modes, study plans, focus timer, AI study help.">
                <Button size="sm" onClick={() => demo("Changelog")}>View</Button>
              </Row>
            </Section>

            <Section label="Legal">
              <Row title="Terms of Service"><Button size="sm" onClick={() => demo("Terms page")}><ExternalIcon size={14} /> Open</Button></Row>
              <Row title="Privacy Policy"><Button size="sm" onClick={() => demo("Privacy policy page")}><ExternalIcon size={14} /> Open</Button></Row>
              <Row title="Open-source licenses"><Button size="sm" onClick={() => demo("Licenses page")}><ExternalIcon size={14} /> Open</Button></Row>
            </Section>

            <Section label="Support">
              <Row title="Help centre" desc="Guides for every feature."><Button size="sm" onClick={() => demo("Help centre")}>Open</Button></Row>
              <Row title="Report a problem" desc="Found a bug? Tell the team."><Button size="sm" onClick={() => demo("Bug report form")}>Report</Button></Row>
            </Section>
          </>
        )}
      </Card>

      {/* Delete-account confirmation */}
      <Modal open={confirmDelete} title="Delete your account?" onClose={() => setConfirmDelete(false)}>
        <p className="small muted mb-16">
          This would permanently remove your account, habits, plans and posts.
          There is no undo.
        </p>
        <div className="row gap-8">
          <Button variant="danger" className="grow" onClick={() => { setConfirmDelete(false); demo("Account deletion"); }}>Yes, delete everything</Button>
          <Button className="grow" onClick={() => setConfirmDelete(false)}>Cancel</Button>
        </div>
      </Modal>
    </AppShell>
  );
}
