"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
  isFollowing: boolean;
};

export interface UseFollowOptions {
  onAuthRequired?: () => void;
  initialIsFollowing?: boolean;
  skipInitialFetch?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
}

export function useFollow(
  targetUserId: string | null,
  viewerId: string | null,
  options?: UseFollowOptions,
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

  // Keep latest options in ref to avoid breaking useCallback / useEffect memoization
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Synchronize initialIsFollowing when passed via props without scheduling updates during render
  useEffect(() => {
    if (options?.skipInitialFetch && typeof options?.initialIsFollowing === "boolean") {
      setIsFollowing(options.initialIsFollowing);
    }
  }, [options?.skipInitialFetch, options?.initialIsFollowing]);

  useEffect(() => {
    if (!targetUserId || options?.skipInitialFetch) return;
    const controller = new AbortController();
    fetch(`/api/v1/follows?userId=${encodeURIComponent(targetUserId)}`, { signal: controller.signal })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.data) {
          throw new Error(json?.error?.message || "Could not load follow information.");
        }
        return json.data as FollowResponse;
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        setIsFollowing(targetUserId !== viewerId && Boolean(data.isFollowing));
        setFollowersCount(data.followersCount);
        setFollowingCount(data.followingCount);
        setFollowers(data.followers);
        setFollowing(data.following);
        setError("");
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Could not load follow information.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setInitialLoading(false);
      });
    return () => controller.abort();
  }, [targetUserId, viewerId, options?.skipInitialFetch]);

  const toggle = useCallback(async () => {
    if (!targetUserId) return;
    const targetId = targetUserId;
    if (!viewerId) {
      optionsRef.current?.onAuthRequired?.();
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
      optionsRef.current?.onFollowChange?.(Boolean(json.data.isFollowing));
    } catch (err) {
      setIsFollowing(prev);
      setFollowersCount((c) => Math.max(0, c + (prev ? 1 : -1)));
      setError(err instanceof Error ? err.message : "Could not update follow.");
    } finally {
      setLoading(false);
      pending.current = false;
    }
  }, [targetUserId, viewerId, loading, isFollowing]);

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
  };
}
