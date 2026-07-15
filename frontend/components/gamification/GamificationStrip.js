"use client";
// Compact playground teaser for the main dashboard — kept deliberately minimal:
// just the study companion and a single Play button that leads into the
// Playground. Mood mirrors real momentum (studied today or not); the name +
// accessory come from the client-side playground state.
import React from "react";
import Link from "next/link";
import Card from "../Card";
import Companion from "./playground/Companion";
import { useAuth } from "@/lib/auth";
import { useGamification } from "./useGamification";
import { usePlayground, ACCESSORIES } from "@/lib/playground";
import { PlayIcon } from "@/lib/icons";

export default function GamificationStrip() {
  const { user } = useAuth();
  const { data } = useGamification(user);
  const { state: pg } = usePlayground(user);
  if (!data) return null;

  const mood = data.streak.studiedToday ? "happy" : "sleepy";
  const name = pg?.companion?.name || "Pip";
  const accessory = pg ? (ACCESSORIES.find((a) => a.id === pg.accessory)?.emoji || "") : "";

  return (
    <div className="mb-24">
      <Link href="/progress">
        <Card hover className="pg-dash">
          <div className="pg-dash-buddy"><Companion mood={mood} accessory={accessory} size={58} /></div>
          <div className="pg-dash-text">
            <div className="pg-dash-name">{name}, your study buddy</div>
            <div className="small muted">
              {data.streak.studiedToday ? "Nice work today — up for a quick round?" : "Ready for a quick round?"}
            </div>
          </div>
          <span className="btn btn-primary pg-dash-play"><PlayIcon size={16} /> Play</span>
        </Card>
      </Link>
    </div>
  );
}
