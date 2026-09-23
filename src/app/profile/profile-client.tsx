"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Code2 as Github, Globe, AtSign as Linkedin, LoaderCircle, MessageCircle, X } from "lucide-react";
import { Pill, SectionHeading } from "@/components/app-shell";
import { ProjectCard } from "@/components/cards";
import { useFollow } from "@/lib/social-client";
import type { Category, Project, Skill } from "@/lib/supabase-data";

export type ProfileData = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
  skills: Skill[];
  categories: Array<{ id: string; name: string }>;
  role: string;
  links: Array<{ platform: string; url: string }>;
  projects: Project[];
};

export function ProfileClient({
  profile,
  categories,
  skills,
  isOwner,
  viewerId,
}: {
  profile: ProfileData;
  categories: Category[];
  skills: Skill[];
  isOwner: boolean;
  viewerId: string | null;
}) {
  const router = useRouter();
  const [currentProfile, setCurrentProfile] = useState(profile);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [avatarError, setAvatarError] = useState(false);

  const [displayName, setDisplayName] = useState(profile.displayName);
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || "");
  const [facebookUrl, setFacebookUrl] = useState(profile.links.find((link) => link.platform.toLowerCase() === "facebook")?.url || "");
  const [youtubeUrl, setYoutubeUrl] = useState(profile.links.find((link) => link.platform.toLowerCase() === "youtube")?.url || "");
  const [categoryIds, setCategoryIds] = useState(profile.categories.map((category) => category.id));
  const [skillIds, setSkillIds] = useState(profile.skills.map((skill) => skill.id));
  const [categorySearch, setCategorySearch] = useState("");
  const follow = useFollow(isOwner ? null : profile.id, viewerId);
  const [followListTab, setFollowListTab] = useState<"followers" | "following" | null>(null);
  const [followLists, setFollowLists] = useState<{ followers: Array<{ follower_id: string; profiles: unknown }>; following: Array<{ following_id: string; profiles: unknown }> }>({ followers: [], following: [] });
  const [followListsLoading, setFollowListsLoading] = useState(false);

  async function loadFollowLists(tab: "followers" | "following") {
    setFollowListTab(tab);
    setFollowListsLoading(true);
    try {
      const res = await fetch(`/api/v1/follows?userId=${encodeURIComponent(profile.id)}`);
      const json = await res.json().catch(() => null);
      if (res.ok && json?.data) {
        setFollowLists({ followers: json.data.followers ?? [], following: json.data.following ?? [] });
      }
    } catch {
      // Keep empty state.
    } finally {
      setFollowListsLoading(false);
    }
  }

  useEffect(() => {
    setFollowListTab(null);
  }, [profile.id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) {
      setError("Display name cannot be empty.");
      return;
    }
    if (!username.trim() || username.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/v1/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          username: username.trim(),
          bio: bio.trim() || null,
          avatarUrl: avatarUrl.trim() || null,
          facebookUrl: facebookUrl.trim() || null,
          youtubeUrl: youtubeUrl.trim() || null,
          categoryIds,
          skillIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to update profile");
      }

      const savedLinks = Array.isArray(data?.data?.social_links)
        ? data.data.social_links.filter((link: { platform?: unknown; url?: unknown }) => typeof link.platform === "string" && typeof link.url === "string")
        : currentProfile.links;
      setCurrentProfile((current) => ({
        ...current,
        displayName: displayName.trim(),
        username: username.trim(),
        bio: bio.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
        links: savedLinks,
        categories: categories.filter((category) => categoryIds.includes(category.id)).map((category) => ({ id: category.id, name: category.name })),
        skills: skills.filter((skill) => skillIds.includes(skill.id)),
      }));

      setSuccess("Profile updated successfully!");
      setTimeout(() => {
        setModalOpen(false);
        setSuccess("");
        router.refresh();
      }, 1000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setLoading(false);
    }
  }

  const initials = currentProfile.displayName.slice(0, 2).toUpperCase() || "ME";
  const visibleLinks = currentProfile.links.filter((link) => link?.url && /^https?:\/\//i.test(link.url));

  return (
    <>
      <div className="profile-header">
        <div className="profile-large" style={{ overflow: "hidden" }}>
          {currentProfile.avatarUrl && !avatarError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentProfile.avatarUrl}
              alt={`${currentProfile.displayName} profile`}
              referrerPolicy="no-referrer"
              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
              onError={() => setAvatarError(true)}
            />
          ) : (
            initials
          )}
        </div>
        <div>
          <div className="eyebrow">Member since {new Date(currentProfile.createdAt).getFullYear()}</div>
          <h1>{currentProfile.displayName}</h1>
          <p>@{currentProfile.username}</p>
          <div className="skill-cloud" style={{ marginTop: 10 }}>
            <Pill tone={currentProfile.role === "admin" || currentProfile.role === "super_admin" ? "coral" : "neutral"}>{currentProfile.role.replaceAll("_", " ")}</Pill>
          </div>
        </div>
        {isOwner ? (
          <button
            onClick={() => setModalOpen(true)}
            className="button button-ghost"
            style={{ marginLeft: "auto" }}
            type="button"
          >
            Edit profile
          </button>
        ) : viewerId ? (
          <button
            type="button"
            onClick={() => void follow.toggle()}
            disabled={follow.loading}
            className={`button ${follow.isFollowing ? "button-ghost" : "button-primary"}`}
            style={{ marginLeft: "auto", fontSize: 12 }}
            aria-pressed={follow.isFollowing}
          >
            {follow.loading ? <LoaderCircle size={13} className="spin" /> : null}
            {follow.isFollowing ? "Following ✓" : "Follow"}
          </button>
        ) : (
          <Link
            href="/login"
            className="button button-primary"
            style={{ marginLeft: "auto" }}
          >
            Follow
          </Link>
        )}
      </div>

      <div className="follow-stats" aria-label="Follower statistics">
        <button type="button" onClick={() => void loadFollowLists("followers")} className="follow-stat" style={{ background: "transparent", border: 0, cursor: "pointer", textAlign: "left", color: "inherit" }}>
          <strong>{follow.initialLoading ? "…" : follow.followersCount}</strong>
          <span>Followers</span>
        </button>
        <button type="button" onClick={() => void loadFollowLists("following")} className="follow-stat" style={{ background: "transparent", border: 0, cursor: "pointer", textAlign: "left", color: "inherit" }}>
          <strong>{follow.initialLoading ? "…" : follow.followingCount}</strong>
          <span>Following</span>
        </button>
      </div>

      {followListTab && (
        <section className="panel" aria-label={followListTab === "followers" ? "Followers" : "Following"}>
          <SectionHeading eyebrow="Community" title={followListTab === "followers" ? "Followers" : "Following"} action={<button type="button" className="button button-ghost" style={{ fontSize: 11 }} onClick={() => setFollowListTab(null)}>Close</button>} />
          {followListsLoading ? (
            <p className="muted-text">Loading…</p>
          ) : (followListTab === "followers" ? followLists.followers : followLists.following).length === 0 ? (
            <p className="muted-text">{followListTab === "followers" ? "No followers yet." : "Not following anyone yet."}</p>
          ) : (
            <div className="follow-list">
              {(followListTab === "followers" ? followLists.followers : followLists.following).map((entry, i) => {
                const raw = entry.profiles as { id?: string; display_name?: string; username?: string; avatar_url?: string | null; bio?: string | null } | Array<{ id?: string; display_name?: string; username?: string; avatar_url?: string | null; bio?: string | null }> | null;
                const p = Array.isArray(raw) ? raw[0] : raw;
                const pid = followListTab === "followers"
                  ? (entry as { follower_id?: string }).follower_id ?? p?.id ?? `row-${i}`
                  : (entry as { following_id?: string }).following_id ?? p?.id ?? `row-${i}`;
                return (
                  <Link key={pid} href={`/profile?member=${encodeURIComponent(pid)}`} className="follow-row">
                    <span className="project-creator-avatar" aria-hidden="true">
                      {p?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.avatar_url} alt="" loading="lazy" />
                      ) : (
                        (p?.display_name ?? "M").slice(0, 2).toUpperCase()
                      )}
                    </span>
                    <span>
                      <strong style={{ display: "block", fontSize: 12 }}>{p?.display_name ?? "Member"}</strong>
                      <span className="member-handle">@{p?.username ?? "member"}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}

      <div className="profile-layout">
        <div>
          <section className="panel">
            <SectionHeading eyebrow="About" title={currentProfile.bio ? "About" : "No bio yet"} />
            <p className="hero-copy">
              {currentProfile.bio || (isOwner ? "Add a short introduction to help members get to know you." : "This member has not added a bio yet.")}
            </p>

            <div className="eyebrow" style={{ marginTop: 28 }}>Skills</div>
            <div className="skill-cloud" style={{ marginTop: 10 }}>
              {currentProfile.categories.length || currentProfile.skills.length ? (
                [...currentProfile.categories.map((category) => category.name), ...currentProfile.skills.map((skill) => skill.name)].map((skill) => <Pill key={skill} tone="lime">{skill}</Pill>)
              ) : (
                <span className="muted-text">{isOwner ? "Add your skills" : "No skills listed yet."}</span>
              )}
            </div>

            {visibleLinks.length > 0 && (
              <div className="skill-cloud" style={{ marginTop: 24 }}>
                {visibleLinks.map((link) => {
                  const platform = link.platform.toLowerCase();
                  const label = platform === "facebook" ? "Facebook" : platform === "youtube" ? "YouTube" : platform === "github" ? "GitHub" : platform === "linkedin" ? "LinkedIn" : platform === "instagram" ? "Instagram" : platform === "x" ? "X" : "Website";

                  return (
                    <Link href={link.url} className="section-link" key={`${platform}-${link.url}`} target="_blank" rel="noreferrer">
                      {platform === "youtube" || platform === "facebook" ? <Globe size={14} /> : platform === "github" ? <Github size={14} /> : platform === "linkedin" ? <Linkedin size={14} /> : <Globe size={14} />} {label}
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <section className="section">
            <SectionHeading
              eyebrow="Selected work"
              title="Projects"
              action={<Link href="/projects" className="section-link">View all projects</Link>}
            />
            {currentProfile.projects.length ? (
              <div className="project-grid">
                {currentProfile.projects.map((project) => (
                  <ProjectCard key={project.id} project={project} userId={viewerId} />
                ))}
              </div>
            ) : (
              <p className="muted-text">No projects added yet.</p>
            )}
          </section>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "var(--overlay)",
            backdropFilter: "blur(8px)",
            zIndex: 100,
            display: "grid",
            placeItems: "center",
            padding: 20,
          }}
          onClick={(e) => { if (e.target === e.currentTarget && !loading) setModalOpen(false); }}
        >
          <div
            style={{
              width: "min(520px, 94vw)",
              background: "var(--popover)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: 28,
              boxShadow: "var(--shadow-lg)",
              position: "relative",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <button
              onClick={() => setModalOpen(false)}
              disabled={loading}
              style={{ position: "absolute", top: 20, right: 20, background: "transparent", border: 0, color: "var(--muted)", cursor: "pointer" }}
              aria-label="Close modal"
            >
              <X size={20} />
            </button>

            <div className="eyebrow" style={{ color: "var(--lime)" }}>Member Settings</div>
            <h2 style={{ fontSize: 24, margin: "8px 0 20px" }}>Edit profile</h2>

            <form onSubmit={handleSave} style={{ display: "grid", gap: 16 }}>
              {error && <p style={{ color: "var(--coral)", fontSize: 12, margin: 0 }}>{error}</p>}
              {success && <p style={{ color: "var(--lime)", fontSize: 12, margin: 0 }}>{success}</p>}

              <div className="field">
                <label>Display Name *</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your full name"
                  required
                />
              </div>

              <div className="field">
                <label>Username *</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  required
                />
              </div>

              <div className="field">
                <label>Avatar URL (optional)</label>
                <input
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="field">
                <label>Facebook</label>
                <input
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  placeholder="https://facebook.com/your-profile"
                />
              </div>

              <div className="field">
                <label>YouTube</label>
                <input
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://youtube.com/@yourchannel"
                />
              </div>

              <div className="field">
                <label>Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell the community what you're working on, learning, or looking for..."
                  rows={4}
                />
              </div>

              <div className="field">
                <label>Skills</label>
                <div className="skill-selector" role="group" aria-label="Select your skills">
                  {skills.map((skill) => {
                    const selected = skillIds.includes(skill.id);
                    return (
                      <button
                        key={skill.id}
                        type="button"
                        className={`skill-option${selected ? " selected" : ""}`}
                        aria-pressed={selected}
                        onClick={() => setSkillIds((current) => selected ? current.filter((id) => id !== skill.id) : [...current, skill.id])}
                      >
                        {skill.name}{selected ? "  ✓" : ""}
                      </button>
                    );
                  })}
                </div>
                {!skillIds.length && <span className="muted-text">Add your skills</span>}
              </div>

              <div className="field">
                <label>Focus areas</label>
                <input
                  value={categorySearch}
                  onChange={(event) => setCategorySearch(event.target.value)}
                  placeholder="Search categories"
                />
                <div className="filter-row" style={{ marginTop: 4 }}>
                  {categories
                    .filter((category) => category.name.toLowerCase().includes(categorySearch.toLowerCase()))
                    .map((category) => {
                      const selected = categoryIds.includes(category.id);
                      return (
                        <button
                          key={category.id}
                          type="button"
                          className={`filter ${selected ? "active" : ""}`}
                          onClick={() => setCategoryIds((current) => selected ? current.filter((id) => id !== category.id) : [...current, category.id])}
                        >
                          {category.name}
                        </button>
                      );
                    })}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="button button-ghost"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={loading}
                >
                  {loading ? <LoaderCircle size={14} className="spin" /> : null}
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
