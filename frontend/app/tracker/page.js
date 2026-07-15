"use client";
// Habit Tracker — Done by ______  (habit-mode feature)
//
// Lists the user's habits and lets them: create a habit, mark it complete,
// pause / resume it, delete it, and schedule any habit onto the Calendar.
//
// How the data flows (the request path to explain in the demo):
//   this page  ->  lib/api.js (HabitsAPI / CalendarAPI)
//              ->  /api/habits  or  /api/calendar route
//              ->  controller  ->  repository  ->  Supabase (habits / calendar_tasks)
import React, { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import HabitCard from "@/components/HabitCard";
import ApiErrorBanner from "@/components/ApiErrorBanner";
import { useAuth } from "@/lib/auth";
import { HabitsAPI, CalendarAPI } from "@/lib/api";
import { PlusIcon, CalendarIcon } from "@/lib/icons";

const FREQUENCIES = ["Daily", "Weekdays", "Weekly", "3x per week", "Monthly"];
const FILTERS = ["All", "active", "completed", "paused"];
const todayKey = () => new Date().toISOString().slice(0, 10);

export default function TrackerPage() {
  const { user } = useAuth();
  const [habits, setHabits] = useState([]);
  const [filter, setFilter] = useState("All");        // which status to show
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", frequency: "Daily" });
  const [scheduleFor, setScheduleFor] = useState(null); // habit being added to the calendar
  const [calForm, setCalForm] = useState({ date: todayKey(), time: "09:00" });

  // Load this user's habits from Supabase.
  async function load() {
    if (!user) return;
    setError("");
    try { setHabits(await HabitsAPI.list(user.id)); }
    catch (err) { setError(err.message); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  function flash(msg) { setNotice(msg); setTimeout(() => setNotice(""), 3000); }

  // ---- Create a habit ----
  async function createHabit(e) {
    e.preventDefault();
    try {
      await HabitsAPI.create({ userId: user.id, name: form.name, frequency: form.frequency });
      setShowCreate(false);
      setForm({ name: "", frequency: "Daily" });
      load();
    } catch (err) { setError(err.message); }
  }

  // ---- Mark a habit complete (PUT status=completed) ----
  async function markComplete(habit) {
    try {
      const updated = await HabitsAPI.update(habit.id, { status: "completed" });
      setHabits((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
    } catch (err) { setError(err.message); }
  }

  // ---- Pause / resume a habit ----
  async function togglePause(habit) {
    const next = habit.status === "paused" ? "active" : "paused";
    try {
      const updated = await HabitsAPI.update(habit.id, { status: next });
      setHabits((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
    } catch (err) { setError(err.message); }
  }

  async function removeHabit(habit) {
    try {
      await HabitsAPI.remove(habit.id);
      setHabits((prev) => prev.filter((h) => h.id !== habit.id));
    } catch (err) { setError(err.message); }
  }

  // ---- Add a habit to the Calendar ----
  // Opens a date/time picker, then creates a calendar_task carrying habitId,
  // so the task is linked back to this habit (saved in Supabase).
  function openSchedule(habit) {
    setScheduleFor(habit);
    setCalForm({ date: todayKey(), time: "09:00" });
  }
  async function scheduleToCalendar(e) {
    e.preventDefault();
    try {
      await CalendarAPI.create({
        userId: user.id,
        habitId: scheduleFor.id,
        title: scheduleFor.name,
        date: calForm.date,
        time: calForm.time,
      });
      setScheduleFor(null);
      flash(`"${scheduleFor.name}" added to your calendar.`);
    } catch (err) { setError(err.message); }
  }

  const shown = filter === "All" ? habits : habits.filter((h) => h.status === filter);
  const counts = {
    active: habits.filter((h) => h.status === "active").length,
    completed: habits.filter((h) => h.status === "completed").length,
    paused: habits.filter((h) => h.status === "paused").length,
  };

  return (
    <AppShell
      title="Habit & Study Tracker"
      subtitle="Build habits from advice, set a frequency, and track your progress."
      actions={<Button variant="primary" onClick={() => setShowCreate(true)}><PlusIcon size={16} /> New habit</Button>}
    >
      <ApiErrorBanner error={error} onRetry={load} />
      {notice && <div className="banner mb-16" style={{ background: "var(--green-050)", color: "var(--green)", borderColor: "rgba(16,185,129,0.3)" }}>{notice}</div>}

      {/* Summary + filters */}
      <div className="grid grid-3 mb-24">
        <Card className="center"><div className="stat-value" style={{ color: "var(--primary)" }}>{counts.active}</div><div className="stat-label">Active</div></Card>
        <Card className="center"><div className="stat-value" style={{ color: "var(--green)" }}>{counts.completed}</div><div className="stat-label">Completed</div></Card>
        <Card className="center"><div className="stat-value" style={{ color: "var(--amber)" }}>{counts.paused}</div><div className="stat-label">Paused</div></Card>
      </div>

      <div className="chip-row mb-24">
        {FILTERS.map((f) => (
          <button key={f} className={"filter-chip" + (filter === f ? " active" : "")} onClick={() => setFilter(f)}>
            {f === "All" ? "All" : f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-2">
        {shown.length === 0 && <div className="empty">No habits here yet. Create one, or add advice from the forum.</div>}
        {shown.map((h) => (
          <HabitCard
            key={h.id}
            habit={h}
            fromAdvice={!!h.sourcePostId}
            onComplete={markComplete}
            onTogglePause={togglePause}
            onDelete={removeHabit}
            onSchedule={openSchedule}
          />
        ))}
      </div>

      <Modal open={showCreate} title="Create a habit or study plan" onClose={() => setShowCreate(false)}>
        <form onSubmit={createHabit}>
          <div className="field-group">
            <label className="field">Habit / plan name</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Revise for 30 minutes" />
          </div>
          <div className="field-group">
            <label className="field">Frequency</label>
            <select className="select" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
              {FREQUENCIES.map((f) => <option key={f}>{f}</option>)}
            </select>
          </div>
          <Button variant="primary" className="btn-block" type="submit">Add habit</Button>
        </form>
      </Modal>

      {/* Add-to-calendar modal: schedule this habit on a date + time */}
      <Modal open={!!scheduleFor} title={`Schedule "${scheduleFor?.name || ""}"`} onClose={() => setScheduleFor(null)}>
        <form onSubmit={scheduleToCalendar}>
          <div className="grid grid-2" style={{ gap: 12 }}>
            <div className="field-group">
              <label className="field">Date</label>
              <input className="input" type="date" required value={calForm.date} onChange={(e) => setCalForm({ ...calForm, date: e.target.value })} />
            </div>
            <div className="field-group">
              <label className="field">Time</label>
              <input className="input" type="time" value={calForm.time} onChange={(e) => setCalForm({ ...calForm, time: e.target.value })} />
            </div>
          </div>
          <Button variant="primary" className="btn-block" type="submit"><CalendarIcon size={15} /> Add to calendar</Button>
        </form>
      </Modal>
    </AppShell>
  );
}
