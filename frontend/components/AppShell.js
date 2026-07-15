"use client";
// Wraps all logged-in pages with the navbar + sidebar, and guards the
// route: if nobody is logged in, send them to /login.
import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useMode } from "@/lib/mode";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { BookIcon, TargetIcon } from "@/lib/icons";

// Pages that only exist in one mode: switching away from their mode sends
// the user back to the dashboard instead of leaving them on a hidden page.
const STUDY_ONLY = ["/plans", "/timer", "/help"];
const HABIT_ONLY = ["/tracker"];

// Per-feature "highlighter" accents (same palette as the sidebar tiles).
// Drives the underline below the page title via the --accent CSS variable.
const ACCENTS = {
  "/dashboard": "#6366f1",
  "/progress": "#ca8a04",
  "/forum": "#0d9488",
  "/tracker": "#ea580c",
  "/plans": "#7c3aed",
  "/calendar": "#059669",
  "/timer": "#e11d48",
  "/help": "#d97706",
  "/admin": "#dc2626",
  "/settings": "#64748b",
};

export default function AppShell({ title, subtitle, actions, children, adminOnly = false }) {
  const { user, ready } = useAuth();
  const { mode, setMode } = useMode();
  const router = useRouter();
  const pathname = usePathname();

  function switchMode(next) {
    if (next === mode) return;
    setMode(next);
    const hidden = next === "habit" ? STUDY_ONLY : HABIT_ONLY;
    if (hidden.some((p) => pathname.startsWith(p))) router.push("/dashboard");
  }

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
    else if (adminOnly && user.role !== "admin") router.replace("/dashboard");
  }, [ready, user, adminOnly, router]);

  // While auth is resolving (or redirecting), show a light placeholder.
  if (!ready || !user || (adminOnly && user.role !== "admin")) {
    return (
      <div className="app-shell">
        <Navbar />
        <div className="main"><p className="muted">Loading…</p></div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Navbar />
      <div className="shell-body">
        <Sidebar />
        <main
          className="main"
          style={{ "--accent": ACCENTS[Object.keys(ACCENTS).find((k) => pathname.startsWith(k))] || "var(--primary)" }}
        >
          <div className="mode-switch" role="tablist" aria-label="App mode">
            <button
              role="tab"
              aria-selected={mode === "study"}
              className={"mode-btn" + (mode === "study" ? " active" : "")}
              onClick={() => switchMode("study")}
            >
              <BookIcon size={15} /> Study
            </button>
            <button
              role="tab"
              aria-selected={mode === "habit"}
              className={"mode-btn" + (mode === "habit" ? " active" : "")}
              onClick={() => switchMode("habit")}
            >
              <TargetIcon size={15} /> Habit
            </button>
          </div>
          <div className="page-head row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 className="page-title">{title}</h1>
              {subtitle && <p className="page-sub">{subtitle}</p>}
            </div>
            {actions && <div className="row gap-8">{actions}</div>}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
