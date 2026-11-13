"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { DeletePostButton } from "@/components/posts/delete-post-button";
import { LoveReactionButton } from "@/components/posts/love-reaction-button";
import { ShareButton } from "@/components/posts/share-button";
import { timeAgo } from "@/lib/time";
import type { Post } from "@/server/posts/posts";
import type { MemberRole } from "@/server/auth/roles";

function roleText(role: MemberRole) {
  return role === "admin" ? "Admin" : role === "moderator" ? "Moderator" : "Member";
}

export function PostCard({
  post,
  viewerId,
  viewerRole,
  onChange,
  onDeleted,
  detail = false,
}: {
  post: Post;
  viewerId: string | null;
  viewerRole: MemberRole;
  onChange?: (post: Post) => void;
  onDeleted?: () => void;
  detail?: boolean;
}) {
  const authorHref = post.author.username
    ? `/profile/${encodeURIComponent(post.author.username)}`
    : "/profile";
  const canDelete = Boolean(viewerId) && (post.author.id === viewerId || viewerRole === "admin" || viewerRole === "moderator");

  function updateLove(next: { loved: boolean; count: number }) {
    onChange?.({ ...post, viewerLoved: next.loved, loveCount: next.count });
  }

  return (
    <article className="c-post-card" aria-label={`Post by ${post.author.displayName}`}>
      <header className="c-post-head">
        <Link href={authorHref} aria-label={`Open ${post.author.displayName}'s profile`}>
          <Avatar src={post.author.avatarUrl} name={post.author.displayName} size={40} />
        </Link>

        <div className="c-post-author">
          <div className="c-post-name-row">
            <Link href={authorHref} className="c-post-name">
              {post.author.displayName}
            </Link>
            {post.author.role !== "member" && (
              <span className={`c-role-badge ${post.author.role}`}>{roleText(post.author.role)}</span>
            )}
          </div>
          <div className="c-post-meta">
            {post.author.username && (
              <>
                <Link href={authorHref}>@{post.author.username}</Link>
                <span aria-hidden="true">·</span>
              </>
            )}
            <time dateTime={post.createdAt} title={new Date(post.createdAt).toLocaleString()}>
              {timeAgo(post.createdAt)}
            </time>
          </div>
        </div>

        {canDelete && (
          <div className="c-post-menu">
            <DeletePostButton postId={post.id} onDeleted={onDeleted} compact />
          </div>
        )}
      </header>

      <p className="c-post-content">{post.content}</p>

      {post.imageUrl && (
        <div className="c-post-image">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.imageUrl}
            alt={`Photo shared by ${post.author.displayName}`}
            loading="lazy"
            decoding="async"
          />
        </div>
      )}

      <footer className="c-post-actions">
        <LoveReactionButton
          postId={post.id}
          loved={post.viewerLoved}
          count={post.loveCount}
          signedIn={Boolean(viewerId)}
          onChange={updateLove}
        />
        {detail ? (
          <span className="c-action-btn" aria-hidden="true">
            <MessageCircle size={16} />
            <span>{post.commentCount > 0 ? post.commentCount : "Comment"}</span>
          </span>
        ) : (
          <Link href={`/p/${post.id}#comments`} className="c-action-btn">
            <MessageCircle size={16} />
            <span>{post.commentCount > 0 ? post.commentCount : "Comment"}</span>
          </Link>
        )}
        <div className="c-action-spacer" />
        <ShareButton path={`/p/${post.id}`} title={`${post.author.displayName} on The DropOut College`} />
      </footer>
    </article>
  );
}
