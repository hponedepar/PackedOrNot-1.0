import React from "react";

// Pip — the study companion. A friendly rounded creature drawn in pure SVG so
// it themes with the brand gradient (purple study / orange habit) and needs no
// image assets. It gently floats and blinks; its expression reacts to the
// student's real momentum (see moodFor() in CompanionStage). An optional
// accessory emoji sits on its head. Everything animates via CSS classes defined
// in globals.css, and all motion is disabled under prefers-reduced-motion.
//
// moods: "happy" | "excited" | "proud" | "sleepy"
export default function Companion({ mood = "happy", accessory = "", size = 150 }) {
  const excited = mood === "excited";
  const sleepy = mood === "sleepy";
  const proud = mood === "proud";

  return (
    <div className="pg-companion" style={{ width: size, height: size }}>
      <div className="pg-companion-float">
        <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={`Study companion looking ${mood}`}>
          <defs>
            <linearGradient id="pg-body" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--primary)" />
              <stop offset="100%" stopColor="var(--violet)" />
            </linearGradient>
          </defs>

          {/* soft shadow */}
          <ellipse className="pg-shadow" cx="60" cy="108" rx="30" ry="6" fill="rgba(23,25,60,.14)" />

          {/* ears */}
          <path d="M30 40 Q26 14 44 30 Z" fill="url(#pg-body)" />
          <path d="M90 40 Q94 14 76 30 Z" fill="url(#pg-body)" />
          <path d="M33 36 Q31 22 42 31 Z" fill="rgba(255,255,255,.45)" />
          <path d="M87 36 Q89 22 78 31 Z" fill="rgba(255,255,255,.45)" />

          {/* body */}
          <rect x="20" y="30" width="80" height="72" rx="34" fill="url(#pg-body)" />
          {/* belly */}
          <ellipse cx="60" cy="70" rx="26" ry="28" fill="rgba(255,255,255,.9)" />

          {/* cheeks */}
          <circle cx="40" cy="66" r="6" fill="rgba(251,113,133,.55)" />
          <circle cx="80" cy="66" r="6" fill="rgba(251,113,133,.55)" />

          {/* eyes — closed arcs when sleepy, sparkly when excited */}
          {sleepy ? (
            <>
              <path d="M42 58 Q47 63 52 58" stroke="var(--primary-700)" strokeWidth="2.6" fill="none" strokeLinecap="round" />
              <path d="M68 58 Q73 63 78 58" stroke="var(--primary-700)" strokeWidth="2.6" fill="none" strokeLinecap="round" />
            </>
          ) : (
            <>
              <circle className="pg-eye" cx="47" cy="58" r="5.4" fill="#1b2033" />
              <circle className="pg-eye" cx="73" cy="58" r="5.4" fill="#1b2033" />
              <circle cx="49" cy="56" r="1.7" fill="#fff" />
              <circle cx="75" cy="56" r="1.7" fill="#fff" />
            </>
          )}

          {/* mouth */}
          {excited ? (
            <ellipse cx="60" cy="74" rx="7" ry="8" fill="#e11d48" />
          ) : proud ? (
            <path d="M50 72 Q60 82 70 72" stroke="#1b2033" strokeWidth="3" fill="none" strokeLinecap="round" />
          ) : (
            <path d="M52 73 Q60 80 68 73" stroke="#1b2033" strokeWidth="3" fill="none" strokeLinecap="round" />
          )}

          {/* sleepy 'z', excited sparkles */}
          {sleepy && <text x="92" y="34" fontSize="12" fill="var(--primary-600)" className="pg-zzz">z</text>}
          {excited && (
            <>
              <path className="pg-spark" d="M96 44 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" fill="var(--amber)" />
              <path className="pg-spark pg-spark-2" d="M20 50 l1.4 3.5 3.5 1.4 -3.5 1.4 -1.4 3.5 -1.4 -3.5 -3.5 -1.4 3.5 -1.4 Z" fill="var(--violet)" />
            </>
          )}
        </svg>

        {accessory && (
          <div className="pg-accessory" aria-hidden="true" style={{ fontSize: size * 0.24, top: size * 0.02 }}>
            {accessory}
          </div>
        )}
      </div>
    </div>
  );
}
