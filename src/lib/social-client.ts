"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function useUpvote(projectId: string, initialCount: number, userId: string | null) {
  const [count, setCount] = useState(initialCount);
  const [upvoted, setUpvoted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    if (!userId) {
      setUpvoted(false);
      return;
    }
    let cancelled = false;
    void fetch(`/api/v1/projects/${projectId}/upvote`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json?.data) {
          setCount(json.data.count ?? 0);
          setUpvoted(Boolean(json.data.upvoted));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [projectId, userId]);

  // Realtime upvote count via postgres_changes.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const channel = supabase
      .channel(`upvotes-${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_upvotes", filter: `project_id=eq.${projectId}` }, () => {
        void fetch(`/api/v1/projects/${projectId}/upvote`)
          .then((res) => (res.ok ? res.json() : null))
          .then((json) => {
            if (json?.data) setCount(json.data.count ?? 0);
          })
          .catch(() => {});
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId]);

  const toggle = useCallback(async () => {
    if (!userId || loading || pending.current) return;
    pending.current = true;
    setLoading(true);
    setError("");
    // Optimistic update.
    const prevUpvoted = upvoted;
    const prevCount = count;
    setUpvoted(!prevUpvoted);
    setCount(prevCount + (prevUpvoted ? -1 : 1));
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/upvote`, { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error?.message || "Could not update upvote.");
      setCount(json.data.count);
      setUpvoted(json.data.upvoted);
    } catch (err) {
      setUpvoted(prevUpvoted);
      setCount(prevCount);
      setError(err instanceof Error ? err.message : "Could not update upvote.");
    } finally {
      setLoading(false);
      pending.current = false;
    }
  }, [userId, loading, upvoted, count, projectId]);

  return { count, upvoted, loading, error, toggle };
}

export type SocialComment = {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  profiles?: { id: string; display_name: string; username: string; avatar_url: string | null } | Array<{ id: string; display_name: string; username: string; avatar_url: string | null }> | null;
};

export function useComments(projectId: string) {
  const [comments, setComments] = useState<SocialComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/comments`);
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error?.message || "Could not load comments.");
      setComments(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load comments.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const channel = supabase
      .channel(`comments-${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_comments", filter: `project_id=eq.${projectId}` }, () => {
        void load();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, load]);

  const post = useCallback(async (content: string) => {
    setPosting(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error?.message || "Could not post comment.");
      await load();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post comment.");
      return false;
    } finally {
      setPosting(false);
    }
  }, [projectId, load]);

  return { comments, loading, error, posting, load, post, setComments, setError };
}

export function useFollow(targetUserId: string | null, viewerId: string | null) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const load = useCallback(async () => {
    if (!targetUserId) {
      setInitialLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/v1/follows?userId=${encodeURIComponent(targetUserId)}`);
      const json = await res.json().catch(() => null);
      if (res.ok && json?.data) {
        setIsFollowing(Boolean(json.data.isFollowing));
        setFollowersCount(json.data.followersCount ?? 0);
        setFollowingCount(json.data.followingCount ?? 0);
      }
    } catch {
      // Keep previous state.
    } finally {
      setInitialLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = useCallback(async () => {
    if (!targetUserId || !viewerId || loading || targetUserId === viewerId) return;
    setLoading(true);
    const prev = isFollowing;
    setIsFollowing(!prev);
    setFollowersCount((c) => c + (prev ? -1 : 1));
    try {
      if (prev) {
        const res = await fetch(`/api/v1/follows?followingId=${encodeURIComponent(targetUserId)}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Could not unfollow.");
      } else {
        const res = await fetch("/api/v1/follows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ followingId: targetUserId }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error?.message || "Could not follow.");
      }
    } catch {
      setIsFollowing(prev);
      setFollowersCount((c) => c + (prev ? 1 : -1));
    } finally {
      setLoading(false);
    }
  }, [targetUserId, viewerId, loading, isFollowing]);

  return { isFollowing, followersCount, followingCount, loading, initialLoading, toggle, reload: load };
}

export function commentAuthor(comment: SocialComment): { name: string; username: string; avatar: string | null } {
  const p = Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles;
  return { name: p?.display_name ?? "Member", username: p?.username ?? "member", avatar: p?.avatar_url ?? null };
}
