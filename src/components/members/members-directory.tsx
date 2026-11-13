"use client";

import { Search, UsersRound, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthPrompt } from "@/components/auth-prompt";
import { MemberCard } from "@/components/members/member-card";
import type { DirectoryMember } from "@/components/members/types";

export function MembersDirectory({
  members,
  viewerId,
}: {
  members: DirectoryMember[];
  viewerId: string | null;
}) {
  const [query, setQuery] = useState("");
  const [followState, setFollowState] = useState<{ viewerId: string; ids: Set<string> } | null>(null);
  const [followLoadFailure, setFollowLoadFailure] = useState<{ viewerId: string; message: string } | null>(null);
  const [authPrompt, setAuthPrompt] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!viewerId) return;
    const currentViewerId = viewerId;

    let cancelled = false;

    async function loadFollowing() {
      try {
        const response = await fetch(`/api/v1/follows?userId=${encodeURIComponent(currentViewerId)}`);
        const payload = await response.json().catch(() => null);
        if (!response.ok || !Array.isArray(payload?.data?.followingIds)) {
          throw new Error(payload?.error?.message || "Could not load following information.");
        }
        if (!cancelled) {
          setFollowState({ viewerId: currentViewerId, ids: new Set(payload.data.followingIds as string[]) });
          setFollowLoadFailure(null);
        }
      } catch (error) {
        if (!cancelled) {
          setFollowLoadFailure({
            viewerId: currentViewerId,
            message: error instanceof Error ? error.message : "Could not load following information.",
          });
        }
      }
    }

    void loadFollowing();
    return () => {
      cancelled = true;
    };
  }, [viewerId, reloadKey]);

  const handleFollowChange = useCallback((memberId: string, isFollowing: boolean) => {
    setFollowState((current) => {
      if (!current) return current;
      const next = new Set(current.ids);
      if (isFollowing) next.add(memberId);
      else next.delete(memberId);
      return { ...current, ids: next };
    });
  }, []);
  const followingIds = followState?.viewerId === viewerId ? followState.ids : new Set<string>();
  const followStatesLoading = Boolean(viewerId) && followState?.viewerId !== viewerId &&
    followLoadFailure?.viewerId !== viewerId;
  const followStatesError = followLoadFailure?.viewerId === viewerId ? followLoadFailure.message : "";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;

    return members.filter((member) => {
      const haystack = [member.displayName, member.username, member.bio || "", member.role]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [members, query]);

  return (
    <div className="members-directory">
      <div className="members-search">
        <Search size={17} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, username, or interest…"
          aria-label="Search members"
          autoComplete="off"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="Clear member search">
            <X size={15} />
          </button>
        )}
      </div>

      <div className="members-results-meta" aria-live="polite">
        <span>
          {filtered.length} {filtered.length === 1 ? "member" : "members"}
        </span>
        {query && <span>Matching “{query.trim()}”</span>}
      </div>

      {followStatesError && (
        <div className="c-error" role="alert">
          <span>{followStatesError}</span>
          <button type="button" className="c-button" onClick={() => setReloadKey((key) => key + 1)}>
            Try again
          </button>
        </div>
      )}

      {filtered.length > 0 ? (
        <div className="members-grid">
          {filtered.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              viewerId={viewerId}
              isFollowing={followingIds.has(member.id)}
              followStateLoading={followStatesLoading || Boolean(followStatesError)}
              onFollowChange={(isFollowing) => handleFollowChange(member.id, isFollowing)}
              onAuthRequired={() => setAuthPrompt(true)}
            />
          ))}
        </div>
      ) : (
        <div className="c-empty">
          <div className="c-empty-icon">
            <UsersRound size={20} />
          </div>
          <h2>No members found</h2>
          <p>Try a different name, username, or a broader phrase.</p>
          <button type="button" className="c-button" onClick={() => setQuery("")}>
            Clear search
          </button>
        </div>
      )}
      <AuthPrompt open={authPrompt} action="follow" onClose={() => setAuthPrompt(false)} />
    </div>
  );
}
