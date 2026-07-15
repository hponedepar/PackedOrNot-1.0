"use client";
import React from "react";
import Card from "@/components/Card";
import { CoinIcon, CheckIcon } from "@/lib/icons";

// Today's rotating challenges. `auto` challenges light up from real activity
// (studied today, played a quiz, opened the reward…); `self` challenges are
// honest habit nudges the student ticks off. Either way, a completed challenge
// shows a Claim button that drops its coins into the wallet with a celebration.
export default function ChallengesCard({ challenges, realStats, daily, onClaim }) {
  const claimedCount = daily.claimed.length;

  return (
    <Card className="pg-challenges">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
        <h2 className="card-title">Today&apos;s challenges</h2>
        <span className="badge badge-violet">{claimedCount}/{challenges.length} done</span>
      </div>

      <ul className="pg-challenge-list">
        {challenges.map((ch) => {
          const claimed = daily.claimed.includes(ch.id);
          const satisfied = ch.type === "auto" ? ch.check(realStats, daily) : true;
          // auto challenges are "done" only once claimed; the coin is the reward
          // for the real action they represent.
          const ready = satisfied && !claimed;

          return (
            <li key={ch.id} className={"pg-challenge" + (claimed ? " done" : "")}>
              <span className="pg-challenge-ico" aria-hidden="true">{ch.icon}</span>
              <span className="pg-challenge-label">{ch.label}</span>
              <span className="pg-challenge-reward small"><CoinIcon size={13} /> {ch.coins}</span>
              {claimed ? (
                <span className="pg-challenge-check" aria-label="Completed"><CheckIcon size={16} /></span>
              ) : ready ? (
                <button className="btn btn-primary btn-sm pg-claim" onClick={() => onClaim(ch)}>
                  {ch.type === "self" ? "Done" : "Claim"}
                </button>
              ) : (
                <span className="small muted pg-challenge-todo">Not yet</span>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
