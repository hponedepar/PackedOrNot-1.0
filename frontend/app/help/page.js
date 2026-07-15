"use client";
// AI Study Help — search a course/module name and get recommended Cisco
// NetAcad modules with a reason for each, plus a one-click way to turn the
// recommendations into a study plan.
//
// BACKEND OWNER TODO:
//   Implement POST /api/help/recommend (see lib/api.js + TEAM_HANDOFF.md).
//   The Express endpoint should call the n8n webhook (which queries the AI /
//   NetAcad catalogue), cache the result in the `recommendations` table, and
//   return the same shape as DEMO_RESULTS below. Keep the cache as fallback
//   so the live demo never depends on n8n being up.
import React, { useState } from "react";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import ApiErrorBanner from "@/components/ApiErrorBanner";
import { useAuth } from "@/lib/auth";
import { HelpAPI, PlansAPI } from "@/lib/api";
import { SearchIcon, SparkIcon, ExternalIcon, PlusIcon, BookIcon, ClockIcon } from "@/lib/icons";

// Demo response mirroring what the backend returns (used only if the API is
// down). More than one card, because a real answer returns several.
const DEMO_RESULTS = {
  default: [
    {
      id: 1, module: "Networking Basics", provider: "Cisco Networking Academy",
      level: "Beginner", format: "Self-paced", hours: 22, match: 95, cost: "Free",
      url: "https://www.netacad.com/courses/networking-basics",
      description: "Start learning the basics of computer networking and discover how networks work.",
      reason: "A good beginner starting point if you are not sure where to begin.",
      topics: ["networking", "network", "ip address"],
    },
    {
      id: 8, module: "Operating Systems Basics", provider: "Cisco Networking Academy",
      level: "Beginner", format: "Self-paced", hours: 6, match: 78, cost: "Free",
      url: "https://www.netacad.com/courses/operating-systems-basics",
      description: "Understand what an operating system does, how it manages processes and memory.",
      reason: "A good beginner starting point if you are not sure where to begin.",
      topics: ["operating system", "process", "memory"],
    },
  ],
};

// Banner backgrounds for the course cards (NetAcad-style thumbnails,
// drawn with CSS so no external images are needed).
const BANNERS = [
  "linear-gradient(135deg, #0f2b46 0%, #12766f 100%)",
  "linear-gradient(135deg, #1e2a5a 0%, #4f46e5 100%)",
  "linear-gradient(135deg, #123b2f 0%, #16a34a 100%)",
  "linear-gradient(135deg, #3b2d5e 0%, #7c3aed 100%)",
];

export default function HelpPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function flash(msg) { setNotice(msg); setTimeout(() => setNotice(""), 3000); }

  async function search(e) {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setResults(null);
    try {
      const data = await HelpAPI.recommend(query);
      setResults(data);
      setDemoMode(false);
    } catch {
      // Backend unreachable — show demo data so the page still works.
      await new Promise((r) => setTimeout(r, 900));
      setResults(DEMO_RESULTS.default);
      setDemoMode(true);
    } finally {
      setLoading(false);
    }
  }

  // Turn a recommended course into a study plan, seeded with its topics as
  // tickable plan items so it isn't an empty plan.
  async function addAsPlan(rec) {
    try {
      await PlansAPI.create({
        userId: user.id,
        name: rec.module,
        module: rec.provider,
        message: rec.description,
        lessons: (rec.topics || []).map((t) => `Study: ${t}`),
      });
      flash(`Study plan created from "${rec.module}"`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <AppShell
      title="Study Help"
      subtitle="Tell us what you're struggling with — the AI finds the right Cisco NetAcad modules for it."
    >
      <ApiErrorBanner error={error} onRetry={search} />
      {notice && <div className="banner mb-16" style={{ background: "var(--green-050)", color: "var(--green)", borderColor: "rgba(16,185,129,0.3)" }}>{notice}</div>}

      {/* Search */}
      <Card className="mb-24">
        <form onSubmit={search} className="row gap-12" style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 14, top: 11, color: "var(--muted)" }}><SearchIcon size={18} /></span>
          <input
            className="input"
            style={{ paddingLeft: 40 }}
            placeholder="Type in the difficult module"
            aria-label="Type in the difficult module"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button variant="primary" type="submit" disabled={loading}>
            <SparkIcon size={16} /> {loading ? "Thinking…" : "Ask AI"}
          </Button>
        </form>
        <p className="small muted mt-8" style={{ marginBottom: 0 }}>
          Searches the Cisco Networking Academy catalogue used by RP, matching your words
          against each module&rsquo;s keywords. When the n8n workflow is connected it ranks the
          modules instead.
        </p>
      </Card>

      {/* Loading state */}
      {loading && (
        <Card className="center" style={{ padding: 40 }}>
          <div className="stat-icon mb-16" style={{ background: "var(--violet-050)", color: "var(--violet)", margin: "0 auto 12px" }}><SparkIcon size={22} /></div>
          <p className="muted">Checking the NetAcad catalogue for &ldquo;{query}&rdquo;…</p>
        </Card>
      )}

      {/* Results */}
      {results && !loading && (
        <>
          {demoMode && (
            <div className="banner mb-16" style={{ background: "var(--amber-050, #fef3c7)", color: "var(--amber, #b45309)", borderColor: "rgba(245,158,11,0.35)" }}>
              Demo data — <code>/api/help/recommend</code> (n8n webhook) isn&rsquo;t connected yet (see TEAM_HANDOFF.md).
            </div>
          )}

          {/* Nothing in the catalogue really answers this. Say so, instead of
              presenting an unrelated course as if it were a recommendation. */}
          {results[0]?.weak && (
            <div className="banner mb-16" style={{ background: "var(--amber-050, #fef3c7)", color: "var(--amber, #b45309)", borderColor: "rgba(245,158,11,0.35)" }}>
              No NetAcad module really covers &ldquo;{query}&rdquo;. Try naming the module or topic
              you&rsquo;re stuck on — for example <em>&ldquo;IP addresses&rdquo;</em>, <em>&ldquo;Linux commands&rdquo;</em> or
              <em> &ldquo;Python loops&rdquo;</em>. In the meantime, here&rsquo;s where most students start:
            </div>
          )}
          {/* NetAcad-style course cards */}
          <div className="nc-grid">
            {results.map((rec, i) => (
              <div className="nc-card" key={rec.id}>
                {/* Banner: the course's own image when the catalogue has one,
                    otherwise the CSS thumbnail. Plus level + match badges. */}
                <div
                  className="nc-banner"
                  style={rec.image
                    ? { backgroundImage: `url(${rec.image})`, backgroundSize: "cover", backgroundPosition: "center" }
                    : { background: BANNERS[i % BANNERS.length] }}
                >
                  {!rec.image && <SparkIcon size={36} />}
                  <span className="nc-level">{rec.level || "Beginner"}</span>
                  <span className="nc-match">{rec.match}% match</span>
                </div>

                <div className="nc-body">
                  <div className="nc-provider">{rec.provider}</div>
                  <div className="nc-meta"><BookIcon size={14} /> Course&nbsp; | &nbsp;{rec.format || "Self-paced"}</div>
                  <div className="nc-title">{rec.module}</div>
                  <p className="nc-desc">{rec.description}</p>
                  <div className="nc-why"><strong>Why this course:</strong> {rec.reason}</div>

                  <div className="nc-foot">
                    <span className="row gap-8"><ClockIcon size={14} /> {rec.hours ? `${rec.hours} Hours` : "Self-paced"}</span>
                    <span style={{ color: "var(--green)", fontWeight: 700 }}>{rec.cost || "Free"}</span>
                  </div>

                  <div className="row gap-8 mt-8" style={{ flexWrap: "wrap" }}>
                    <a href={rec.url} target="_blank" rel="noreferrer" className="grow"
                      aria-label={`Open ${rec.module} on NetAcad (opens in a new tab)`}>
                      <Button variant="primary" size="sm" className="btn-block"><ExternalIcon size={15} /> Open on NetAcad</Button>
                    </a>
                    <Button size="sm" onClick={() => addAsPlan(rec)}
                      aria-label={`Create a study plan from ${rec.module}`}>
                      <PlusIcon size={15} /> Study plan
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Empty state before first search */}
      {!results && !loading && (
        <div className="empty">
          Ask something like <em>&ldquo;I don&rsquo;t know where to start with Operating Systems&rdquo;</em> —
          you&rsquo;ll get recommended modules, why they fit, and a one-click study plan.
        </div>
      )}
    </AppShell>
  );
}
