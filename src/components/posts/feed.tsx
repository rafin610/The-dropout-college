"use client";

import Link from "next/link";
import { Loader2, MessageCircle, PenLine } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { PostCard } from "@/components/posts/post-card";
import { PostComposer } from "@/components/posts/post-composer";
import type { Post } from "@/server/posts/posts";
import type { MemberRole } from "@/server/auth/roles";

export function Feed({
  initialPosts,
  initialTotal,
  initialUnavailable,
  viewer,
  viewerRole,
  limit = 10,
}: {
  initialPosts: Post[];
  initialTotal: number;
  initialUnavailable: boolean;
  viewer: { id: string; displayName: string; avatarUrl: string | null; role: MemberRole } | null;
  viewerRole: MemberRole;
  limit?: number;
}) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(initialTotal);
  const [unavailable, setUnavailable] = useState(initialUnavailable);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  const hasMore = posts.length < total;

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const nextPage = page + 1;
      const response = await fetch(`/api/v1/posts?page=${nextPage}&limit=${limit}`, {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as
        | { data?: Post[]; total?: number; unavailable?: boolean }
        | null;
      if (!response.ok || !payload?.data) return;

      setPosts((current) => {
        const seen = new Set(current.map((post) => post.id));
        return [...current, ...payload.data!.filter((post) => !seen.has(post.id))];
      });
      setTotal(Number(payload.total ?? total));
      setUnavailable(Boolean(payload.unavailable));
      setPage(nextPage);
    } catch {
      // Keep the existing feed; the sentinel can retry on the next scroll.
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [hasMore, limit, page, total]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "240px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  function updatePost(next: Post) {
    setPosts((current) => current.map((post) => (post.id === next.id ? next : post)));
  }

  function addPost(post: Post) {
    setPosts((current) => [post, ...current.filter((item) => item.id !== post.id)]);
    setTotal((current) => current + 1);
    setUnavailable(false);
  }

  const composer = viewer ? (
    <PostComposer viewer={viewer} onCreated={addPost} compact />
  ) : (
    <section className="c-composer c-composer-guest" aria-label="Join the conversation">
      <div className="c-guest-avatar">
        <Avatar src={null} name="Campus" size={38} />
      </div>
      <div className="c-guest-copy">
        <strong>Have something to add?</strong>
        <p>Sign in to share a thought with the community.</p>
      </div>
      <Link href="/login?next=%2Fpost" className="c-button c-button-primary">
        Sign in to post
      </Link>
    </section>
  );

  return (
    <div className="c-feed-shell">
      {!unavailable && composer}

      {posts.length === 0 ? (
        <div className="c-empty">
          <div className="c-empty-icon">
          {unavailable ? <MessageCircle size={20} /> : <PenLine size={20} />}
          </div>
          <h2>{unavailable ? "The feed is being prepared" : "The campus is quiet"}</h2>
          <p>
            {unavailable
              ? "Apply the latest database migration to switch the feed on. Existing members, journals, and accounts are untouched."
              : "No one has posted yet. Be the first to share a thought with the community."}
          </p>
          {!unavailable && viewer && (
            <Link href="/post" className="c-button c-button-primary">
              <PenLine size={15} />
              <span>Write the first post</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="c-feed">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              viewerId={viewer?.id ?? null}
              viewerRole={viewerRole}
              onChange={updatePost}
              onDeleted={() => {
                setPosts((current) => current.filter((item) => item.id !== post.id));
                setTotal((current) => Math.max(0, current - 1));
              }}
            />
          ))}

          <div ref={sentinel} aria-hidden="true" />

          {loading && (
            <div className="c-feed-end" role="status">
              <span className="c-loading-dots"><span /><span /><span /></span>
              <span className="sr-only">Loading more posts</span>
            </div>
          )}
          {!hasMore && posts.length > 0 && (
            <div className="c-feed-end">You are all caught up.</div>
          )}
          {hasMore && !loading && (
            <div className="c-feed-end">
              <button type="button" className="c-button" onClick={() => void loadMore()}>
                <Loader2 size={14} />
                <span>Load more</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
