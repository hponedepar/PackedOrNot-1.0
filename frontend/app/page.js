"use client";
import React from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { BookIcon, BookmarkIcon, TargetIcon, CalendarIcon, TrackerIcon, ArrowRightIcon } from "@/lib/icons";

// The five steps of the core NextStep flow. This "flow rail" is the
// product's signature visual and repeats on the dashboard.
const flow = [
  { icon: BookIcon, title: "Read advice", desc: "Browse real tips from other students." },
  { icon: BookmarkIcon, title: "Save solution", desc: "Keep the advice that fits you." },
  { icon: TargetIcon, title: "Create plan", desc: "Turn it into a habit or study goal." },
  { icon: CalendarIcon, title: "Add to calendar", desc: "Schedule it with a date and time." },
  { icon: TrackerIcon, title: "Track progress", desc: "Mark it done and watch it grow." },
];

export default function LandingPage() {
  return (
    <div>
      <Navbar />

      {/* Hero */}
      <section className="container" style={{ padding: "72px 24px 40px", textAlign: "center" }}>
        <span className="badge badge-blue mb-16" style={{ margin: "0 auto 16px" }}>
          For Republic Polytechnic students
        </span>
        <h1 style={{ fontSize: 46, fontWeight: 800, lineHeight: 1.1, maxWidth: 760, margin: "0 auto", letterSpacing: "-0.02em" }}>
          Turn student advice into <span style={{ color: "var(--primary)" }}>real action plans</span>.
        </h1>
        <p className="muted mt-16" style={{ fontSize: 18, maxWidth: 620, margin: "16px auto 0" }}>
          NextStep combines a Reddit-style advice forum, a habit &amp; study tracker,
          and a calendar planner — so good advice actually turns into progress.
        </p>
        <div className="row gap-12 mt-24" style={{ justifyContent: "center" }}>
          <Link href="/login?mode=register"><Button variant="primary">Get started <ArrowRightIcon size={16} /></Button></Link>
          <Link href="/login"><Button>Login</Button></Link>
        </div>
      </section>

      {/* Core flow rail (signature element) */}
      <section className="container" style={{ paddingBottom: 24 }}>
        <Card>
          <div className="center mb-16">
            <h2 className="section-title" style={{ marginBottom: 4 }}>What you can do with NextStep</h2>
            <p className="muted small">Everything you need to move forward, in one app.</p>
          </div>
          <div className="flow-rail">
            {flow.map((s) => (
              <div className="flow-step" key={s.title}>
                <div className="fico"><s.icon size={22} /></div>
                <h4>{s.title}</h4>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* Call to action */}
      <section className="container" style={{ padding: "24px 24px 56px" }}>
        <Card className="center" style={{ background: "linear-gradient(135deg, var(--primary-050), var(--violet-050))", border: "none" }}>
          <h2 style={{ fontSize: 24, fontWeight: 750 }}>Ready to take your next step?</h2>
          <p className="muted mt-8">Create an account and start turning advice into action.</p>
          <div className="row gap-12 mt-16" style={{ justifyContent: "center" }}>
            <Link href="/login?mode=register"><Button variant="primary">Get started</Button></Link>
            <Link href="/login"><Button>I already have an account</Button></Link>
          </div>
        </Card>
      </section>

      <footer className="container center muted small" style={{ padding: "24px", borderTop: "1px solid var(--border)" }}>
        NextStep &middot; C270 DevOps Essentials midpoint prototype &middot; Republic Polytechnic
      </footer>
    </div>
  );
}
