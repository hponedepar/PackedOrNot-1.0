"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import PostCard from "@/components/PostCard";
import ApiErrorBanner from "@/components/ApiErrorBanner";
import Badge from "@/components/Badge";
import { useAuth } from "@/lib/auth";
import { PostsAPI, HabitsAPI, CommentsAPI, AdminAPI } from "@/lib/api";
import { PlusIcon, SearchIcon, CheckIcon, XIcon, ShieldIcon } from "@/lib/icons";

const CATEGORIES = [
  "All", "Study habits", "Exam preparation", "Time management",
  "Internship rejection", "Scholarship application", "Portfolio building",
  "Programming practice", "Project teamwork", "CCA or leadership", "Academic setback recovery",
];

export default function ForumPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [posts, setPosts] = useState([]);
  const [pending, setPending] = useState([]); // admin only: posts awaiting review
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isAdmin = user?.role === "admin";

  // Create-post modal state
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", category: "Study habits", content: "", suggestedAction: "" });

  // Comment modal state
  const [commentPost, setCommentPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");

  // Add-to-tracker modal state: the user rewrites the advice in their own
  // words (customisation) before it becomes a habit.
  const [trackerPost, setTrackerPost] = useState(null);
  const [trackerForm, setTrackerForm] = useState({ name: "", frequency: "Daily" });

  async function load() {
    setError("");
    try {
      const data = await PostsAPI.list(category, search);
      setPosts(data);
      // Admins moderate right here on the forum: pending posts load alongside.
      if (user?.role === "admin") setPending(await AdminAPI.pendingPosts());
    } catch (err) { setError(err.message); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [category, user]);

  function flash(msg) { setNotice(msg); setTimeout(() => setNotice(""), 2500); }

  // ---- Admin: approve / reject pending posts right here on the forum ----
  async function approvePending(post) {
    try { await AdminAPI.approvePost(post.id); flash(`Approved: "${post.title}"`); load(); }
    catch (err) { setError(err.message); }
  }
  async function rejectPending(post) {
    try { await AdminAPI.rejectPost(post.id); flash(`Rejected: "${post.title}"`); load(); }
    catch (err) { setError(err.message); }
  }

  async function handleUpvote(post) {
    try {
      const updated = await PostsAPI.upvote(post.id);
      setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err) { setError(err.message); }
  }

  // The signature action: forum advice -> personal habit. Opens a modal so
  // the user can rewrite the senior's advice in their own words first.
  function handleAddToTracker(post) {
    setTrackerPost(post);
    setTrackerForm({ name: post.suggestedAction || post.title, frequency: "Daily" });
  }

  async function confirmAddToTracker(e) {
    e.preventDefault();
    try {
      await HabitsAPI.create({
        userId: user.id,
        name: trackerForm.name,
        frequency: trackerForm.frequency,
        sourcePostId: trackerPost.id,
      });
      flash(`Added to your tracker: "${trackerForm.name}"`);
      setTrackerPost(null);
    } catch (err) { setError(err.message); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await PostsAPI.create({
        ...form,
        author: user.name,
        authorYear: user.yearLevel,
        userId: user.id,
      });
      setShowCreate(false);
      setForm({ title: "", category: "Study habits", content: "", suggestedAction: "" });
      flash("Your advice was posted!");
      load();
    } catch (err) { setError(err.message); }
  }

  async function openComments(post) {
    setCommentPost(post);
    setComments([]);
    try { setComments(await CommentsAPI.list(post.id)); } catch (err) { setError(err.message); }
  }

  async function addComment(e) {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const c = await CommentsAPI.create({
        postId: commentPost.id, userId: user.id, author: user.name,
        authorYear: user.yearLevel, text: commentText,
      });
      setComments((prev) => [...prev, c]);
      setCommentText("");
    } catch (err) { setError(err.message); }
  }

  return (
    <AppShell
      title="Advice Forum"
      subtitle="Real tips from RP students. Save what works and turn it into a habit."
      actions={<Button variant="primary" onClick={() => setShowCreate(true)}><PlusIcon size={16} /> Create post</Button>}
    >
      <ApiErrorBanner error={error} onRetry={load} />
      {notice && <div className="banner mb-16" style={{ background: "var(--green-050)", color: "var(--green)", borderColor: "rgba(16,185,129,0.3)" }}>{notice}</div>}

      {/* Admin only: pending posts to moderate, right where the action is. */}
      {isAdmin && pending.length > 0 && (
        <Card className="mb-24" style={{ borderColor: "rgba(245, 158, 11, 0.45)" }}>
          <div className="row mb-16" style={{ justifyContent: "space-between" }}>
            <h2 className="section-title row gap-8" style={{ marginBottom: 0 }}>
              <ShieldIcon size={18} /> Pending requests <Badge color="amber">{pending.length}</Badge>
            </h2>
            <span className="small muted">Visible to admins only</span>
          </div>
          <div className="stack gap-12">
            {pending.map((p) => (
              <div key={p.id} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontWeight: 650, fontSize: 14 }}>{p.title}</div>
                <div className="small muted">{p.category} &middot; by {p.author} ({p.authorYear})</div>
                <p className="small mt-8 mb-16">{p.content}</p>
                <div className="row gap-8">
                  <Button size="sm" variant="success" onClick={() => approvePending(p)}>
                    <CheckIcon size={15} /> Approve
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => rejectPending(p)}>
                    <XIcon size={15} /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Search + category filter */}
      <Card className="mb-24">
        <div className="row gap-12 mb-16" style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 14, top: 11, color: "var(--muted)" }}><SearchIcon size={18} /></span>
          <input
            className="input"
            style={{ paddingLeft: 40 }}
            placeholder="Search advice by keyword…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
          />
          <Button onClick={load}>Search</Button>
        </div>
        <div className="chip-row">
          {CATEGORIES.map((c) => (
            <button key={c} className={"filter-chip" + (category === c ? " active" : "")} onClick={() => setCategory(c)}>{c}</button>
          ))}
        </div>
      </Card>

      {/* Post list */}
      <div className="stack gap-16">
        {posts.length === 0 && <div className="empty">No posts found. Try another category or be the first to post!</div>}
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onUpvote={handleUpvote}
            onAddToTracker={handleAddToTracker}
            onComment={openComments}
          />
        ))}
      </div>

      {/* Create-post modal */}
      <Modal open={showCreate} title="Share your advice" onClose={() => setShowCreate(false)}>
        <form onSubmit={handleCreate}>
          <div className="field-group">
            <label className="field">Title</label>
            <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. How I stopped procrastinating" />
          </div>
          <div className="field-group">
            <label className="field">Category</label>
            <select className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.filter((c) => c !== "All").map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="field-group">
            <label className="field">Your advice</label>
            <textarea className="textarea" required value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Share what worked for you…" />
          </div>
          <div className="field-group">
            <label className="field">Suggested action <span className="muted">(becomes a habit when someone taps “Add to My Tracker”)</span></label>
            <input className="input" value={form.suggestedAction} onChange={(e) => setForm({ ...form, suggestedAction: e.target.value })} placeholder="e.g. Study one topic every day" />
          </div>
          <div className="small muted mb-16">Posting as <strong>{user?.name}</strong> ({user?.yearLevel})</div>
          <Button variant="primary" className="btn-block" type="submit">Post advice</Button>
        </form>
      </Modal>

      {/* Add-to-tracker modal (customise the advice before saving) */}
      <Modal open={!!trackerPost} title="Add to My Tracker" onClose={() => setTrackerPost(null)}>
        {trackerPost && (
          <form onSubmit={confirmAddToTracker}>
            <div className="small muted mb-16" style={{ padding: "10px 12px", background: "var(--surface-2)", borderRadius: 10, borderLeft: "3px solid var(--violet)" }}>
              <strong>{trackerPost.author}</strong> ({trackerPost.authorYear}) suggested:<br />
              &ldquo;{trackerPost.suggestedAction || trackerPost.title}&rdquo;
            </div>
            <div className="field-group">
              <label className="field">Make it yours <span className="muted">(rewrite it the way you&rsquo;ll actually do it)</span></label>
              <textarea
                className="textarea"
                required
                rows={3}
                value={trackerForm.name}
                onChange={(e) => setTrackerForm({ ...trackerForm, name: e.target.value })}
                placeholder="e.g. Try 2 papers from this website for my Operating Systems"
              />
            </div>
            <div className="field-group">
              <label className="field">Frequency</label>
              <select className="select" value={trackerForm.frequency} onChange={(e) => setTrackerForm({ ...trackerForm, frequency: e.target.value })}>
                {["Daily", "Weekdays", "Weekly", "3x per week", "Monthly"].map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
            <Button variant="primary" className="btn-block" type="submit">Add to my tracker</Button>
          </form>
        )}
      </Modal>

      {/* Comments modal */}
      <Modal open={!!commentPost} title="Comments" onClose={() => setCommentPost(null)}>
        {commentPost && (
          <>
            <div className="small muted mb-16">On: <strong>{commentPost.title}</strong></div>
            <div className="stack gap-12 mb-16" style={{ maxHeight: 260, overflowY: "auto" }}>
              {comments.length === 0 && <p className="muted small">No comments yet. Start the conversation!</p>}
              {comments.map((c) => (
                <div key={c.id} style={{ padding: "10px 12px", background: "var(--surface-2)", borderRadius: 10 }}>
                  <div className="small" style={{ fontWeight: 700 }}>{c.author} <span className="muted" style={{ fontWeight: 400 }}>&middot; {c.authorYear}</span></div>
                  <div className="small mt-8">{c.text}</div>
                </div>
              ))}
            </div>
            <form onSubmit={addComment} className="row gap-8">
              <input className="input" placeholder="Add a comment…" value={commentText} onChange={(e) => setCommentText(e.target.value)} />
              <Button variant="primary" type="submit">Send</Button>
            </form>
          </>
        )}
      </Modal>
    </AppShell>
  );
}
