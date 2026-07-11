"use client";
// Done by Zheng_Xian
// Admin moderation panel: stats, user management, pending posts, reports, admin requests.
import React, { useEffect, useRef, useState } from "react";
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
  const [users, setUsers] = useState([]);          // NEW: user management
  const [loading, setLoading] = useState(true);    // NEW: loading state
  const [busyId, setBusyId] = useState(null);      // NEW: blocks double-clicks per item
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const noticeTimer = useRef(null);                // NEW: so we can clear the flash timeout

  
  // Load everything the moderation screen needs in parallel.
  // NOTE: every AdminAPI route must ALSO verify the admin role on the
  // backend — this page only hides the UI, it does not secure the API.
  async function load() {
    setError("");
    setLoading(true);
    try {
      const [s, p, r, q, u] = await Promise.all([
        AdminAPI.stats(),
        AdminAPI.pendingPosts(),
        AdminAPI.reports(),
        AdminAPI.requests(),
        AdminAPI.users(), // NEW: backend route needed, e.g. GET /admin/users
      ]);
      setStats(s);
      setPending(p);
      setReports(r);
      setRequests(q);
      setUsers(u);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    load();
    // Cleanup: clear any pending flash timeout if the user leaves the page,
    // so we never call setNotice on an unmounted component.
    return () => clearTimeout(noticeTimer.current);
  }, []);

  function flash(msg) {
    setNotice(msg);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 2500);
  }

  // Refresh only the stat counters after an action (cheaper than reloading everything).
  async function refreshStats() {
    try { setStats(await AdminAPI.stats()); } catch { /* non-critical */ }
  }

  // Wraps an action so the clicked item is disabled while the request runs.
  async function withBusy(id, fn) {
    if (busyId) return; // a request is already in flight
    setBusyId(id);
    try { await fn(); }
    catch (err) { setError(err.message); }
    finally { setBusyId(null); }
  }

  // ---- Pending post moderation (Done by Zheng_Xian) ----
  // On success we remove the item from local state instead of refetching
  // all five endpoints — faster and no screen flicker.
  function approvePost(post) {
    withBusy(post.id, async () => {
      await AdminAPI.approvePost(post.id);
      setPending((prev) => prev.filter((p) => p.id !== post.id));
      flash(`Approved: "${post.title}"`);
      refreshStats();
    });
  }
  function rejectPost(post) {
    withBusy(post.id, async () => {
      await AdminAPI.rejectPost(post.id);
      setPending((prev) => prev.filter((p) => p.id !== post.id));
      flash(`Rejected: "${post.title}"`);
      refreshStats();
    });
  }

  // ---- Reported content (Done by Zheng_Xian) ----
  function resolveReport(report) {
    withBusy(report.id, async () => {
      await AdminAPI.resolveReport(report.id);
      setReports((prev) =>
        prev.map((r) => (r.id === report.id ? { ...r, status: "resolved" } : r))
      );
      flash("Report resolved.");
    });
  }

  // ---- Admin access requests (Done by Zheng_Xian) ----
  function approveRequest(req) {
    withBusy(req.id, async () => {
      await AdminAPI.approveRequest(req.id);
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
      flash(`${req.name} is now an admin.`);
    });
  }
  function rejectRequest(req) {
    withBusy(req.id, async () => {
      await AdminAPI.rejectRequest(req.id);
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
      flash(`Request from ${req.name} rejected.`);
    });
  }

  // ---- User management (Done by Zheng_Xian) ----
  // Backend routes needed: POST /admin/users/:id/ban (toggles is_banned)
  // and DELETE /admin/users/:id. Both must check the caller is an admin.
  function toggleBan(user) {
    withBusy(user.id, async () => {
      await AdminAPI.toggleBan(user.id);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isBanned: !u.isBanned } : u))
      );
      flash(user.isBanned ? `${user.name} unbanned.` : `${user.name} banned.`);
    });
  }
  function deleteUser(user) {
    // Native confirm() is fine for a school project; a modal would be nicer.
    if (!window.confirm(`Delete ${user.name}? This cannot be undone.`)) return;
    withBusy(user.id, async () => {
      await AdminAPI.deleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      flash(`${user.name} deleted.`);
      refreshStats();
    });
  }

  const openReports = reports.filter((r) => r.status === "open");
  const pendingRequests = requests.filter((r) => r.status === "pending");

  return (
    <AppShell
      adminOnly
      title="Admin Moderation"
      subtitle="Approve student posts, handle reports, manage users, and review admin-access requests."
    >
      <ApiErrorBanner error={error} onRetry={load} />
      {notice && (
        <div
          className="banner mb-24"
          style={{ background: "var(--green-050)", color: "var(--green)", borderColor: "rgba(16,185,129,0.3)" }}
        >
          {notice}
        </div>
      )}

      {/* Loading state: shown instead of the panels so we never flash
          fake "nothing to review" messages while data is still fetching. */}
      {loading ? (
        <Card>
          <span className="muted">Loading admin data…</span>
        </Card>
      ) : (
        <>
          {/* Dashboard statistics */}
          <div className="grid grid-4 mb-24">
            <DashboardStatCard icon={UsersIcon} value={stats ? stats.totalUsers : "—"} label="Total users" tone="blue" />
            <DashboardStatCard icon={ForumIcon} value={stats ? stats.approvedPosts : "—"} label="Approved posts" tone="green" />
            <DashboardStatCard icon={ChatIcon} value={stats ? stats.totalComments : "—"} label="Comments" tone="violet" />
            <DashboardStatCard icon={TargetIcon} value={stats ? stats.totalHabits : "—"} label="Habits created" tone="amber" />
          </div>

          {/* User management (Done by Zheng_Xian) */}
          <div className="section-title">
            User management {users.length > 0 && <Badge color="blue">{users.length}</Badge>}
          </div>
          {users.length === 0 && <Card><span className="muted">No users found.</span></Card>}
          <div className="grid mb-24" style={{ gap: 12 }}>
            {users.map((user) => (
              <Card key={user.id}>
                <div className="row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <div>
                    <div className="row gap-8">
                      <strong style={{ fontSize: 14 }}>{user.name}</strong>
                      {user.role === "admin" && <Badge color="violet">admin</Badge>}
                      {user.isBanned && <Badge color="red">banned</Badge>}
                    </div>
                    <div className="small muted">
                      {user.email} · joined {user.joinedAt}
                    </div>
                  </div>
                  <div className="row gap-8">
                    <Button
                      size="sm"
                      variant={user.isBanned ? "success" : "danger"}
                      disabled={busyId === user.id}
                      onClick={() => toggleBan(user)}
                    >
                      {user.isBanned ? "Unban" : "Ban"}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={busyId === user.id}
                      onClick={() => deleteUser(user)}
                    >
                      <XIcon size={15} /> Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="grid grid-2" style={{ alignItems: "start", gap: 20 }}>
            {/* Pending posts */}
            <div>
              <div className="section-title">
                Pending posts {pending.length > 0 && <Badge color="amber">{pending.length}</Badge>}
              </div>
              {pending.length === 0 && <Card><span className="muted">Nothing waiting for review.</span></Card>}
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
                      <Button size="sm" variant="success" disabled={busyId === post.id} onClick={() => approvePost(post)}>
                        <CheckIcon size={15} /> Approve
                      </Button>
                      <Button size="sm" variant="danger" disabled={busyId === post.id} onClick={() => rejectPost(post)}>
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
                    <Button size="sm" variant="success" disabled={busyId === r.id} onClick={() => resolveReport(r)}>
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
                      <Button size="sm" variant="success" disabled={busyId === req.id} onClick={() => approveRequest(req)}>
                        <CheckIcon size={15} /> Grant admin
                      </Button>
                      <Button size="sm" variant="danger" disabled={busyId === req.id} onClick={() => rejectRequest(req)}>
                        <XIcon size={15} /> Reject
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}