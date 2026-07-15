"use client";
import React, { useState } from "react";
import Card from "@/components/Card";
import { CoinIcon } from "@/lib/icons";

// The once-a-day mystery box. A satisfying "open" moment: the box shakes, then
// bursts into a coin payout. Available again tomorrow (the daily state rolls
// over at midnight in lib/playground). Coins are the reward for showing up.
export default function DailyRewardCard({ claimed, onOpen }) {
  const [opening, setOpening] = useState(false);
  const [payout, setPayout] = useState(null);

  function open() {
    if (opening || claimed) return;
    setOpening(true);
    // Brief shake before revealing, so the reveal feels earned.
    setTimeout(() => {
      const amount = onOpen();
      setPayout(amount);
      setOpening(false);
    }, 620);
  }

  const opened = claimed || payout != null;

  return (
    <Card className="pg-reward center">
      <div className="pg-reward-cap small">Daily reward</div>
      <button
        className={"pg-box" + (opening ? " shaking" : "") + (opened ? " opened" : "")}
        onClick={open}
        disabled={opened}
        aria-label={opened ? "Daily reward already claimed" : "Open daily reward"}
      >
        <span className="pg-box-emoji">{opened ? "✨" : "🎁"}</span>
      </button>
      {opened ? (
        payout != null ? (
          <div className="pg-reward-won"><CoinIcon size={16} /> +{payout} coins!</div>
        ) : (
          <div className="small muted">Claimed — come back tomorrow!</div>
        )
      ) : (
        <div className="small muted">{opening ? "Opening…" : "Tap to open today's box"}</div>
      )}
    </Card>
  );
}
