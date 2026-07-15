import React from "react";
import { CheckIcon } from "@/lib/icons";

// The long-term arc: which growth stage the student's level places them in.
// Reuses the landing page's signature "flow rail" so it feels native. Reached
// stages are solid, the current one wears the brand gradient, upcoming ones
// are faded — a clear picture of how far they've come and where they're headed.
export default function GrowthJourney({ journey = [] }) {
  return (
    <div className="flow-rail gm-journey">
      {journey.map((s, i) => (
        <div key={s.name} className={"flow-step" + (s.reached ? " reached" : "") + (s.current ? " current" : "")}>
          <span className="step-num">{i + 1}</span>
          <div className="fico">{s.reached ? <CheckIcon size={20} /> : <span style={{ fontWeight: 800 }}>{i + 1}</span>}</div>
          <h4>{s.name}</h4>
          <p>{s.current ? "You are here" : s.reached ? "Achieved" : "Upcoming"}</p>
        </div>
      ))}
    </div>
  );
}
