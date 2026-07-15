import React from "react";
import Badge from "../Badge";
import { LockIcon } from "@/lib/icons";

// Achievement badges. Earned ones are full-colour with an unlock date; locked
// ones are muted with a small progress hint so the next goal is always clear.
// `highlightId` briefly shines a badge that was just unlocked this visit.
export default function BadgeGrid({ badges = [], highlightId = null }) {
  return (
    <div className="gm-badges">
      {badges.map((b) => (
        <div
          key={b.id}
          className={
            "gm-badge " + (b.earned ? "earned" : "locked") + (b.id === highlightId ? " gm-new" : "")
          }
        >
          {!b.earned && <span className="gm-badge-lock"><LockIcon size={15} /></span>}
          <div className="gm-badge-ico" aria-hidden="true">{b.icon}</div>
          <div className="gm-badge-title">{b.title}</div>
          <p className="gm-badge-desc">{b.description}</p>
          <div style={{ marginTop: 10 }}>
            {b.earned ? (
              <Badge color="green" dot>{b.unlockedAt ? `Unlocked ${b.unlockedAt}` : "Unlocked"}</Badge>
            ) : (
              <Badge color="gray">{b.hint || "Locked"}</Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
