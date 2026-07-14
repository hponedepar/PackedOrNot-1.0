"use client";
import React from "react";
import Card from "./Card";
import Button from "./Button";
import { StatusBadge } from "./Badge";
import { CheckIcon, TargetIcon, CalendarIcon } from "@/lib/icons";

// A single habit card with a progress bar and quick actions.
// `onSchedule` (when given) shows an "Add to calendar" button.
export default function HabitCard({ habit, onComplete, onTogglePause, onDelete, onSchedule, fromAdvice }) {
  return (
    <Card hover>
      <div className="row" style={{ justifyContent: "space-between", gap: 10 }}>
        <div className="row gap-12">
          <div className="stat-icon" style={{ background: "var(--primary-050)", color: "var(--primary-600)", width: 40, height: 40 }}>
            <TargetIcon size={20} />
          </div>
          <div>
            <div className="card-title">{habit.name}</div>
            <div className="small muted">Frequency: {habit.frequency}</div>
          </div>
        </div>
        <StatusBadge status={habit.status} />
      </div>

      {fromAdvice && (
        <div className="small mt-8" style={{ color: "var(--violet)" }}>
          ★ Created from forum advice
        </div>
      )}

      <div className="mt-16 mb-8 row" style={{ justifyContent: "space-between" }}>
        <span className="small muted">Progress</span>
        <span className="small" style={{ fontWeight: 700 }}>{habit.progress}%</span>
      </div>
      <div className="progress"><span style={{ width: `${habit.progress}%` }} /></div>

      <div className="row gap-8 mt-16" style={{ flexWrap: "wrap" }}>
        {habit.status !== "completed" && (
          <Button size="sm" variant="success" onClick={() => onComplete && onComplete(habit)}>
            <CheckIcon size={15} /> Mark complete
          </Button>
        )}
        {habit.status !== "completed" && (
          <Button size="sm" onClick={() => onTogglePause && onTogglePause(habit)}>
            {habit.status === "paused" ? "Resume" : "Pause"}
          </Button>
        )}
        {onSchedule && (
          <Button size="sm" variant="primary" onClick={() => onSchedule(habit)}>
            <CalendarIcon size={15} /> Add to calendar
          </Button>
        )}
        <Button size="sm" variant="danger" onClick={() => onDelete && onDelete(habit)}>Delete</Button>
      </div>
    </Card>
  );
}
