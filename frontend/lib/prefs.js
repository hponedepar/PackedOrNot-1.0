"use client";
// Local user preferences for the prototype, stored under one localStorage
// key. Real persistence moves to the backend later (users table / a new
// preferences table) — the shape below is the contract.
const KEY = "nextstep_prefs";

export const PREF_DEFAULTS = {
  // Appearance
  theme: "Light",
  fontSize: "Medium",
  language: "English",
  // Focus timer
  timerDefault: 25,
  // Privacy
  postAnonymously: false,
  hideYearLevel: false,
  activityStatus: true,
  analyticsOptOut: false,
  // Notifications
  notifPush: true,
  notifEmail: false,
  notifInApp: true,
  evReplies: true,
  evUpvotes: true,
  evReminders: true,
  evDigest: false,
  quietFrom: "22:00",
  quietTo: "07:00",
  // Security
  loginAlerts: true,
};

export function readPrefs() {
  try { return { ...PREF_DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; }
  catch { return { ...PREF_DEFAULTS }; }
}

export function writePrefs(patch) {
  const next = { ...readPrefs(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  return next;
}
