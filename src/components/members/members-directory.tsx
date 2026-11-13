"use client";

import { Search, UsersRound, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AuthPrompt } from "@/components/auth-prompt";
import { MemberCard } from "@/components/members/member-card";
import type { DirectoryMember } from "@/components/members/types";

type DirectoryResponse = {
  data?: {
    members?: DirectoryMember[];
    followingIds?: string[];
    total?: number;
    hasMore?: boolean;
  };
  error?: { message?: string };
};

export function MembersDirectory({
  members,
  viewerId,
  initialFollowingIds,
  initialTotal,
}: {
  members: DirectoryMember[];
  viewerId: string | null;
  initialFollowingIds: string[];
  initialTotal: number;
}) {
  const [query, setQuery] = useState("");
  const [visibleMembers, setVisibleMembers] = useState(members);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(members.length < initialTotal);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [directoryError, setDirectoryError] = useState("");
  const [retrySearch, setRetrySearch] = useState(0);
  const [followState, setFollowState] = useState<{ viewerId: string | null; ids: Set<string> }>(() => ({
    viewerId,
    ids: new Set(initialFollowingIds),
  }));
  const [authPrompt, setAuthPrompt] = useState(false);
  const moreController = useRef<AbortController | null>(null);
  const morePending = useRef(false);

  useEffect(() => {
    const search = query.trim();
    if (!search) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setDirectoryError("");
      const params = new URLSearchParams({ page: "1", search });
      try {
        const response = await fetch(`/api/v1/members?${params}`, { signal: controller.signal });
        const payload = (await response.json().catch(() => null)) as DirectoryResponse | null;
        if (!response.ok || !payload?.data) {
          throw new Error(payload?.error?.message || "Could not search members.");
        }
        if (controller.signal.aborted) return;
        const pageMembers = payload.data.members ?? [];
        setVisibleMembers(pageMembers);
        setFollowState((current) => {
          const ids = new Set(current.viewerId === viewerId ? current.ids : initialFollowingIds);
          for (const member of pageMembers) ids.delete(member.id);
          for (const id of payload.data?.followingIds ?? []) ids.add(id);
          return { viewerId, ids };
        });
        setTotal(payload.data.total ?? 0);
        setPage(1);
        setHasMore(Boolean(payload.data.hasMore));
      } catch (error) {
        if (!controller.signal.aborted) {
          setDirectoryError(error instanceof Error ? error.message : "Could not search members.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [initialFollowingIds, query, retrySearch, viewerId]);

  const handleFollowChange = useCallback((memberId: string, isFollowing: boolean) => {
    setFollowState((current) => {
      const next = new Set(
        current.viewerId === viewerId ? current.ids : initialFollowingIds,
      );
      if (isFollowing) next.add(memberId);
      else next.delete(memberId);
      return { viewerId, ids: next };
    });
  }, [initialFollowingIds, viewerId]);
  const followingIds = followState.viewerId === viewerId
    ? followState.ids
    : new Set(initialFollowingIds);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore || morePending.current) return;
    morePending.current = true;
    const controller = new AbortController();
    moreController.current = controller;
    setLoadingMore(true);
    setDirectoryError("");
    const nextPage = page + 1;
    const params = new URLSearchParams({ page: String(nextPage) });
    if (query.trim()) params.set("search", query.trim());
    try {
      const response = await fetch(`/api/v1/members?${params}`, { signal: controller.signal });
      const payload = (await response.json().catch(() => null)) as DirectoryResponse | null;
      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error?.message || "Could not load more members.");
      }
      if (controller.signal.aborted) return;
      const pageMembers = payload.data.members ?? [];
      setVisibleMembers((current) => [...current, ...pageMembers]);
      setFollowState((current) => {
        const ids = new Set(current.viewerId === viewerId ? current.ids : initialFollowingIds);
        for (const member of pageMembers) ids.delete(member.id);
        for (const id of payload.data?.followingIds ?? []) ids.add(id);
        return { viewerId, ids };
      });
      setTotal(payload.data.total ?? 0);
      setPage(nextPage);
      setHasMore(Boolean(payload.data.hasMore));
    } catch (error) {
      if (!controller.signal.aborted) {
        setDirectoryError(error instanceof Error ? error.message : "Could not load more members.");
      }
    } finally {
      morePending.current = false;
      if (moreController.current === controller) moreController.current = null;
      setLoadingMore(false);
    }
  }, [hasMore, initialFollowingIds, loading, loadingMore, page, query, viewerId]);

  function updateSearch(value: string) {
    moreController.current?.abort();
    setQuery(value);
    setDirectoryError("");
    setVisibleMembers([]);
    setTotal(0);
    setPage(1);
    setHasMore(false);
    if (value.trim()) {
      setLoading(true);
    } else {
      setVisibleMembers(members);
      setTotal(initialTotal);
      setHasMore(members.length < initialTotal);
      setLoading(false);
    }
  }

  return (
    <div className="members-directory">
      <div className="members-search">
        <Search size={17} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => updateSearch(event.target.value)}
          placeholder="Search by name, username, or interest…"
          aria-label="Search members"
          autoComplete="off"
        />
        {query && (
          <button type="button" onClick={() => updateSearch("")} aria-label="Clear member search">
            <X size={15} />
          </button>
        )}
      </div>

      <div className="members-results-meta" aria-live="polite">
        <span>
          {total.toLocaleString()} {total === 1 ? "member" : "members"}
        </span>
        {query.trim() && <span>Matching “{query.trim()}”</span>}
      </div>

      {directoryError && (
        <div className="c-error" role="alert">
          <span>{directoryError}</span>
          {query.trim() ? (
            <button type="button" className="c-button" onClick={() => {
              setLoading(true);
              setRetrySearch((key) => key + 1);
            }}>
              Try again
            </button>
          ) : hasMore ? (
            <button type="button" className="c-button" onClick={() => void loadMore()}>
              Try again
            </button>
          ) : null}
        </div>
      )}

      {visibleMembers.length > 0 ? (
        <div className="members-grid">
          {visibleMembers.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              viewerId={viewerId}
              isFollowing={followingIds.has(member.id)}
              followStateLoading={false}
              onFollowChange={(isFollowing) => handleFollowChange(member.id, isFollowing)}
              onAuthRequired={() => setAuthPrompt(true)}
            />
          ))}
        </div>
      ) : loading ? (
        <p className="members-loading" role="status">Loading members…</p>
      ) : (
        <div className="c-empty">
          <div className="c-empty-icon">
            <UsersRound size={20} />
          </div>
          <h2>No members found</h2>
          <p>Try a different name, username, or a broader phrase.</p>
          <button type="button" className="c-button" onClick={() => updateSearch("")}>
            Clear search
          </button>
        </div>
      )}
      {hasMore && visibleMembers.length > 0 && (
        <button
          type="button"
          className="members-load-more c-button"
          onClick={() => void loadMore()}
          disabled={loadingMore || loading}
        >
          {loadingMore ? "Loading…" : "Load more members"}
        </button>
      )}
      <AuthPrompt open={authPrompt} action="follow" onClose={() => setAuthPrompt(false)} />
    </div>
  );
}
