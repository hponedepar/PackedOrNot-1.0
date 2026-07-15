"use client";
import React from "react";
import { CoinIcon } from "@/lib/icons";

// The celebration layer. Renders floating "+N coins" toasts (with a little
// scatter of coins) whenever a reward fires. The parent owns the list and clears
// each entry after the animation; this component is purely presentational so it
// can't leak timers. Fixed overlay, pointer-events off — never blocks clicks.
export default function RewardFx({ bursts }) {
  if (!bursts.length) return null;
  return (
    <div className="pg-fx" aria-live="polite">
      {bursts.map((b) => (
        <div key={b.id} className="pg-fx-burst">
          <div className="pg-fx-pill">
            <CoinIcon size={16} /> +{b.amount}
            {b.label && <span className="pg-fx-label">{b.label}</span>}
          </div>
          <div className="pg-fx-coins" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className={`pg-fx-coin c${i}`}>🪙</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
