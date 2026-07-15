import React from "react";
import Card from "../Card";
import { FlameIcon } from "@/lib/icons";

// Daily study streak. The flame gently flickers while a streak is alive; when
// today isn't done yet we show an encouraging (never pushy) nudge.
export default function StreakCard({ streak }) {
  const { current, best, studiedToday } = streak;
  const alive = current > 0;

  return (
    <Card className="gm-streak">
      <div className={"gm-flame" + (alive ? " gm-flame-anim" : "")} style={{ opacity: alive ? 1 : 0.4 }}>
        <FlameIcon size={40} />
      </div>
      <div className="gm-streak-num">{current}</div>
      <div className="small muted" style={{ fontWeight: 650, marginBottom: 10 }}>
        day{current === 1 ? "" : "s"} in a row
      </div>
      <p className="small" style={{ color: studiedToday ? "var(--green)" : "var(--muted)" }}>
        {studiedToday
          ? "Studied today — streak secured. Nice."
          : alive
            ? `One study session keeps your ${current}-day streak alive.`
            : "Complete a study task today to start a streak."}
      </p>
      {best > current && (
        <div className="small muted" style={{ marginTop: 8 }}>Longest streak: {best} days</div>
      )}
    </Card>
  );
}
