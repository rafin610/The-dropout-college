"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { BookOpen, Camera, Loader2, Pencil, UserPlus, UserRoundCheck, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { JournalCard } from "@/components/journal/journal-card";
import { PostCard } from "@/components/posts/post-card";
import { ConnectionPreview } from "@/components/profile/connection-preview";
import { timeAgo } from "@/lib/time";
import { compressImage, validateImageSize } from "@/lib/compress-image";
import type { Post } from "@/server/posts/posts";
import type { JournalArticle } from "@/server/journal/types";
import type { MemberRole } from "@/server/auth/roles";
import { AuthPrompt } from "@/components/auth-prompt";
import { useFollow } from "@/lib/social-client";

const FollowListDialog = dynamic(
  () => import("@/components/profile/follow-list-dialog").then((module) => module.FollowListDialog),
  { loading: () => null },
);

export interface MemberProfileData {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  role: MemberRole;
  createdAt: string;
}

type ProfileTab = "posts" | "journals";
type FollowRelationship = "followers" | "following";

export function MemberProfile({
  profile,
  initialPosts,
  journals = [],
  isOwner,
  viewerId,
  viewerRole,
}: {
  profile: MemberProfileData;
  initialPosts: Post[];
  journals?: JournalArticle[];
  isOwner: boolean;
  viewerId: string | null;
  viewerRole: MemberRole;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<ProfileTab>("posts");
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [posts, setPosts] = useState(initialPosts);
  const [authPrompt, setAuthPrompt] = useState(false);
  const [followList, setFollowList] = useState<FollowRelationship | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const closeFollowList = useCallback(() => setFollowList(null), []);
  const follow = useFollow(profile.id, viewerId, {
    onAuthRequired: () => setAuthPrompt(true),
  });

  const canShowJournals = profile.role === "admin" || profile.role === "moderator";
  const roleLabel = profile.role === "admin" ? "Admin" : profile.role === "moderator" ? "Moderator" : "Member";

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function cancelEdit() {
    setEditing(false);
    setDisplayName(profile.displayName);
    setUsername(profile.username);
    setBio(profile.bio || "");
    setAvatarUrl(profile.avatarUrl);
    setFile(null);
    setError("");
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setError("");

    try {
      let nextAvatar = avatarUrl;
      if (file) {
        const sizeError = validateImageSize(file);
        if (sizeError) throw new Error(sizeError);
        const optimized = await compressImage(file, { maxWidth: 640, maxHeight: 640, quality: 0.86 });
        const body = new FormData();
        body.append("file", optimized);
        const upload = await fetch("/api/v1/profile/avatar", { method: "POST", body });
        const uploaded = (await upload.json().catch(() => null)) as
          | { data?: { url?: string }; error?: { message?: string } }
          | null;
        if (!upload.ok || !uploaded?.data?.url) {
          throw new Error(uploaded?.error?.message || "The photo could not be uploaded.");
        }
        nextAvatar = uploaded.data.url;
        setAvatarUrl(nextAvatar);
        setFile(null);
      }

      const response = await fetch("/api/v1/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          username: username.trim().toLowerCase(),
          bio: bio.trim() || null,
          avatarUrl: nextAvatar || null,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null;
      if (!response.ok) {
        throw new Error(payload?.error?.message || "Your profile could not be saved.");
      }

      window.dispatchEvent(
        new CustomEvent("profile-updated", {
          detail: { displayName, avatarUrl: nextAvatar },
        }),
      );
      setEditing(false);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Your profile could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  const shownAvatar = preview || avatarUrl;
  return (
    <div className="c-page c-profile-page">
      <section className="c-profile-card">
        <div className="c-profile-banner" aria-hidden="true" />
        <div className="c-profile-body">
          <div className="c-profile-avatar-row">
            <div className="c-profile-avatar-wrap">
              <Avatar src={shownAvatar} name={displayName} size={82} className="c-profile-avatar" />
              {editing && (
                <>
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="c-file-input"
                    onChange={(event) => {
                      setError("");
                      setFile(event.target.files?.[0] ?? null);
                      event.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    className="c-profile-photo-button"
                    onClick={() => inputRef.current?.click()}
                    aria-label="Change profile photo"
                    title="Change photo"
                  >
                    <Camera size={15} />
                  </button>
                </>
              )}
            </div>

            {isOwner && !editing && (
              <div className="c-profile-actions">
                {canShowJournals && (
                  <Link href="/journal/studio" className="c-button">
                    <BookOpen size={14} />
                    <span>Studio</span>
                  </Link>
                )}
                <button type="button" className="c-button" onClick={() => setEditing(true)}>
                  <Pencil size={14} />
                  <span>Edit profile</span>
                </button>
              </div>
            )}
            {editing && (
              <button type="button" className="c-button" onClick={cancelEdit} disabled={saving}>
                <X size={14} />
                <span>Cancel</span>
              </button>
            )}
          </div>

          {!editing ? (
            <>
              <h1 className="c-profile-name">{displayName}</h1>
              <p className="c-profile-handle">@{username}</p>
              {bio && <p className="c-profile-bio">{bio}</p>}
              <div className="c-profile-meta">
                <span className={`c-role-badge ${profile.role}`}>{roleLabel}</span>
                <span>
                  Joined {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </span>
              </div>
              {!isOwner && (
                <button
                  type="button"
                  className={`member-follow-button c-profile-follow${follow.isFollowing ? " following" : ""}`}
                  onClick={() => void follow.toggle()}
                  disabled={follow.initialLoading || follow.loading}
                  aria-pressed={follow.isFollowing}
                >
                  {follow.loading ? (
                    <Loader2 size={15} className="spin" />
                  ) : follow.isFollowing ? (
                    <UserRoundCheck size={15} />
                  ) : (
                    <UserPlus size={15} />
                  )}
                  {follow.loading ? "Updating…" : follow.isFollowing ? "Following" : "Follow"}
                </button>
              )}
            </>
          ) : (
            <div className="c-form">
              {error && <p className="c-error" role="alert">{error}</p>}
              <div className="c-field">
                <label htmlFor="profile-name">Display name</label>
                <input
                  id="profile-name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  maxLength={80}
                />
              </div>
              <div className="c-field">
                <label htmlFor="profile-username">Username</label>
                <input
                  id="profile-username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())}
                  maxLength={32}
                />
                <span className="c-field-help">Letters, numbers, and underscores. This is your public profile link.</span>
              </div>
              <div className="c-field">
                <label htmlFor="profile-bio">Bio</label>
                <textarea
                  id="profile-bio"
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  maxLength={500}
                  placeholder="A short line about what you are learning or making."
                />
                <span className="c-field-help">{500 - bio.length} characters left</span>
              </div>
              <div className="c-actions-row">
                <button
                  type="button"
                  className="c-button c-button-primary"
                  onClick={() => void save()}
                  disabled={saving || !displayName.trim() || username.trim().length < 3}
                >
                  {saving ? <Loader2 size={14} className="spin" /> : null}
                  <span>{saving ? "Saving…" : "Save profile"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="profile-connections" aria-label="Member connections">
        <div className="profile-connection-group">
          <ConnectionPreview
            label="Followers"
            count={follow.followersCount}
            people={follow.followers}
            loading={follow.initialLoading}
            onClick={() => setFollowList("followers")}
          />
          {follow.error && <p className="member-follow-error" role="alert">{follow.error}</p>}
        </div>
        <div className="profile-connection-group">
          <ConnectionPreview
            label="Following"
            count={follow.followingCount}
            people={follow.following}
            loading={follow.initialLoading}
            onClick={() => setFollowList("following")}
          />
        </div>
      </section>
      {followList && (
        <FollowListDialog
          userId={profile.id}
          relationship={followList}
          onClose={closeFollowList}
        />
      )}

      <div className="profile-tabs" role="tablist" aria-label="Profile content">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "posts"}
          className={tab === "posts" ? "active" : ""}
          onClick={() => setTab("posts")}
        >
          Posts
        </button>
        {canShowJournals && (
          <button
            type="button"
            role="tab"
            aria-selected={tab === "journals"}
            className={tab === "journals" ? "active" : ""}
            onClick={() => setTab("journals")}
          >
            Journals
          </button>
        )}
      </div>

      {tab === "posts" ? (
        <section className="c-profile-posts" aria-label="Posts">
          {posts.length === 0 ? (
            <div className="c-empty">
              <h3>{isOwner ? "You have not posted yet" : "No posts yet"}</h3>
              <p>{isOwner ? "Share a short thought. It takes a minute." : "When they post, it will appear here."}</p>
              {isOwner && (
                <Link href="/post" className="c-button c-button-primary">Write a post</Link>
              )}
            </div>
          ) : (
            <div className="c-feed">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  viewerId={viewerId}
                  viewerRole={viewerRole}
                  onChange={(next) => setPosts((current) => current.map((item) => (item.id === next.id ? next : item)))}
                  onDeleted={() => setPosts((current) => current.filter((item) => item.id !== post.id))}
                />
              ))}
            </div>
          )}
          {posts.length === 1 && <p className="c-feed-end">Last posted {timeAgo(posts[0].createdAt)}</p>}
        </section>
      ) : (
        <section className="c-profile-journals" aria-label="Journals">
          {journals.length === 0 ? (
            <div className="c-empty">
              <div className="c-empty-icon"><BookOpen size={20} /></div>
              <h3>No published journals yet</h3>
              <p>{isOwner ? "Your published essays will appear here." : "When they publish, it will appear here."}</p>
              {isOwner && (
                <Link href="/journal/studio" className="c-button c-button-primary">Open the studio</Link>
              )}
            </div>
          ) : (
            <div className="journal-grid profile-journal-grid">
              {journals.map((article) => (
                <JournalCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </section>
      )}
      <AuthPrompt open={authPrompt} action="follow" onClose={() => setAuthPrompt(false)} />
    </div>
  );
}
