"use client";

import Link from "next/link";
import { Loader2, Send } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/avatar";
import { timeAgo } from "@/lib/time";
import type { PostComment } from "@/server/posts/posts";
import type { MemberRole } from "@/server/auth/roles";

const LIMIT = 1000;

export function CommentSection({
  postId,
  initialComments,
  viewer,
  onCountChange,
}: {
  postId: string;
  initialComments: PostComment[];
  viewer: { id: string; displayName: string; avatarUrl: string | null; role: MemberRole } | null;
  onCountChange?: (count: number) => void;
}) {
  const [comments, setComments] = useState(initialComments);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  function syncCount(next: PostComment[]) {
    setComments(next);
    onCountChange?.(next.length);
  }

  async function addComment(event: React.FormEvent) {
    event.preventDefault();
    if (!viewer || posting || !content.trim()) return;
    setPosting(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { data?: PostComment; error?: { message?: string } }
        | null;
      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error?.message || "Your comment could not be posted.");
      }
      syncCount([...comments, payload.data]);
      setContent("");
    } catch (commentError) {
      setError(commentError instanceof Error ? commentError.message : "Your comment could not be posted.");
    } finally {
      setPosting(false);
    }
  }

  async function saveEdit(commentId: string) {
    if (busyId || !editContent.trim()) return;
    setBusyId(commentId);
    setError("");
    try {
      const response = await fetch(`/api/v1/posts/${postId}/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { data?: PostComment; error?: { message?: string } }
        | null;
      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error?.message || "The comment could not be saved.");
      }
      setComments((current) => current.map((comment) => (comment.id === commentId ? payload.data! : comment)));
      setEditingId(null);
      setEditContent("");
    } catch (editError) {
      setError(editError instanceof Error ? editError.message : "The comment could not be saved.");
    } finally {
      setBusyId(null);
    }
  }

  async function removeComment(commentId: string) {
    if (busyId) return;
    if (!window.confirm("Delete this comment?")) return;
    setBusyId(commentId);
    setError("");
    try {
      const response = await fetch(`/api/v1/posts/${postId}/comments/${commentId}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.message || "The comment could not be deleted.");
      }
      syncCount(comments.filter((comment) => comment.id !== commentId));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "The comment could not be deleted.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section id="comments" className="c-comments" aria-label="Comments">
      <div className="c-comments-head">
        <h2>Conversation</h2>
        <span>{comments.length === 0 ? "No comments yet" : `${comments.length} comment${comments.length === 1 ? "" : "s"}`}</span>
      </div>

      {viewer ? (
        <form className="c-comment-form" onSubmit={addComment}>
          <Avatar src={viewer.avatarUrl} name={viewer.displayName} size={34} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <textarea
              className="c-textarea"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Add to the conversation…"
              aria-label="Write a comment"
              maxLength={LIMIT}
            />
            <div className="c-comment-form-foot">
              <span className={`c-counter${content.length > LIMIT - 50 ? " warn" : ""}`}>
                {LIMIT - content.length} left
              </span>
              <button type="submit" className="c-button c-button-primary" disabled={posting || !content.trim()}>
                {posting ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
                <span>{posting ? "Sending…" : "Comment"}</span>
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="c-comment-signin">
          <span>Sign in to join the conversation.</span>
          <Link href={`/login?next=${encodeURIComponent(`/p/${postId}`)}`}>Sign in →</Link>
        </div>
      )}

      {error && <p className="c-error" role="alert">{error}</p>}

      <div className="c-comment-list">
        {comments.map((comment) => {
          const canEdit = viewer?.id === comment.author.id;
          const canDelete = canEdit || viewer?.role === "admin" || viewer?.role === "moderator";
          const isEditing = editingId === comment.id;
          const wasEdited = new Date(comment.updatedAt).getTime() - new Date(comment.createdAt).getTime() > 1500;

          return (
            <article className="c-comment" key={comment.id}>
              <Link href={comment.author.username ? `/profile/${encodeURIComponent(comment.author.username)}` : "/profile"}>
                <Avatar src={comment.author.avatarUrl} name={comment.author.displayName} size={32} />
              </Link>
              <div className="c-comment-body">
                <div className="c-comment-top">
                  <Link
                    href={comment.author.username ? `/profile/${encodeURIComponent(comment.author.username)}` : "/profile"}
                    className="c-comment-name"
                  >
                    {comment.author.displayName}
                  </Link>
                  {comment.author.role !== "member" && (
                    <span className={`c-role-badge ${comment.author.role}`}>
                      {comment.author.role === "admin" ? "Admin" : "Moderator"}
                    </span>
                  )}
                  <span className="c-comment-time">
                    {timeAgo(comment.createdAt)}
                    {wasEdited ? " · edited" : ""}
                  </span>
                </div>

                {isEditing ? (
                  <div className="c-comment-edit">
                    <textarea
                      className="c-textarea"
                      value={editContent}
                      onChange={(event) => setEditContent(event.target.value)}
                      aria-label="Edit comment"
                      maxLength={LIMIT}
                    />
                    <div className="c-comment-form-foot">
                      <button
                        type="button"
                        className="c-link-btn"
                        onClick={() => {
                          setEditingId(null);
                          setEditContent("");
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="c-button c-button-primary"
                        disabled={busyId === comment.id || !editContent.trim()}
                        onClick={() => void saveEdit(comment.id)}
                      >
                        {busyId === comment.id ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="c-comment-text">{comment.content}</p>
                    {(canEdit || canDelete) && (
                      <div className="c-comment-tools">
                        {canEdit && (
                          <button
                            type="button"
                            className="c-link-btn"
                            onClick={() => {
                              setEditingId(comment.id);
                              setEditContent(comment.content);
                            }}
                          >
                            Edit
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            className="c-link-btn danger"
                            disabled={busyId === comment.id}
                            onClick={() => void removeComment(comment.id)}
                          >
                            {busyId === comment.id ? "Deleting…" : "Delete"}
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
