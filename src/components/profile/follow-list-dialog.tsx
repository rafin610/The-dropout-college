"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import type { FollowMember, FollowProfile } from "@/lib/social-client";

export type FollowListRelationship = "followers" | "following";

type FollowListResponse = {
  data?: {
    members?: FollowMember[];
    total?: number;
    hasMore?: boolean;
  };
  error?: { message?: string };
};

function profileFor(row: FollowMember): FollowProfile | null {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return profile ?? null;
}

export function FollowListDialog({
  userId,
  relationship,
  onClose,
}: {
  userId: string;
  relationship: FollowListRelationship;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [members, setMembers] = useState<FollowMember[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const moreController = useRef<AbortController | null>(null);
  const morePending = useRef(false);
  const title = relationship === "followers" ? "Followers" : "Following";

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    searchInputRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), a[href]',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({
        userId,
        view: "list",
        relationship,
        page: "1",
        limit: "30",
      });
      if (search.trim()) params.set("search", search.trim());

      try {
        const response = await fetch(`/api/v1/follows?${params}`, { signal: controller.signal });
        const payload = (await response.json().catch(() => null)) as FollowListResponse | null;
        if (!response.ok || !payload?.data) {
          throw new Error(payload?.error?.message || `Could not load ${title.toLowerCase()}.`);
        }
        if (controller.signal.aborted) return;
        setMembers(payload.data.members ?? []);
        setTotal(payload.data.total ?? 0);
        setPage(1);
        setHasMore(Boolean(payload.data.hasMore));
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setMembers([]);
          setTotal(0);
          setHasMore(false);
          setError(loadError instanceof Error ? loadError.message : `Could not load ${title.toLowerCase()}.`);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, search.trim() ? 200 : 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [userId, relationship, search, retry, title]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || morePending.current) return;
    morePending.current = true;
    const controller = new AbortController();
    moreController.current = controller;
    const nextPage = page + 1;
    setLoadingMore(true);
    setError("");
    const params = new URLSearchParams({
      userId,
      view: "list",
      relationship,
      page: String(nextPage),
      limit: "30",
    });
    if (search.trim()) params.set("search", search.trim());

    try {
      const response = await fetch(`/api/v1/follows?${params}`, { signal: controller.signal });
      const payload = (await response.json().catch(() => null)) as FollowListResponse | null;
      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error?.message || `Could not load more ${title.toLowerCase()}.`);
      }
      if (controller.signal.aborted) return;
      const data = payload.data;
      setMembers((current) => [...current, ...(data.members ?? [])]);
      setTotal(data.total ?? 0);
      setPage(nextPage);
      setHasMore(Boolean(data.hasMore));
    } catch (loadError) {
      if (!controller.signal.aborted) {
        setError(loadError instanceof Error ? loadError.message : `Could not load more ${title.toLowerCase()}.`);
      }
    } finally {
      morePending.current = false;
      if (moreController.current === controller) moreController.current = null;
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, page, relationship, search, title, userId]);

  function updateSearch(value: string) {
    moreController.current?.abort();
    setSearch(value);
    setMembers([]);
    setTotal(0);
    setHasMore(false);
    setLoading(true);
    setLoadingMore(false);
  }

  return (
    <div
      className="follow-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="follow-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="follow-dialog-title"
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
      >
        <header className="follow-dialog-header">
          <div>
            <h2 id="follow-dialog-title">{title}</h2>
            <p>{total.toLocaleString()} {total === 1 ? "person" : "people"}</p>
          </div>
          <button type="button" className="follow-dialog-close" onClick={onClose} aria-label="Close list">
            <X size={18} />
          </button>
        </header>

        <label className="follow-dialog-search">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search {title.toLowerCase()}</span>
          <input
            ref={searchInputRef}
            type="search"
            value={search}
            onChange={(event) => updateSearch(event.target.value)}
            placeholder={`Search ${title.toLowerCase()}`}
            autoComplete="off"
          />
        </label>

        <div className="follow-dialog-scroll" aria-live="polite">
          {loading && members.length === 0 ? (
            <div className="follow-dialog-skeletons" role="status" aria-label={`Loading ${title.toLowerCase()}`}>
              {[0, 1, 2].map((item) => <span className="follow-dialog-skeleton" key={item} />)}
            </div>
          ) : error && members.length === 0 ? (
            <div className="follow-dialog-empty">
              <p role="alert">{error}</p>
              <button type="button" className="c-button" onClick={() => setRetry((current) => current + 1)}>
                Try again
              </button>
            </div>
          ) : members.length === 0 ? (
            <p className="follow-dialog-empty">
              {search.trim() ? "No accounts match your search." : `No ${title.toLowerCase()} yet.`}
            </p>
          ) : (
            <ul className="follow-dialog-list">
              {members.map((row) => {
                const profile = profileFor(row);
                const id = profile?.id ?? row.follower_id ?? row.following_id;
                if (!id) return null;
                const name = profile?.display_name || "Campus member";
                const username = profile?.username || id;
                return (
                  <li key={id}>
                    <Link
                      href={`/profile/${encodeURIComponent(username)}`}
                      className="follow-dialog-person"
                      onClick={onClose}
                    >
                      <Avatar src={profile?.avatar_url ?? null} name={name} size={40} />
                      <span>
                        <strong>{name}</strong>
                        <small>@{profile?.username || "member"}</small>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {error && members.length > 0 && <p className="follow-dialog-inline-error" role="alert">{error}</p>}
        </div>

        {hasMore && (
          <button
            type="button"
            className="follow-dialog-more"
            onClick={() => void loadMore()}
            disabled={loadingMore || loading}
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        )}
      </div>
    </div>
  );
}
