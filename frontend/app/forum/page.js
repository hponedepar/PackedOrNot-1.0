"use client";
// Advice Forum — Done by Andrea Ho
// (Study/Habit split + "Add to planner" on original posts — Khaing Khant Zaw)
//
// A Reddit-style Q&A shown as ONE card per question: the post sits at the top
// with an up/down vote pill, and the replies ladder underneath in the same box.
//
// There are two completely separate forums, chosen by the Study | Habit switch:
//   • Study mode -> only forumType "study" posts, study categories
//   • Habit mode -> only forumType "habit" posts, habit categories
// The split is done by the backend SQL query (see posts.repo.findApproved) —
// this page asks for one forum and only ever receives that forum's posts.
//
// Useful advice can live in the question itself or in a reply, so BOTH carry
// an action button: "Add to Study Planner" in study mode, "Add to Habit
// Tracker" in habit mode. It opens a modal pre-filled with that text so the
// student can reword it before saving.
import React, { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import ApiErrorBanner from "@/components/ApiErrorBanner";
import Badge from "@/components/Badge";
import Avatar from "@/components/Avatar";
import { useAuth } from "@/lib/auth";
import { useMode } from "@/lib/mode";
import { PostsAPI, CommentsAPI, AdminAPI, HabitsAPI, PlansAPI } from "@/lib/api";
import { PlusIcon, SearchIcon, CheckIcon, XIcon, ShieldIcon, UpIcon, DownIcon, TargetIcon, BookmarkIcon } from "@/lib/icons";

// Fallback chips if /api/posts/categories can't be reached. The server is the
// source of truth (it rejects a category from the wrong forum) — these just
// keep the page usable offline.
const FALLBACK_CATEGORIES = {
  study: ["Study habits", "Exam preparation", "Programming practice", "Revision techniques", "Note-taking", "Module help"],
  habit: ["Exercise", "Sleep", "Productivity", "Mental wellness", "Healthy eating", "Personal routines"],
};

// Everything that differs between the two forums, in one place.
const FORUM = {
  study: {
    subtitle: "Ask other students for study advice, then turn useful advice into a study plan.",
    actionLabel: "Add to Study Planner",
    modalTitle: "Add to Study Planner",
    nameLabel: "Study plan name",
    namePlaceholder: "e.g. Practise Python on W3Schools",
    savedMsg: "Added to your study planner!",
  },
  habit: {
    subtitle: "Share and discover helpful habits, then turn useful advice into an action plan.",
    actionLabel: "Add to Habit Tracker",
    modalTitle: "Add to Habit Tracker",
    nameLabel: "Habit name",
    namePlaceholder: "e.g. Play 1 game of chess to de-stress",
    savedMsg: "Added to your habit tracker!",
  },
};

// study_plans.name / habits.name are VARCHAR(160) — don't let a long quote
// get truncated by the database.
const NAME_MAX = 160;

// One shared Reddit-style vote pill: [ ↑ score ↓ ]. Used for BOTH the post
// and every reply, so they look and behave the same. Done by Andrea Ho.
function VotePill({ up, down, voted, onUp, onDown }) {
  const score = (up || 0) - (down || 0);
  return (
    <span className="vote-group">
      <button className="vote-arrow up" disabled={voted} onClick={onUp} title="Upvote" aria-label="Upvote"><UpIcon size={15} /></button>
      <span className="vote-score">{score}</span>
      <button className="vote-arrow down" disabled={voted} onClick={onDown} title="Downvote" aria-label="Downvote"><DownIcon size={15} /></button>
    </span>
  );
}

export default function ForumPage() {
  const { user } = useAuth();
  const { mode } = useMode();                 // "study" | "habit" -> which forum
  const forumType = mode === "habit" ? "habit" : "study";
  const copy = FORUM[forumType];

  const [posts, setPosts] = useState([]);
  const [commentsByPost, setCommentsByPost] = useState({}); // { postId: [replies] }
  const [pending, setPending] = useState([]);               // admin only: posts awaiting review
  const [catalogue, setCatalogue] = useState(FALLBACK_CATEGORIES);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [votedPosts, setVotedPosts] = useState(new Set());     // one vote per post per session
  const [votedComments, setVotedComments] = useState(new Set()); // one vote per reply per session
  const [replyDrafts, setReplyDrafts] = useState({});          // { postId: draft text }

  const isAdmin = user?.role === "admin";
  const categories = ["All", ...(catalogue[forumType] || [])];

  // Create / edit modals
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", category: "", content: "" });
  const [editingPost, setEditingPost] = useState(null);
  const [editPostForm, setEditPostForm] = useState({ title: "", content: "", category: "" });
  const [editingComment, setEditingComment] = useState(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [saving, setSaving] = useState(false);                // blocks double-submits

  // "Add to planner" modal. `target` holds the text we copied and where it came
  // from, so the same modal serves both the question and every reply.
  //   { text, author, authorYear, postId, isReply }
  const [target, setTarget] = useState(null);
  const [targetForm, setTargetForm] = useState({ name: "", frequency: "Daily" });

  // The category chips the server will accept for this forum.
  useEffect(() => {
    let alive = true;
    PostsAPI.categories()
      .then((c) => { if (alive && c && c.study && c.habit) setCatalogue(c); })
      .catch(() => { /* keep the fallback */ });
    return () => { alive = false; };
  }, []);

  async function load() {
    if (!user?.id) return; // wait until the logged-in user is known
    setError("");
    try {
      // Ask for ONE forum — the backend filters in SQL.
      const data = await PostsAPI.list(category, search, user?.id, forumType);
      setPosts(data);
      // Load every reply once and group by postId so we can show them inline.
      const all = await CommentsAPI.all();
      const map = {};
      for (const c of all) (map[c.postId] ||= []).push(c);
      setCommentsByPost(map);
      if (user?.role === "admin") setPending(await AdminAPI.pendingPosts());
    } catch (err) { setError(err.message); }
  }

  // Reload when the forum, category or user changes. Switching mode resets the
  // category, since the two forums have no categories in common.
  useEffect(() => { setCategory("All"); }, [forumType]);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [category, user, forumType]);

  function flash(msg) { setNotice(msg); setTimeout(() => setNotice(""), 2500); }

  // Replace one reply wherever it lives in the grouped map.
  function patchComment(updated) {
    setCommentsByPost((prev) => ({
      ...prev,
      [updated.postId]: (prev[updated.postId] || []).map((x) => (x.id === updated.id ? updated : x)),
    }));
  }

  // ---- Admin: approve / reject pending posts right on the forum ----
  async function approvePending(post) {
    try { await AdminAPI.approvePost(post.id); flash(`Approved: "${post.title}"`); load(); }
    catch (err) { setError(err.message); }
  }
  async function rejectPending(post) {
    try { await AdminAPI.rejectPost(post.id); flash(`Rejected: "${post.title}"`); load(); }
    catch (err) { setError(err.message); }
  }

  // ---- Vote on the POST (up/down), one vote per session ----
  async function votePost(post, kind) {
    if (!user?.id) { setError("Please log in to vote."); return; }
    if (votedPosts.has(post.id)) return;
    try {
      const updated = kind === "up"
        ? await PostsAPI.upvote(post.id, user.id)
        : await PostsAPI.downvote(post.id, user.id);
      setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setVotedPosts((prev) => new Set(prev).add(post.id));
    } catch (err) { setError(err.message); }
  }

  // ---- Vote on a REPLY (up/down), one vote per session ----
  async function voteComment(c, kind) {
    if (votedComments.has(c.id)) return;
    try {
      const updated = kind === "up" ? await CommentsAPI.like(c.id) : await CommentsAPI.dislike(c.id);
      patchComment(updated);
      setVotedComments((prev) => new Set(prev).add(c.id));
    } catch (err) { setError(err.message); }
  }

  // ---- Post a reply inline (no modal) ----
  async function submitReply(post, e) {
    e.preventDefault();
    const text = (replyDrafts[post.id] || "").trim();
    if (!text) return;
    try {
      const c = await CommentsAPI.create({
        postId: post.id, userId: user.id, author: user.name, authorYear: user.yearLevel, text,
      });
      setCommentsByPost((prev) => ({ ...prev, [post.id]: [...(prev[post.id] || []), c] }));
      setReplyDrafts((prev) => ({ ...prev, [post.id]: "" }));
    } catch (err) { setError(err.message); }
  }

  // ---- Add advice to my planner / tracker ----
  // Works for the QUESTION itself and for any REPLY: whichever text you picked
  // is copied into the modal, where you can edit it before saving.
  function openPlanner({ text, author, authorYear, postId, isReply }) {
    setTarget({ text, author, authorYear, postId, isReply });
    setTargetForm({ name: text.slice(0, 80), frequency: "Daily" });
  }

  async function confirmAddToPlanner(e) {
    e.preventDefault();
    const name = targetForm.name.trim();
    if (!name) { setError("Please enter a name before saving."); return; }
    if (saving) return;                       // no double submits
    setSaving(true);
    setError("");
    try {
      if (forumType === "habit") {
        // Habit advice -> Habit Tracker, linked back to the post it came from.
        await HabitsAPI.create({
          userId: user.id,
          name: name.slice(0, NAME_MAX),
          frequency: targetForm.frequency,
          sourcePostId: target.postId || null,
        });
      } else {
        // Study advice -> Study Planner. The full original text is kept as the
        // plan's objective, and becomes its first tickable plan item.
        await PlansAPI.create({
          userId: user.id,
          name: name.slice(0, NAME_MAX),
          message: target.text,
          frequency: targetForm.frequency,
          sourcePostId: target.postId || null,
          lessons: [name.slice(0, 240)],
        });
      }
      flash(copy.savedMsg);
      setTarget(null);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  // ---- Create / edit / delete ----
  async function handleCreate(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      // forumType is saved with the post, so it stays in this forum for good.
      await PostsAPI.create({
        ...form,
        category: form.category || categories[1],
        forumType,
        author: user.name,
        authorYear: user.yearLevel,
        userId: user.id,
      });
      setShowCreate(false);
      setForm({ title: "", category: "", content: "" });
      flash("Your question was posted!");
      load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  function handleEditPost(post) {
    setEditingPost(post);
    setEditPostForm({ title: post.title || "", content: post.content || "", category: post.category || categories[1] });
  }
  async function saveEditedPost(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const updated = await PostsAPI.update(editingPost.id, { ...editPostForm, userId: user?.id, role: user?.role });
      setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setEditingPost(null);
      flash("Your post was updated.");
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }
  async function handleDeletePost(post) {
    if (!window.confirm(`Delete this post?\n\n"${post.title}"`)) return;
    try {
      await PostsAPI.remove(post.id, user?.id, user?.role);
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      flash("Your post was deleted.");
    } catch (err) { setError(err.message); }
  }

  function handleEditComment(comment) { setEditingComment(comment); setEditCommentText(comment.text || ""); }
  async function saveEditedComment(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const updated = await CommentsAPI.update(editingComment.id, { text: editCommentText, userId: user?.id, role: user?.role });
      patchComment(updated);
      setEditingComment(null); setEditCommentText("");
      flash("Your reply was updated.");
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }
  async function handleDeleteComment(comment) {
    if (!window.confirm("Delete this reply?")) return;
    try {
      await CommentsAPI.remove(comment.id, user?.id);
      setCommentsByPost((prev) => ({
        ...prev,
        [comment.postId]: (prev[comment.postId] || []).filter((c) => c.id !== comment.id),
      }));
      flash("Your reply was deleted.");
    } catch (err) { setError(err.message); }
  }

  const canManagePost = (post) => Boolean(user?.id && (user?.role === "admin" || (post.userId && Number(post.userId) === Number(user.id))));
  const canManageComment = (c) => Boolean(user?.id && c.userId && Number(c.userId) === Number(user.id));

  return (
    <AppShell
      title="Advice Forum"
      subtitle={copy.subtitle}
      actions={<Button variant="primary" onClick={() => setShowCreate(true)}><PlusIcon size={16} /> Ask a question</Button>}
    >
      <ApiErrorBanner error={error} onRetry={load} />
      {notice && <div className="banner mb-16" style={{ background: "var(--green-050)", color: "var(--green)", borderColor: "rgba(16,185,129,0.3)" }} role="status">{notice}</div>}

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
                  <Button size="sm" variant="success" onClick={() => approvePending(p)}><CheckIcon size={15} /> Approve</Button>
                  <Button size="sm" variant="danger" onClick={() => rejectPending(p)}><XIcon size={15} /> Reject</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Search + category filter (chips change with the forum) */}
      <Card className="mb-24">
        <div className="row gap-12 mb-16" style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 14, top: 11, color: "var(--muted)" }}><SearchIcon size={18} /></span>
          <input className="input" style={{ paddingLeft: 40 }} placeholder="Search questions by keyword…"
            aria-label="Search questions by keyword"
            value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
          <Button onClick={load}>Search</Button>
        </div>
        <div className="chip-row">
          {categories.map((c) => (
            <button key={c} className={"filter-chip" + (category === c ? " active" : "")}
              aria-pressed={category === c} onClick={() => setCategory(c)}>{c}</button>
          ))}
        </div>
      </Card>

      {/* One card per question: post on top, replies laddered below (Andrea Ho) */}
      <div className="stack gap-16">
        {posts.length === 0 && (
          <div className="empty">
            No {forumType} questions yet. Be the first to ask!
          </div>
        )}
        {posts.map((post) => {
          const replies = commentsByPost[post.id] || [];
          return (
            <Card key={post.id}>
              {/* ---- The question (post) ---- */}
              <div className="row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div className="row gap-8" style={{ alignItems: "center" }}>
                  <Avatar name={post.author} size={30} />
                  <span className="small" style={{ fontWeight: 700 }}>{post.author}</span>
                  <span className="small muted">&middot; {post.authorYear}</span>
                  <Badge color="blue">{post.category}</Badge>
                </div>
                {canManagePost(post) && (
                  <div className="row gap-8">
                    <Button size="sm" variant="ghost" onClick={() => handleEditPost(post)}>Edit</Button>
                    <Button size="sm" variant="danger" onClick={() => handleDeletePost(post)}>Delete</Button>
                  </div>
                )}
              </div>

              <h3 className="card-title mt-8">{post.title}</h3>
              <p className="muted mt-8" style={{ fontSize: 14 }}>{post.content}</p>

              {/* Post actions: vote, reply count, and the planner button —
                  because good advice is often in the question itself. */}
              <div className="row gap-8 mt-16" style={{ alignItems: "center", flexWrap: "wrap" }}>
                <VotePill up={post.upvotes} down={post.downvotes} voted={votedPosts.has(post.id)}
                  onUp={() => votePost(post, "up")} onDown={() => votePost(post, "down")} />
                <span className="small muted">{replies.length} {replies.length === 1 ? "reply" : "replies"}</span>
                <Button size="sm" variant="primary"
                  aria-label={`${copy.actionLabel}: ${post.title}`}
                  onClick={() => openPlanner({
                    text: post.content, author: post.author, authorYear: post.authorYear,
                    postId: post.id, isReply: false,
                  })}>
                  {forumType === "habit" ? <TargetIcon size={14} /> : <BookmarkIcon size={14} />} {copy.actionLabel}
                </Button>
              </div>

              {/* ---- Replies laddered below, in the same box ---- */}
              {replies.length > 0 && (
                <div className="thread">
                  {replies.map((c) => (
                    <div className="thread-item" key={c.id}>
                      <div className="row gap-8" style={{ alignItems: "center" }}>
                        <Avatar name={c.author} size={26} />
                        <span className="small" style={{ fontWeight: 700 }}>{c.author}</span>
                        <span className="small muted">&middot; {c.authorYear}</span>
                      </div>
                      <div className="small mt-8">{c.text}</div>
                      <div className="row gap-8 mt-8" style={{ flexWrap: "wrap", alignItems: "center" }}>
                        <VotePill up={c.likes} down={c.dislikes} voted={votedComments.has(c.id)}
                          onUp={() => voteComment(c, "up")} onDown={() => voteComment(c, "down")} />
                        <Button size="sm" variant="primary"
                          aria-label={`${copy.actionLabel}: reply by ${c.author}`}
                          onClick={() => openPlanner({
                            text: c.text, author: c.author, authorYear: c.authorYear,
                            postId: c.postId, isReply: true,
                          })}>
                          {forumType === "habit" ? <TargetIcon size={14} /> : <BookmarkIcon size={14} />} {copy.actionLabel}
                        </Button>
                        {canManageComment(c) && <Button size="sm" variant="ghost" onClick={() => handleEditComment(c)}>Edit</Button>}
                        {canManageComment(c) && <Button size="sm" variant="danger" onClick={() => handleDeleteComment(c)}>Delete</Button>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ---- Inline reply composer ---- */}
              <form onSubmit={(e) => submitReply(post, e)} className="row gap-8 mt-16">
                <input className="input" placeholder="Write a reply…" aria-label={`Write a reply to "${post.title}"`}
                  value={replyDrafts[post.id] || ""}
                  onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))} />
                <Button variant="primary" type="submit">Reply</Button>
              </form>
            </Card>
          );
        })}
      </div>

      {/* Ask-a-question modal — posts into the forum you're currently in */}
      <Modal open={showCreate} title="Ask a question" onClose={() => setShowCreate(false)}>
        <form onSubmit={handleCreate}>
          <div className="field-group">
            <label className="field" htmlFor="q-title">Title</label>
            <input id="q-title" className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. How do I get better at Programming Fundamentals?" />
          </div>
          <div className="field-group">
            <label className="field" htmlFor="q-category">Category</label>
            <select id="q-category" className="select" value={form.category || categories[1]} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {categories.filter((c) => c !== "All").map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="field-group">
            <label className="field" htmlFor="q-content">What are you struggling with?</label>
            <textarea id="q-content" className="textarea" required value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Describe your problem so seniors can help…" />
          </div>
          <div className="small muted mb-16">
            Posting as <strong>{user?.name}</strong> ({user?.yearLevel}) in the{" "}
            <strong>{forumType === "habit" ? "Habit" : "Study"}</strong> forum
          </div>
          <Button variant="primary" className="btn-block" type="submit" disabled={saving}>
            {saving ? "Posting…" : "Post question"}
          </Button>
        </form>
      </Modal>

      {/* Edit post modal */}
      <Modal open={!!editingPost} title="Edit post" onClose={() => setEditingPost(null)}>
        {editingPost && (
          <form onSubmit={saveEditedPost}>
            <div className="field-group">
              <label className="field" htmlFor="e-title">Title</label>
              <input id="e-title" className="input" required value={editPostForm.title} onChange={(e) => setEditPostForm({ ...editPostForm, title: e.target.value })} />
            </div>
            <div className="field-group">
              <label className="field" htmlFor="e-category">Category</label>
              <select id="e-category" className="select" value={editPostForm.category} onChange={(e) => setEditPostForm({ ...editPostForm, category: e.target.value })}>
                {categories.filter((c) => c !== "All").map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field-group">
              <label className="field" htmlFor="e-content">Content</label>
              <textarea id="e-content" className="textarea" required rows={5} value={editPostForm.content} onChange={(e) => setEditPostForm({ ...editPostForm, content: e.target.value })} />
            </div>
            <Button variant="primary" className="btn-block" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </form>
        )}
      </Modal>

      {/* Edit reply modal */}
      <Modal open={!!editingComment} title="Edit reply" onClose={() => { setEditingComment(null); setEditCommentText(""); }}>
        {editingComment && (
          <form onSubmit={saveEditedComment}>
            <div className="field-group">
              <label className="field" htmlFor="e-reply">Reply</label>
              <textarea id="e-reply" className="textarea" required rows={4} value={editCommentText} onChange={(e) => setEditCommentText(e.target.value)} />
            </div>
            <Button variant="primary" className="btn-block" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </form>
        )}
      </Modal>

      {/* Add-to-planner modal — same modal for a question or a reply, and it
          saves to the Study Planner or the Habit Tracker depending on the forum. */}
      <Modal open={!!target} title={copy.modalTitle} onClose={() => setTarget(null)}>
        {target && (
          <form onSubmit={confirmAddToPlanner}>
            {/* The original words, so the student can adapt them. */}
            <div className="small muted mb-16" style={{ padding: "10px 12px", background: "var(--surface-2)", borderRadius: 10, borderLeft: "3px solid var(--primary)" }}>
              <strong>{target.author}</strong> ({target.authorYear}) {target.isReply ? "replied" : "asked"}:<br />
              &ldquo;{target.text}&rdquo;
            </div>
            <div className="field-group">
              <label className="field" htmlFor="t-name">
                {copy.nameLabel} <span className="muted">(edit it the way you&rsquo;ll actually do it)</span>
              </label>
              <textarea id="t-name" className="textarea" required rows={3} maxLength={NAME_MAX}
                value={targetForm.name}
                onChange={(e) => setTargetForm({ ...targetForm, name: e.target.value })}
                placeholder={copy.namePlaceholder} />
              <p className="small muted mt-8" style={{ marginBottom: 0 }}>{targetForm.name.length}/{NAME_MAX}</p>
            </div>
            <div className="field-group">
              <label className="field" htmlFor="t-frequency">Frequency</label>
              <select id="t-frequency" className="select" value={targetForm.frequency} onChange={(e) => setTargetForm({ ...targetForm, frequency: e.target.value })}>
                {["Daily", "Weekdays", "Weekly", "3x per week", "Monthly"].map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
            <Button variant="primary" className="btn-block" type="submit" disabled={saving || !targetForm.name.trim()}>
              {saving ? "Saving…" : copy.actionLabel}
            </Button>
          </form>
        )}
      </Modal>
    </AppShell>
  );
}
