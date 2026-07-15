"use client";
import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import Logo from "@/components/Logo";

// Initials for the avatar circle, e.g. "Alex Tan" -> "AT".
function initials(name = "") {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "U";
}

// The top header.
//
// `isPublic` marks the pages anyone can reach without logging in (the landing
// page, Login and Sign Up). On those pages we NEVER render account details,
// even if a previous session is still sitting in localStorage — otherwise you
// get somebody's name and avatar on the login screen. The account block is
// gated on auth state here in the component, not hidden with CSS, so the
// markup simply isn't produced. (Khaing Khant Zaw)
export default function Navbar({ isPublic = false }) {
  const { user, ready } = useAuth();

  // Only a signed-in user on a private page may see their own account.
  const showAccount = !isPublic && ready && Boolean(user);

  return (
    <header className="navbar">
      <Link href={showAccount ? "/dashboard" : "/"} className="brand" aria-label="NextStep home">
        <Logo />
      </Link>

      {showAccount ? (
        <div className="row gap-16">
          <div className="row gap-8 small muted" style={{ textAlign: "right" }}>
            <div>
              <div style={{ fontWeight: 700, color: "var(--text)" }}>{user.name}</div>
              <div>{user.yearLevel} &middot; {user.role === "admin" ? "Admin" : "User"}</div>
            </div>
          </div>
          {/* Log out moved into Settings and Privacy (sidebar). */}
          <div className="avatar" aria-hidden="true">{initials(user.name)}</div>
        </div>
      ) : (
        // Public header: the logo plus the two ways in. No account, ever.
        <div className="row gap-8">
          <Link href="/login" className="btn btn-sm">Login</Link>
          <Link href="/login?mode=register" className="btn btn-sm btn-primary">Get started</Link>
        </div>
      )}
    </header>
  );
}
