// Small inline SVG icon set (no external icon library needed, so nothing
// extra to install and it works offline). Each icon takes an optional size.
import React from "react";

const base = (size = 20) => ({
  width: size, height: size, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round",
});

export const HomeIcon = (p) => (
  <svg {...base(p.size)}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>
);
export const ForumIcon = (p) => (
  <svg {...base(p.size)}><path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.5 9.3 9.3 0 0 1-4-.9L3 21l1.9-5.5a8.4 8.4 0 0 1-.9-4A8.5 8.5 0 1 1 21 11.5Z" /></svg>
);
export const TrackerIcon = (p) => (
  <svg {...base(p.size)}><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
);
export const CalendarIcon = (p) => (
  <svg {...base(p.size)}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
);
export const ShieldIcon = (p) => (
  <svg {...base(p.size)}><path d="M12 3l7 3v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3Z" /><path d="M9 12l2 2 4-4" /></svg>
);
export const UpIcon = (p) => (
  <svg {...base(p.size)}><path d="M12 19V5M6 11l6-6 6 6" /></svg>
);
export const DownIcon = (p) => (
  <svg {...base(p.size)}><path d="M12 5v14M6 13l6 6 6-6" /></svg>
);
export const PlusIcon = (p) => (
  <svg {...base(p.size)}><path d="M12 5v14M5 12h14" /></svg>
);
export const SearchIcon = (p) => (
  <svg {...base(p.size)}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
);
export const CheckIcon = (p) => (
  <svg {...base(p.size)}><path d="M20 6 9 17l-5-5" /></svg>
);
export const XIcon = (p) => (
  <svg {...base(p.size)}><path d="M18 6 6 18M6 6l12 12" /></svg>
);
export const FlagIcon = (p) => (
  <svg {...base(p.size)}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1Z" /><path d="M4 22v-7" /></svg>
);
export const BookIcon = (p) => (
  <svg {...base(p.size)}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></svg>
);
export const BookmarkIcon = (p) => (
  <svg {...base(p.size)}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z" /></svg>
);
export const TargetIcon = (p) => (
  <svg {...base(p.size)}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></svg>
);
export const ClockIcon = (p) => (
  <svg {...base(p.size)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
export const UsersIcon = (p) => (
  <svg {...base(p.size)}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9" /><path d="M16 3.1A4 4 0 0 1 16 11" /></svg>
);
export const LogoutIcon = (p) => (
  <svg {...base(p.size)}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></svg>
);
export const ArrowRightIcon = (p) => (
  <svg {...base(p.size)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const ChatIcon = (p) => (
  <svg {...base(p.size)}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" /></svg>
);
export const ThumbUpIcon = (p) => (
  <svg {...base(p.size)}><path d="M7 10v11" /><path d="M4 10h3v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z" /><path d="M7 10l4-7a2 2 0 0 1 3 2l-1 5h5a2 2 0 0 1 2 2.4l-1.4 7A2 2 0 0 1 18.6 21H7Z" /></svg>
);
export const ThumbDownIcon = (p) => (
  <svg {...base(p.size)}><path d="M17 14V3" /><path d="M20 14h-3V3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1Z" /><path d="M17 14l-4 7a2 2 0 0 1-3-2l1-5H6a2 2 0 0 1-2-2.4l1.4-7A2 2 0 0 1 7.4 3H17Z" /></svg>
);
export const ReplyIcon = (p) => (
  <svg {...base(p.size)}><path d="M9 17l-5-5 5-5" /><path d="M4 12h11a5 5 0 0 1 5 5v1" /></svg>
);
export const PlayIcon = (p) => (
  <svg {...base(p.size)}><path d="M6 4l14 8-14 8Z" /></svg>
);
export const PauseIcon = (p) => (
  <svg {...base(p.size)}><path d="M8 5v14M16 5v14" /></svg>
);
export const SparkIcon = (p) => (
  <svg {...base(p.size)}><path d="M12 2l1.9 5.8L20 9.7l-5 3.9 1.7 6.1L12 16l-4.7 3.7L9 13.6l-5-3.9 6.1-1.9Z" /></svg>
);
export const ChevronDownIcon = (p) => (
  <svg {...base(p.size)}><path d="M6 9l6 6 6-6" /></svg>
);
export const SettingsIcon = (p) => (
  <svg {...base(p.size)}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.09a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.09a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z" /></svg>
);
export const ExternalIcon = (p) => (
  <svg {...base(p.size)}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><path d="M15 3h6v6" /><path d="M10 14 21 3" /></svg>
);
export const TrophyIcon = (p) => (
  <svg {...base(p.size)}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0Z" /><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" /></svg>
);
export const FlameIcon = (p) => (
  <svg {...base(p.size)}><path d="M12 2s5 4 5 9a5 5 0 0 1-10 0c0-1.5.6-2.8 1.3-3.8C9 8.5 12 8 12 6c0 1.5 1.2 2.3 2 3" /><path d="M12 22a4 4 0 0 0 4-4c0-2-2-3-4-6-2 3-4 4-4 6a4 4 0 0 0 4 4Z" /></svg>
);
export const ZapIcon = (p) => (
  <svg {...base(p.size)}><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" /></svg>
);
export const StarIcon = (p) => (
  <svg {...base(p.size)}><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.9 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9L12 2.5Z" /></svg>
);
export const LockIcon = (p) => (
  <svg {...base(p.size)}><rect x="4.5" y="11" width="15" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
);
export const CoinIcon = (p) => (
  <svg {...base(p.size)}><circle cx="12" cy="12" r="9" /><path d="M12 7.5v9M9.5 9.5h3.2a1.8 1.8 0 0 1 0 3.6H9.8h3.1a1.8 1.8 0 0 1 0 3.6H9.5" /></svg>
);
export const GiftIcon = (p) => (
  <svg {...base(p.size)}><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /><path d="M12 8S10.5 3 8 3a2.5 2.5 0 0 0 0 5h4Zm0 0s1.5-5 4-5a2.5 2.5 0 0 1 0 5h-4Z" /></svg>
);
export const PuzzleIcon = (p) => (
  <svg {...base(p.size)}><path d="M9 3a2 2 0 0 1 4 0c0 .7-.3 1.3-.8 1.7.4.2.8.5.8 1.3v1h1a2 2 0 1 1 0 4h-1v3a2 2 0 0 1-2 2h-3v-1c0-.7-.6-1.3-1.5-1.3S5 15.3 5 16v1H4a2 2 0 0 1-2-2v-3H1a2 2 0 1 1 0-4h1V5a2 2 0 0 1 2-2h3c0-.4.2-.8.5-1.1" /></svg>
);
export const HeartIcon = (p) => (
  <svg {...base(p.size)}><path d="M12 20.5S3.5 15 3.5 8.9A4.4 4.4 0 0 1 12 6a4.4 4.4 0 0 1 8.5 2.9C20.5 15 12 20.5 12 20.5Z" /></svg>
);
export const GamepadIcon = (p) => (
  <svg {...base(p.size)}><path d="M7 8h10a5 5 0 0 1 5 5 3 3 0 0 1-5.3 1.9L15 13H9l-1.7 1.9A3 3 0 0 1 2 13a5 5 0 0 1 5-5Z" /><path d="M7 11v2M6 12h2M15 11h.01M17.5 12.5h.01" /></svg>
);
