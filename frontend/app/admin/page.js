"use client";
import React, { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Badge, { StatusBadge } from "@/components/Badge";
import DashboardStatCard from "@/components/DashboardStatCard";
import ApiErrorBanner from "@/components/ApiErrorBanner";
import { AdminAPI } from "@/lib/api";
import {
  UsersIcon, ForumIcon, ChatIcon, TargetIcon,
  CheckIcon, XIcon, FlagIcon, ShieldIcon,
} from "@/lib/icons";

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [reports, setReports] = useState([]);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Load everything the moderation screen needs in parallel.
  async function load() {
    setError("");
    try {
      const [s, p, r, q] = await Promise.all([
        AdminAPI.stats(),
        AdminAPI.pendingPosts(),
        AdminAPI.reports(),
        AdminAPI.requests(),
      ]);
      setStats(s);
      setPending(p);
      setReports(r);
      setRequests(q);
    } catch (err) {
      setError(err.message);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  function flash(msg) {
    setNotice(msg);
    setTimeout(() => setNotice(""), 2500);
  }

  // ---- Pending post moderation ----
  async function approvePost(post) {
    try { await AdminAPI.approvePost(post.id); flash(`Approved: "${post.title}"`); load(); }
    catch (err) { setError(err.message); }
  }
  async function rejectPost(post) {
    try { await AdminAPI.rejectPost(post.id); flash(`Rejected: "${post.title}"`); load(); }
    catch (err) { setError(err.message); }
  }

  // ---- Reported content ----
  async function resolveReport(report) {
    try { await AdminAPI.resolveReport(report.id); flash("Report resolved."); load(); }
    catch (err) { setError(err.message); }
  }

  // ---- Admin access requests ----
  async function approveRequest(req) {
    try { await AdminAPI.approveRequest(req.id); flash(`${req.name} is now an admin.`); load(); }
    catch (err) { setError(err.message); }
  }
  async function rejectRequest(req) {
    try { await AdminAPI.rejectRequest(req.id); flash(`Request from ${req.name} rejected.`); load(); }
    catch (err) { setError(err.message); }
  }

  const openReports = reports.filter((r) => r.status === "open");
  const pendingRequests = requests.filter((r) => r.status === "pending");

  return (
    <AppShell
      adminOnly
      title="Admin Moderation"
      subtitle="Approve student posts, handle reports, and review admin-access requests."
    >
      <ApiErrorBanner error={error} onRetry={load} />
      {notice && <div className="banner mb-24" style={{ background: "var(--green-050)", color: "var(--green)", borderColor: "rgba(16,185,129,0.3)" }}>{notice}</div>}

      {/* Dashboard statistics */}
      <div className="grid grid-4 mb-24">
        <DashboardStatCard icon={UsersIcon} value={stats ? stats.totalUsers : "—"} label="Total users" tone="blue" />
        <DashboardStatCard icon={ForumIcon} value={stats ? stats.approvedPosts : "—"} label="Approved posts" tone="green" />
        <DashboardStatCard icon={ChatIcon} value={stats ? stats.totalComments : "—"} label="Comments" tone="violet" />
        <DashboardStatCard icon={TargetIcon} value={stats ? stats.totalHabits : "—"} label="Habits created" tone="amber" />
      </div>

      <div className="grid grid-2" style={{ alignItems: "start", gap: 20 }}>
        {/* Pending posts */}
        <div>
          <div className="section-title">
            Pending posts {pending.length > 0 && <Badge color="amber">{pending.length}</Badge>}
          </div>
          {pending.length === 0 && <Card><span className="muted">Nothing waiting for review. </span></Card>}
          <div className="grid" style={{ gap: 12 }}>
            {pending.map((post) => (
              <Card key={post.id}>
                <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
                  <div className="card-title">{post.title}</div>
                  <StatusBadge status={post.status} />
                </div>
                <div className="small muted mb-8">
                  {post.category} · by {post.author} ({post.authorYear})
                </div>
                <p className="mb-16" style={{ fontSize: 14 }}>{post.content}</p>
                <div className="row gap-8">
                  <Button size="sm" variant="success" onClick={() => approvePost(post)}>
                    <CheckIcon size={15} /> Approve
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => rejectPost(post)}>
                    <XIcon size={15} /> Reject
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Reports + requests */}
        <div>
          <div className="section-title">
            Reported content {openReports.length > 0 && <Badge color="red">{openReports.length}</Badge>}
          </div>
          {openReports.length === 0 && <Card><span className="muted">No open reports.</span></Card>}
          <div className="grid mb-24" style={{ gap: 12 }}>
            {openReports.map((r) => (
              <Card key={r.id}>
                <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
                  <div className="row gap-8"><FlagIcon size={16} /> <strong style={{ fontSize: 14 }}>{r.postTitle}</strong></div>
                  <StatusBadge status={r.status} />
                </div>
                <div className="small muted mb-8">Reported by {r.reportedBy}</div>
                <p className="mb-16" style={{ fontSize: 14 }}>{r.reason}</p>
                <Button size="sm" variant="success" onClick={() => resolveReport(r)}>
                  <CheckIcon size={15} /> Mark resolved
                </Button>
              </Card>
            ))}
          </div>

          <div className="section-title">
            Admin requests {pendingRequests.length > 0 && <Badge color="violet">{pendingRequests.length}</Badge>}
          </div>
          {pendingRequests.length === 0 && <Card><span className="muted">No pending requests.</span></Card>}
          <div className="grid" style={{ gap: 12 }}>
            {pendingRequests.map((req) => (
              <Card key={req.id}>
                <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
                  <div className="row gap-8"><ShieldIcon size={16} /> <strong style={{ fontSize: 14 }}>{req.name}</strong></div>
                  <StatusBadge status={req.status} />
                </div>
                <p className="mb-16" style={{ fontSize: 14 }}>{req.reason}</p>
                <div className="row gap-8">
                  <Button size="sm" variant="success" onClick={() => approveRequest(req)}>
                    <CheckIcon size={15} /> Grant admin
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => rejectRequest(req)}>
                    <XIcon size={15} /> Reject
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
