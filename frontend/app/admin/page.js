"use client";
// Done by Zheng_Xian
// Admin moderation panel: stats, user management,
// pending posts, reports, admin requests.
import React, { useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Badge, { StatusBadge } from "@/components/Badge";
import DashboardStatCard from "@/components/DashboardStatCard";
import ApiErrorBanner from "@/components/ApiErrorBanner";
import { AdminAPI } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  UsersIcon, ForumIcon, ChatIcon, TargetIcon,
  CheckIcon, XIcon, FlagIcon, ShieldIcon,
} from "@/lib/icons";

export default function AdminPage() {
  const { user: me } = useAuth();   // the logged-in admin (for isSelf + self-action guards)
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [reports, setReports] = useState([]);
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [userQuery, setUserQuery] = useState("");       // NEW: search/filter users
  const [openStat, setOpenStat] = useState(null);        // NEW: which stat card's detail is open
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const noticeTimer = useRef(null);

  // Done by Zheng_Xian
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
        AdminAPI.users(me?.id),
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

  // Load once the logged-in admin (me) is known, so the users call includes
  // ?me=<id> and each row gets the correct isSelf flag. Waiting for me?.id
  // also avoids a double-fetch race (a stale no-me response overwriting it).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!me?.id) return;
    load();
    // Cleanup: clear any pending flash timeout if the user leaves the page,
    // so we never call setNotice on an unmounted component.
    return () => clearTimeout(noticeTimer.current);
  }, [me?.id]);

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
  // all endpoints — faster and no screen flicker.
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
      await AdminAPI.toggleBan(user.id, me?.id);
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
      await AdminAPI.deleteUser(user.id, me?.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      flash(`${user.name} deleted.`);
      refreshStats();
    });
  }

  // ---- Promote / demote (Done by Zheng_Xian) ----
  // Backend route needed: PATCH /admin/users/:id/role  { role: "admin" | "user" }
  // The backend MUST refuse to change the caller's OWN role — otherwise an
  // admin could demote themselves and lock everyone out of this panel.
  // GET /admin/users should also return isSelf: true on the caller's row,
  // so we can hide the button in the UI (see JSX below).
  function toggleRole(user) {
    const promoting = user.role !== "admin";
    if (!promoting && !window.confirm(`Remove admin rights from ${user.name}?`)) return;
    withBusy(user.id, async () => {
      await AdminAPI.setRole(user.id, promoting ? "admin" : "user", me?.id);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, role: promoting ? "admin" : "user" } : u
        )
      );
      flash(promoting ? `${user.name} is now an admin.` : `${user.name} is no longer an admin.`);
    });
  }

  const openReports = reports.filter((r) => r.status === "open");
  const pendingRequests = requests.filter((r) => r.status === "pending");

  // Search/filter users (Done by Zheng_Xian) — client-side only, since we
  // already load the whole user list. Matches name or email, case-insensitive.
  const q = userQuery.trim().toLowerCase();
  const visibleUsers = q
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      )
    : users;

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
          {/* Dashboard statistics (Done by Zheng_Xian) — each card is
              clickable and toggles a small breakdown card underneath.
              All numbers are computed from data this page already loads,
              so no extra API calls are needed. */}
          <div className={openStat ? "grid grid-4 mb-8" : "grid grid-4 mb-24"}>
            {[
              { key: "users",    icon: UsersIcon,  value: stats ? stats.totalUsers    : "—", label: "Total users",    tone: "blue"   },
              { key: "posts",    icon: ForumIcon,  value: stats ? stats.approvedPosts : "—", label: "Approved posts", tone: "green"  },
              { key: "comments", icon: ChatIcon,   value: stats ? stats.totalComments : "—", label: "Comments",       tone: "violet" },
              { key: "habits",   icon: TargetIcon, value: stats ? stats.totalHabits   : "—", label: "Habits created", tone: "amber"  },
            ].map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setOpenStat(openStat === s.key ? null : s.key)}
                aria-expanded={openStat === s.key}
                title="Click for details"
                style={{
                  // Reset button styles so the card looks unchanged
                  background: "none",
                  border: "none",
                  padding: 0,
                  textAlign: "left",
                  width: "100%",
                  cursor: "pointer",
                  // Subtle pressed look on the open card
                  opacity: openStat && openStat !== s.key ? 0.6 : 1,
                }}
              >
                <DashboardStatCard icon={s.icon} value={s.value} label={s.label} tone={s.tone} />
              </button>
            ))}
          </div>

          {/* Stat detail card (Done by Zheng_Xian) — small breakdown for
              whichever stat is selected. Click the same card again to close. */}
          {openStat && (
            <Card className="mb-24">
              {openStat === "users" && (
                <div className="small">
                  <strong>User breakdown</strong>
                  <div className="muted" style={{ marginTop: 6 }}>
                    {users.filter((u) => u.role === "admin").length} admin(s) ·{" "}
                    {users.filter((u) => u.isBanned).length} banned ·{" "}
                    {users.filter((u) => !u.isBanned).length} active
                  </div>
                  <div className="row gap-8" style={{ marginTop: 8, flexWrap: "wrap" }}>
                    {users.filter((u) => u.role === "admin").map((u) => (
                      <Badge key={u.id} color="violet">{u.name}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {openStat === "posts" && (
                <div className="small">
                  <strong>Post breakdown</strong>
                  <div className="muted" style={{ marginTop: 6 }}>
                    {stats ? stats.approvedPosts : 0} approved ·{" "}
                    {pending.length} waiting for review ·{" "}
                    {openReports.length} open report(s)
                  </div>
                  {pending.length > 0 && (
                    <div className="muted" style={{ marginTop: 6 }}>
                      Oldest pending: "{pending[0].title}" by {pending[0].author}
                    </div>
                  )}
                </div>
              )}
              {openStat === "comments" && (
                <div className="small">
                  <strong>Comment breakdown</strong>
                  <div className="muted" style={{ marginTop: 6 }}>
                    {stats ? stats.totalComments : 0} comments in total ·{" "}
                    {stats && stats.approvedPosts > 0
                      ? `${(stats.totalComments / stats.approvedPosts).toFixed(1)} per approved post on average`
                      : "no approved posts yet"}
                  </div>
                </div>
              )}
              {openStat === "habits" && (
                <div className="small">
                  <strong>Habit breakdown</strong>
                  <div className="muted" style={{ marginTop: 6 }}>
                    {stats ? stats.totalHabits : 0} habits created ·{" "}
                    {stats && stats.totalUsers > 0
                      ? `${(stats.totalHabits / stats.totalUsers).toFixed(1)} per user on average`
                      : "no users yet"}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* User management (Done by Zheng_Xian) */}
          <div className="section-title">
            User management {users.length > 0 && <Badge color="blue">{users.length}</Badge>}
          </div>
          {/* Search/filter (Done by Zheng_Xian) */}
          {users.length > 0 && (
            <input
              type="search"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Search users by name or email…"
              aria-label="Search users"
              className="mb-16"
              style={{
                width: "100%",
                padding: "8px 12px",
                fontSize: 14,
                border: "1px solid var(--border, #d1d5db)",
                borderRadius: 8,
              }}
            />
          )}
          {users.length === 0 && <Card><span className="muted">No users found.</span></Card>}
          {users.length > 0 && visibleUsers.length === 0 && (
            <Card><span className="muted">No users match "{userQuery}".</span></Card>
          )}
          <div className="grid mb-24" style={{ gap: 12 }}>
            {visibleUsers.map((user) => (
              <Card key={user.id}>
                <div className="row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <div>
                    <div className="row gap-8">
                      <strong style={{ fontSize: 14 }}>{user.name}</strong>
                      {user.role === "admin" && <Badge color="violet">admin</Badge>}
                      {user.isBanned && <Badge color="red">banned</Badge>}
                      {user.isSelf && <Badge color="blue">you</Badge>}
                    </div>
                    <div className="small muted">
                      {user.email} · joined {user.joinedAt}
                    </div>
                  </div>
                  <div className="row gap-8">
                    {/* Promote/demote hidden on your own row — the backend
                        also rejects self-demotion, this is just the UI half. */}
                    {!user.isSelf && (
                      <Button
                        size="sm"
                        variant={user.role === "admin" ? "danger" : "success"}
                        disabled={busyId === user.id}
                        onClick={() => toggleRole(user)}
                      >
                        <ShieldIcon size={15} /> {user.role === "admin" ? "Remove admin" : "Make admin"}
                      </Button>
                    )}
                    {!user.isSelf && (
                      <Button
                        size="sm"
                        variant={user.isBanned ? "success" : "danger"}
                        disabled={busyId === user.id}
                        onClick={() => toggleBan(user)}
                      >
                        {user.isBanned ? "Unban" : "Ban"}
                      </Button>
                    )}
                    {!user.isSelf && (
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={busyId === user.id}
                        onClick={() => deleteUser(user)}
                      >
                        <XIcon size={15} /> Delete
                      </Button>
                    )}
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
