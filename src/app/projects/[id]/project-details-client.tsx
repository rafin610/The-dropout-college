"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUp, ExternalLink, Code2 as Github, Globe, LoaderCircle, MessageCircle, Pencil, Trash2 } from "lucide-react";
import { Pill, timeAgo } from "@/components/app-shell";
import { useComments, useFollow, useUpvote, commentAuthor } from "@/lib/social-client";
import type { Project } from "@/lib/supabase-data";

function displayStatus(status?: string | null): string {
  if (status === "in_progress" || status === "Building" || status === "Active") return "Building";
  if (status === "launched" || status === "Live" || status === "Launched") return "Launched";
  if (status === "recruiting") return "Recruiting";
  if (status === "archived") return "Archived";
  return "Idea";
}

export function ProjectDetailsClient({ project, userId, isAdmin }: { project: Project; userId: string | null; isAdmin: boolean }) {
  const [coverError, setCoverError] = useState(false);
  const showCover = Boolean(project.coverImageUrl) && !coverError;
  const status = displayStatus(project.status);
  const { count: upvotes, upvoted, loading: upvoting, toggle: toggleUpvote } = useUpvote(project.id, project.upvoteCount ?? 0, userId);
  const { comments, loading: commentsLoading, error: commentsError, posting, post, setComments } = useComments(project.id);
  const [draft, setDraft] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [actionError, setActionError] = useState("");
  const follow = useFollow(project.ownerId ?? null, userId);
  const isOwner = userId != null && userId === project.ownerId;
  const creatorInitials = (project.creatorName ?? "M").split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setActionError("");
    const ok = await post(draft.trim());
    if (ok) setDraft("");
    else setActionError("Could not post your comment. Please try again.");
  }

  async function saveEdit(commentId: string) {
    if (!editDraft.trim()) return;
    setActionError("");
    try {
      const res = await fetch(`/api/v1/projects/${project.id}/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editDraft.trim() }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error?.message || "Could not update comment.");
      setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, content: editDraft.trim(), updated_at: new Date().toISOString() } : c)));
      setEditingCommentId(null);
      setEditDraft("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not update comment.");
    }
  }

  async function removeComment(commentId: string) {
    if (!window.confirm("Delete this comment?")) return;
    setActionError("");
    try {
      const res = await fetch(`/api/v1/projects/${project.id}/comments/${commentId}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error?.message || "Could not delete comment.");
      }
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not delete comment.");
    }
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <Link href="/projects" className="section-link">← Back to projects</Link>

      <div className="project-details-cover">
        {showCover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.coverImageUrl as string} alt={`${project.name} cover`} onError={() => setCoverError(true)} />
        ) : (
          <span>D/PROJECT — no cover image</span>
        )}
      </div>

      <div>
        <div className="eyebrow" style={{ color: "var(--lime)" }}>{project.categoryName ?? "Community project"}</div>
        <h1 style={{ fontSize: "clamp(28px, 4vw, 44px)", margin: "10px 0", letterSpacing: "-0.03em" }}>{project.name}</h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Pill tone={status === "Launched" ? "lime" : "neutral"}>{status}</Pill>
          <Pill tone="neutral">{project.metric}</Pill>
        </div>
      </div>

      <div className="creator-row">
        <span className="creator-avatar" aria-hidden="true">
          {project.creatorAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={project.creatorAvatar} alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          ) : (
            creatorInitials
          )}
        </span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>{project.creatorName ?? "Community member"}</div>
          {project.creatorUsername && <div className="member-handle">@{project.creatorUsername}</div>}
        </div>
        {!isOwner && project.ownerId && userId && (
          <button type="button" className={`button ${follow.isFollowing ? "button-ghost" : "button-primary"} follow-button`} style={{ fontSize: 11 }} onClick={() => void follow.toggle()} disabled={follow.loading}>
            {follow.loading ? <LoaderCircle size={13} className="spin" /> : null}
            {follow.isFollowing ? "Following ✓" : "Follow"}
          </button>
        )}
        {!isOwner && project.ownerId && !userId && (
          <Link href="/login" className="button button-ghost follow-button" style={{ fontSize: 11 }}>Follow</Link>
        )}
      </div>

      <section className="panel">
        <div className="eyebrow">About this project</div>
        <p style={{ lineHeight: 1.8, fontSize: 14, margin: "12px 0 0", overflowWrap: "anywhere" }}>{project.description}</p>
        {(project.demoUrl || project.githubUrl || (project.links ?? []).length > 0) && (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
            {project.demoUrl && <Link href={project.demoUrl} target="_blank" rel="noreferrer" className="section-link"><Globe size={14} /> Live demo</Link>}
            {project.githubUrl && <Link href={project.githubUrl} target="_blank" rel="noreferrer" className="section-link"><Github size={14} /> GitHub</Link>}
            {(project.links ?? []).map((l) => <Link key={l.url} href={l.url} target="_blank" rel="noreferrer" className="section-link"><ExternalLink size={13} /> {l.label}</Link>)}
          </div>
        )}
      </section>

      <div className="project-social-row" style={{ border: 0, padding: 0, margin: 0 }}>
        <button
          type="button"
          className={`upvote-button${upvoted ? " active" : ""}`}
          onClick={() => void toggleUpvote()}
          disabled={upvoting}
          aria-pressed={upvoted}
          title={userId ? (upvoted ? "Remove upvote" : "Upvote") : "Sign in to upvote"}
        >
          <ArrowUp size={14} /> {upvoting ? "…" : upvotes} Upvote
        </button>
        <span className="comment-button" aria-label={`${comments.length} comments`}>
          <MessageCircle size={14} /> {comments.length} Comments
        </span>
      </div>

      <section id="comments" className="panel">
        <div className="eyebrow">Discussion</div>
        <h2 style={{ fontSize: 20, margin: "8px 0 0" }}>Comments</h2>

        {actionError && <p style={{ color: "var(--coral)", fontSize: 12 }} role="alert">{actionError}</p>}
        {commentsError && <p style={{ color: "var(--coral)", fontSize: 12 }} role="alert">{commentsError}</p>}

        {userId ? (
          <form onSubmit={submitComment} className="comment-box">
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a comment..." aria-label="Write a comment" maxLength={2000} />
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" className="button button-primary" style={{ fontSize: 11 }} disabled={posting || !draft.trim()}>
                {posting ? <LoaderCircle size={13} className="spin" /> : null} {posting ? "Posting…" : "Post"}
              </button>
            </div>
          </form>
        ) : (
          <p className="muted-text" style={{ margin: "14px 0" }}>
            <Link href="/login" className="section-link">Sign in</Link> to join the discussion.
          </p>
        )}

        {commentsLoading ? (
          <p className="muted-text">Loading comments…</p>
        ) : comments.length === 0 ? (
          <p className="muted-text">No comments yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {comments.map((c) => {
              const author = commentAuthor(c);
              const mine = userId === c.user_id;
              const canModerate = mine || isAdmin;
              const editing = editingCommentId === c.id;
              return (
                <div key={c.id} className="comment-item">
                  <div className="comment-head">
                    <span className="comment-avatar" aria-hidden="true">
                      {author.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={author.avatar} alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        author.name.slice(0, 2).toUpperCase()
                      )}
                    </span>
                    <strong style={{ fontSize: 12 }}>{author.name}</strong>
                    <span className="comment-meta">· {timeAgo(c.created_at)}{c.updated_at !== c.created_at ? " (edited)" : ""}</span>
                  </div>
                  {editing ? (
                    <div className="comment-box" style={{ margin: 0 }}>
                      <textarea value={editDraft} onChange={(e) => setEditDraft(e.target.value)} aria-label="Edit comment" maxLength={2000} />
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button type="button" className="button button-ghost" style={{ fontSize: 11 }} onClick={() => { setEditingCommentId(null); setEditDraft(""); }}>Cancel</button>
                        <button type="button" className="button button-primary" style={{ fontSize: 11 }} onClick={() => void saveEdit(c.id)}>Save</button>
                      </div>
                    </div>
                  ) : (
                    <p className="comment-body">{c.content}</p>
                  )}
                  {canModerate && !editing && (
                    <div className="comment-actions">
                      {mine && (
                        <button type="button" onClick={() => { setEditingCommentId(c.id); setEditDraft(c.content); }}>
                          <Pencil size={11} /> Edit
                        </button>
                      )}
                      <button type="button" onClick={() => void removeComment(c.id)}>
                        <Trash2 size={11} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
