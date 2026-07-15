import React from "react";
import Card from "../Card";
import { SparkIcon } from "@/lib/icons";

// AI motivation. The message is computed server-side from the student's own
// numbers (streak, XP-to-next-level, whether they studied today), so it always
// feels specific rather than generic. `compact` trims it for the dashboard.
export default function MotivationCard({ motivation, compact = false }) {
  if (!motivation) return null;
  return (
    <Card className="gm-motivation">
      <div className="row gap-12" style={{ alignItems: "flex-start" }}>
        <div className="stat-icon" style={{ width: 40, height: 40 }}><SparkIcon size={20} /></div>
        <div>
          <div className="small" style={{ fontWeight: 750, color: "var(--primary-700)", letterSpacing: ".01em" }}>
            {compact ? "Your AI coach" : motivation.title}
          </div>
          <p className={compact ? "small" : ""} style={{ marginTop: 4, fontWeight: 550 }}>
            {motivation.message}
          </p>
        </div>
      </div>
    </Card>
  );
}
