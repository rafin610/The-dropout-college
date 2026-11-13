"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function useUpvote(projectId: string, initialCount: number, userId: string | null, options?: { onAuthRequired?: () => void }) {
  const [count, setCount] = useState(initialCount);
  const [upvoted, setUpvoted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pulse, setPulse] = useState(0);
  const pending = useRef(false);

  // Sync count if initialCount prop changes during render
  const [prevInitialCount, setPrevInitialCount] = useState(initialCount);
  if (initialCount !== prevInitialCount) {
    setPrevInitialCount(initialCount);
    setCount(initialCount);
  }

  // Clear upvoted if userId changes to null during render
  const [prevUserId, setPrevUserId] = useState(userId);
  if (userId !== prevUserId) {
    setPrevUserId(userId);
    if (!userId) setUpvoted(false);
  }

  useEffect(() => {
    if (!userId) return;
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
    if (!userId) {
      options?.onAuthRequired?.();
      return;
    }
    if (loading || pending.current) return;
    pending.current = true;
    setLoading(true);
    setError("");
    // Optimistic update.
    const prevUpvoted = upvoted;
    const prevCount = count;
    setUpvoted(!prevUpvoted);
    setCount(prevCount + (prevUpvoted ? -1 : 1));
    setPulse((p) => p + 1);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, loading, upvoted, count, projectId, options?.onAuthRequired]);

  return { count, upvoted, loading, error, pulse, toggle };
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

  const fetchComments = useCallback(async () => {
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
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/v1/projects/${projectId}/comments`);
        const json = await res.json().catch(() => null);
        if (!cancelled) {
          if (!res.ok) {
            setError(json?.error?.message || "Could not load comments.");
          } else {
            setComments(json.data ?? []);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load comments.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const channel = supabase
      .channel(`comments-${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_comments", filter: `project_id=eq.${projectId}` }, () => {
        void fetchComments();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, fetchComments]);

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
      setComments((prev) => [json.data, ...prev]);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post comment.");
      return false;
    } finally {
      setPosting(false);
    }
  }, [projectId]);

  return { comments, loading, error, posting, load: fetchComments, post, setComments, setError };
}

export type FollowMember = {
  follower_id?: string;
  following_id?: string;
  profiles?: FollowProfile | FollowProfile[] | null;
};

export type FollowProfile = {
    id: string;
    display_name: string;
    username: string;
    avatar_url: string | null;
};

type FollowResponse = {
  followersCount: number;
  followingCount: number;
  followers: FollowMember[];
  following: FollowMember[];
  followingIds: string[];
  isFollowing: boolean;
};

export function useFollow(
  targetUserId: string | null,
  viewerId: string | null,
  options?: {
    onAuthRequired?: () => void;
    initialIsFollowing?: boolean;
    skipInitialFetch?: boolean;
    onFollowChange?: (isFollowing: boolean) => void;
  },
) {
  const [isFollowing, setIsFollowing] = useState(options?.initialIsFollowing ?? false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followers, setFollowers] = useState<FollowMember[]>([]);
  const [following, setFollowing] = useState<FollowMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(Boolean(targetUserId) && !options?.skipInitialFetch);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const [previousFollowInput, setPreviousFollowInput] = useState({
    targetUserId,
    initialIsFollowing: options?.initialIsFollowing,
  });
  if (
    options?.skipInitialFetch &&
    (previousFollowInput.targetUserId !== targetUserId ||
      previousFollowInput.initialIsFollowing !== options.initialIsFollowing)
  ) {
    setPreviousFollowInput({ targetUserId, initialIsFollowing: options.initialIsFollowing });
    setIsFollowing(Boolean(options.initialIsFollowing));
  }

  const fetchFollowStatus = useCallback(async () => {
    if (!targetUserId) return;
    try {
      const res = await fetch(`/api/v1/follows?userId=${encodeURIComponent(targetUserId)}`);
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.data) throw new Error(json?.error?.message || "Could not load follow information.");
      const data = json.data as FollowResponse;
      setIsFollowing(targetUserId !== viewerId && Boolean(data.isFollowing));
      setFollowersCount(data.followersCount);
      setFollowingCount(data.followingCount);
      setFollowers(data.followers);
      setFollowing(data.following);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load follow information.");
    } finally {
      setInitialLoading(false);
    }
  }, [targetUserId, viewerId]);

  useEffect(() => {
    if (!targetUserId || options?.skipInitialFetch) return;
    const targetId = targetUserId;
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/v1/follows?userId=${encodeURIComponent(targetId)}`);
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.data) throw new Error(json?.error?.message || "Could not load follow information.");
        if (cancelled) return;
        const data = json.data as FollowResponse;
        setIsFollowing(targetId !== viewerId && Boolean(data.isFollowing));
        setFollowersCount(data.followersCount);
        setFollowingCount(data.followingCount);
        setFollowers(data.followers);
        setFollowing(data.following);
        setError("");
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load follow information.");
      } finally {
        if (!cancelled) {
          setInitialLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [targetUserId, viewerId, options?.skipInitialFetch]);

  const toggle = useCallback(async () => {
    if (!targetUserId) return;
    const targetId = targetUserId;
    if (!viewerId) {
      options?.onAuthRequired?.();
      return;
    }
    if (loading || pending.current || targetId === viewerId) return;
    pending.current = true;
    setLoading(true);
    setError("");
    const prev = isFollowing;
    const next = !prev;
    setIsFollowing(next);
    setFollowersCount((c) => Math.max(0, c + (next ? 1 : -1)));
    try {
      const res = next
        ? await fetch("/api/v1/follows", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ followingId: targetId }),
          })
        : await fetch(`/api/v1/follows?followingId=${encodeURIComponent(targetId)}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error?.message || "Could not update follow.");
      setIsFollowing(Boolean(json.data.isFollowing));
      setFollowersCount(json.data.followersCount);
      setFollowingCount(json.data.followingCount);
      options?.onFollowChange?.(Boolean(json.data.isFollowing));
      await fetchFollowStatus();
    } catch (err) {
      setIsFollowing(prev);
      setFollowersCount((c) => Math.max(0, c + (prev ? 1 : -1)));
      setError(err instanceof Error ? err.message : "Could not update follow.");
    } finally {
      setLoading(false);
      pending.current = false;
    }
  }, [targetUserId, viewerId, loading, isFollowing, options, fetchFollowStatus]);

  return {
    isFollowing,
    followersCount,
    followingCount,
    followers,
    following,
    loading,
    initialLoading,
    error,
    toggle,
    reload: fetchFollowStatus,
  };
}

export function commentAuthor(comment: SocialComment): { name: string; username: string; avatar: string | null } {
  const p = Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles;
  return { name: p?.display_name ?? "Member", username: p?.username ?? "member", avatar: p?.avatar_url ?? null };
}
