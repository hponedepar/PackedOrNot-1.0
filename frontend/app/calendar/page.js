"use client";
// Calendar Planner — Done by WK
//
// Shows scheduled habits + study plans on a calendar you can tick off.
// A view dropdown switches between the current week, the whole month, and
// the previous month.
//
// Everything is stored in Supabase: the page talks to CalendarAPI, which
// hits /api/calendar -> calendar.controller -> calendar.repo -> the
// calendar_tasks table. Loading = GET, ticking a task = PUT, adding = POST.
import React, { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import ApiErrorBanner from "@/components/ApiErrorBanner";
import { useAuth } from "@/lib/auth";
import { CalendarAPI } from "@/lib/api";
import { PlusIcon, CalendarIcon, ArrowRightIcon } from "@/lib/icons";

// ---- Small date helpers (no external libraries, keeps the app offline-safe) ----
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Format a Date as "YYYY-MM-DD" (matches the backend's date strings).
function toKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
// Monday of the week that contains `date`.
function mondayOf(date) {
  const d = new Date(date);
  const dow = (d.getDay() + 6) % 7; // Mon=0 ... Sun=6
  d.setDate(d.getDate() - dow);
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
function firstOfMonth(date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
function addMonths(date, n) { return new Date(date.getFullYear(), date.getMonth() + n, 1); }
// Readable week header like "1 Jul – 7 Jul 2026".
function weekLabel(start) {
  const end = addDays(start, 6);
  const opts = { day: "numeric", month: "short" };
  return `${start.toLocaleDateString("en-GB", opts)} – ${end.toLocaleDateString("en-GB", { ...opts, year: "numeric" })}`;
}

export default function CalendarPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", date: toKey(new Date()), time: "09:00" });

  // View state: "week" shows 7 days; "month" shows a whole month grid.
  const [view, setView] = useState("week");
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));   // anchor for week view
  const [monthCursor, setMonthCursor] = useState(() => firstOfMonth(new Date())); // anchor for month view

  // ---- Load all this user's tasks from Supabase ----
  async function load() {
    if (!user) return;
    setError("");
    try {
      const data = await CalendarAPI.list(user.id);
      setTasks(data);
      // On first load, jump the week to where the tasks actually are (demo-friendly).
      if (data.length > 0) {
        const earliest = data.map((t) => t.date).sort()[0];
        setWeekStart(mondayOf(new Date(earliest + "T00:00:00")));
      }
    } catch (err) { setError(err.message); }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [user]);

  // The dropdown under the title. Choosing a view also resets its anchor to
  // "today" so the user always lands somewhere sensible.
  function chooseView(value) {
    if (value === "week") { setView("week"); setWeekStart(mondayOf(new Date())); }
    else if (value === "month") { setView("month"); setMonthCursor(firstOfMonth(new Date())); }
    else if (value === "prevMonth") { setView("month"); setMonthCursor(addMonths(new Date(), -1)); }
  }

  // Build the day cells for whichever view is active.
  const cells = useMemo(() => {
    const todayKey = toKey(new Date());
    const dayCell = (date, inMonth = true) => ({
      key: toKey(date),
      name: DAY_NAMES[(date.getDay() + 6) % 7],
      num: date.getDate(),
      inMonth,
      isToday: toKey(date) === todayKey,
      tasks: tasks.filter((t) => t.date === toKey(date)),
    });

    if (view === "week") {
      return Array.from({ length: 7 }, (_, i) => dayCell(addDays(weekStart, i)));
    }
    // Month view: 6 rows x 7 days, starting from the Monday on/before the 1st.
    const start = mondayOf(firstOfMonth(monthCursor));
    return Array.from({ length: 42 }, (_, i) => {
      const date = addDays(start, i);
      return dayCell(date, date.getMonth() === monthCursor.getMonth());
    });
  }, [view, weekStart, monthCursor, tasks]);

  const headerLabel = view === "week"
    ? weekLabel(weekStart)
    : `${MONTHS[monthCursor.getMonth()]} ${monthCursor.getFullYear()}`;

  // Prev/next steps by a week or a month depending on the view.
  function step(dir) {
    if (view === "week") setWeekStart((w) => addDays(w, dir * 7));
    else setMonthCursor((m) => addMonths(m, dir));
  }

  // ---- Create / toggle / delete (all persist to Supabase) ----
  async function createTask(e) {
    e.preventDefault();
    try {
      await CalendarAPI.create({ userId: user.id, title: form.title, date: form.date, time: form.time });
      setShowCreate(false);
      setForm({ title: "", date: toKey(new Date()), time: "09:00" });
      load();
    } catch (err) { setError(err.message); }
  }
  async function toggle(task) {
    try {
      const updated = await CalendarAPI.update(task.id, { completed: !task.completed });
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err) { setError(err.message); }
  }

  return (
    <AppShell
      title="Calendar Planner"
      subtitle="Schedule your habits and study plans across the weeks and check them off."
      actions={<Button variant="primary" onClick={() => setShowCreate(true)}><PlusIcon size={16} /> Add task</Button>}
    >
      <ApiErrorBanner error={error} onRetry={load} />

      {/* View dropdown, right under the subtitle (Done by WK) */}
      <div className="row gap-8 mb-16" style={{ alignItems: "center" }}>
        <label className="small muted">View:</label>
        <select
          className="select"
          style={{ width: 180 }}
          value={view === "week" ? "week" : (monthCursor.getMonth() === new Date().getMonth() && monthCursor.getFullYear() === new Date().getFullYear() ? "month" : "prevMonth")}
          onChange={(e) => chooseView(e.target.value)}
        >
          <option value="week">This week</option>
          <option value="month">This month</option>
          <option value="prevMonth">Previous month</option>
        </select>
      </div>

      {/* Header + navigation */}
      <div className="row mb-16" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div className="row gap-8">
          <CalendarIcon size={18} />
          <span className="section-title" style={{ margin: 0 }}>{headerLabel}</span>
        </div>
        <div className="row gap-8">
          <Button size="sm" onClick={() => step(-1)}>← Prev</Button>
          <Button size="sm" onClick={() => chooseView(view === "week" ? "week" : "month")}>Today</Button>
          <Button size="sm" onClick={() => step(1)}>Next →</Button>
        </div>
      </div>

      {/* Legend so the two task colours are clear (WK) */}
      <div className="row gap-16 mb-16" style={{ flexWrap: "wrap" }}>
        <span className="row gap-8 small muted"><span className="cal-swatch plan" /> Study plans</span>
        <span className="row gap-8 small muted"><span className="cal-swatch habit" /> Habits</span>
        <span className="row gap-8 small muted"><span className="cal-swatch done" /> Done</span>
      </div>

      {/* The calendar grid (7 columns; 1 row for a week, up to 6 for a month) */}
      <div className={"cal-grid" + (view === "month" ? " month" : "")}>
        {cells.map((d) => (
          <div key={d.key} className={"cal-day" + (d.isToday ? " today" : "") + (d.inMonth ? "" : " outside")}>
            <div className="cal-daynum">
              <span>{view === "week" ? d.name : d.num}</span>
              <span>{view === "week" ? d.num : ""}</span>
            </div>
            {d.tasks.length === 0 && <span className="small muted">—</span>}
            {d.tasks.map((t) => (
              // Colour by source (WK): study-plan tasks are purple, habit tasks
              // are orange, plain tasks are neutral. Fixed colours (not the mode
              // theme) so study is always purple and habit always orange, in
              // both the study and habit calendars.
              <span
                key={t.id}
                className={"cal-chip" + (t.planId ? " plan" : t.habitId ? " habit" : "") + (t.completed ? " done" : "")}
                title={t.completed ? "Click to mark not done" : "Click to mark done"}
                onClick={() => toggle(t)}
              >
                {t.time} · {t.title}
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* Add-task modal */}
      <Modal open={showCreate} title="Add a calendar task" onClose={() => setShowCreate(false)}>
        <form onSubmit={createTask}>
          <div className="field-group">
            <label className="field">Task title</label>
            <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Revise data structures" />
          </div>
          <div className="grid grid-2" style={{ gap: 12 }}>
            <div className="field-group">
              <label className="field">Date</label>
              <input className="input" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="field-group">
              <label className="field">Time</label>
              <input className="input" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </div>
          </div>
          <Button variant="primary" className="btn-block" type="submit">Add to calendar <ArrowRightIcon size={15} /></Button>
        </form>
      </Modal>
    </AppShell>
  );
}
