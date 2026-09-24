"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  Check,
  Code2 as Github,
  Copy,
  Ellipsis,
  FlaskConical,
  FolderKanban,
  Globe,
  AtSign as Linkedin,
  LoaderCircle,
  Share2,
  Sparkles,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { timeAgo } from "@/components/app-shell";
import { useFollow } from "@/lib/social-client";
import type { Category, Project, Skill } from "@/lib/supabase-data";

export type ProfileBadge = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  awardedAt: string | null;
};

export type ProfileActivityItem = {
  id: string;
  kind: "project" | "discussion" | "achievement" | "joined";
  title: string;
  subtitle: string | null;
  projectId: string | null;
  at: string;
};

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
  badges: ProfileBadge[];
  activity: ProfileActivityItem[];
  contributions: number;
};

type TabId = "about" | "skills" | "projects" | "activity" | "achievements";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "about", label: "About" },
  { id: "skills", label: "Skills" },
  { id: "projects", label: "Projects" },
  { id: "activity", label: "Activity" },
  { id: "achievements", label: "Achievements" },
];

function roleLabel(role: string): string {
  const clean = role.replaceAll("_", " ").trim() || "member";
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function projectStatusLabel(status?: string | null): string {
  const s = (status || "").toLowerCase();
  if (s === "in_progress" || s === "building" || s === "active") return "Building";
  if (s === "launched" || s === "live") return "Launched";
  if (s === "recruiting") return "Recruiting";
  if (s === "archived") return "Archived";
  return "Idea";
}

function formatMonthYear(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function socialLabel(platform: string): string {
  const p = platform.toLowerCase();
  if (p === "github") return "GitHub";
  if (p === "linkedin") return "LinkedIn";
  if (p === "instagram") return "Instagram";
  if (p === "facebook") return "Facebook";
  if (p === "youtube") return "YouTube";
  if (p === "x" || p === "twitter") return "X";
  if (p === "website" || p === "portfolio" || p === "blog") return "Website";
  return platform.charAt(0).toUpperCase() + platform.slice(1);
}

function SocialIcon({ platform, size = 15 }: { platform: string; size?: number }) {
  const p = platform.toLowerCase();
  if (p === "github") return <Github size={size} aria-hidden="true" />;
  if (p === "linkedin") return <Linkedin size={size} aria-hidden="true" />;
  return <Globe size={size} aria-hidden="true" />;
}

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
  const [followLists, setFollowLists] = useState<{ followers: Array<{ follower_id?: string; profiles: unknown }>; following: Array<{ following_id?: string; profiles: unknown }> }>({ followers: [], following: [] });
  const [followListsLoading, setFollowListsLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<TabId>("about");
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "copied" | "failed">("idle");
  const menuRef = useRef<HTMLDivElement | null>(null);
  const shareTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initials = currentProfile.displayName.slice(0, 2).toUpperCase() || "ME";
  const joinedYear = new Date(currentProfile.createdAt).getFullYear();
  const visibleLinks = currentProfile.links.filter((link) => link?.url && /^https?:\/\//i.test(link.url));
  const profileUrl = `/profile?member=${encodeURIComponent(currentProfile.id)}`;

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

  // Scroll-spy for the profile tabs.
  useEffect(() => {
    const sections = TABS.map((t) => document.getElementById(`pf-${t.id}`)).filter((el): el is HTMLElement => Boolean(el));
    if (!sections.length || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id.replace("pf-", "") as TabId;
            setActiveTab(id);
          }
        }
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  // Close the overflow menu on outside click / Escape.
  useEffect(() => {
    if (!menuOpen && !followListTab) return;
    function onPointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setFollowListTab(null);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen, followListTab]);

  useEffect(() => {
    return () => {
      if (shareTimer.current) clearTimeout(shareTimer.current);
    };
  }, []);

  function scrollToSection(id: TabId) {
    setActiveTab(id);
    document.getElementById(`pf-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function copyProfileLink(): Promise<boolean> {
    const absolute = `${window.location.origin}${profileUrl}`;
    try {
      await navigator.clipboard.writeText(absolute);
      return true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = absolute;
        ta.setAttribute("readonly", "");
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        return true;
      } catch {
        return false;
      }
    }
  }

  async function handleShare() {
    const ok = await copyProfileLink();
    setShareState(ok ? "copied" : "failed");
    if (shareTimer.current) clearTimeout(shareTimer.current);
    shareTimer.current = setTimeout(() => setShareState("idle"), 2200);
  }

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

  const listRows = followListTab === "followers" ? followLists.followers : followLists.following;

  return (
    <div className="pf">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="pf-hero">
        <div className="pf-cover" aria-hidden="true">
          <span className="pf-cover-grid" />
          <span className="pf-cover-glow" />
          <span className="pf-cover-grain" />
        </div>
        <div className="pf-head">
          <div className="pf-avatar" style={{ overflow: "hidden" }}>
            {currentProfile.avatarUrl && !avatarError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentProfile.avatarUrl}
                alt={`${currentProfile.displayName} profile photo`}
                referrerPolicy="no-referrer"
                loading="lazy"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <span aria-hidden="true">{initials}</span>
            )}
          </div>
          <div className="pf-identity">
            <h1 className="pf-name">{currentProfile.displayName}</h1>
            <p className="pf-username">@{currentProfile.username}</p>
            <p className="pf-status">
              <span className="pf-status-dot" aria-hidden="true" />
              {roleLabel(currentProfile.role)} · Joined {Number.isNaN(joinedYear) ? "recently" : joinedYear}
            </p>
            <p className="pf-bio">{currentProfile.bio || "No bio added yet."}</p>
            <div className="pf-actions">
              {isOwner ? (
                <button type="button" onClick={() => setModalOpen(true)} className="button button-primary pf-btn">
                  Edit profile
                </button>
              ) : viewerId ? (
                <button
                  type="button"
                  onClick={() => void follow.toggle()}
                  disabled={follow.loading}
                  className={`button ${follow.isFollowing ? "button-ghost" : "button-primary"} pf-btn`}
                  aria-pressed={follow.isFollowing}
                >
                  {follow.loading ? <LoaderCircle size={14} className="spin" aria-hidden="true" /> : null}
                  {follow.isFollowing ? "Following" : "Follow"}
                </button>
              ) : (
                <Link href="/login" className="button button-primary pf-btn">
                  Follow
                </Link>
              )}
              <button type="button" onClick={() => void handleShare()} className="button button-ghost pf-btn" aria-live="polite">
                {shareState === "copied" ? <Check size={14} aria-hidden="true" /> : <Share2 size={14} aria-hidden="true" />}
                {shareState === "copied" ? "Copied" : shareState === "failed" ? "Copy failed" : "Share Profile"}
              </button>
              <div className="pf-menu-wrap" ref={menuRef}>
                <button
                  type="button"
                  className="button button-ghost pf-btn-icon"
                  aria-label="More profile options"
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                  onClick={() => setMenuOpen((v) => !v)}
                >
                  <Ellipsis size={16} aria-hidden="true" />
                </button>
                {menuOpen && (
                  <div className="pf-menu" role="menu" aria-label="Profile options">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => { void copyProfileLink(); setMenuOpen(false); }}
                    >
                      <Copy size={13} aria-hidden="true" /> Copy profile link
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => { scrollToSection("projects"); setMenuOpen(false); }}
                    >
                      <FolderKanban size={13} aria-hidden="true" /> View all projects
                    </button>
                    <Link href="/explore" role="menuitem" onClick={() => setMenuOpen(false)}>
                      <Users size={13} aria-hidden="true" /> Browse community
                    </Link>
                  </div>
                )}
              </div>
            </div>
            <div className="pf-stats" aria-label="Profile statistics">
              <button type="button" className="pf-stat" onClick={() => void loadFollowLists("followers")} aria-label={`View followers, ${follow.followersCount}`}>
                <strong>{follow.initialLoading ? "…" : follow.followersCount}</strong>
                <span>Followers</span>
              </button>
              <button type="button" className="pf-stat" onClick={() => void loadFollowLists("following")} aria-label={`View following, ${follow.followingCount}`}>
                <strong>{follow.initialLoading ? "…" : follow.followingCount}</strong>
                <span>Following</span>
              </button>
              <button type="button" className="pf-stat" onClick={() => scrollToSection("projects")} aria-label={`View projects, ${currentProfile.projects.length}`}>
                <strong>{currentProfile.projects.length}</strong>
                <span>Projects</span>
              </button>
              <button type="button" className="pf-stat" onClick={() => scrollToSection("activity")} aria-label={`View activity, ${currentProfile.contributions} contributions`}>
                <strong>{currentProfile.contributions}</strong>
                <span>Contributions</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <nav className="pf-tabs" aria-label="Profile sections">
        <div className="pf-tabs-inner" role="list">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="listitem"
              className={`pf-tab${activeTab === tab.id ? " active" : ""}`}
              aria-current={activeTab === tab.id ? "true" : undefined}
              onClick={() => scrollToSection(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Content ────────────────────────────────────────── */}
      <div className="pf-grid">
        <section className="pf-card pf-about" id="pf-about" aria-labelledby="pf-about-h" tabIndex={-1}>
          <p className="pf-card-eyebrow">About</p>
          <h2 id="pf-about-h" className="pf-card-title">About</h2>
          <p className="pf-about-text">{currentProfile.bio || "No bio added yet."}</p>
          <ul className="pf-meta">
            <li>
              <UserRound size={13} aria-hidden="true" />
              <span>{roleLabel(currentProfile.role)} at The DropOut College</span>
            </li>
            <li>
              <Sparkles size={13} aria-hidden="true" />
              <span>Member since {Number.isNaN(joinedYear) ? "recently" : joinedYear}</span>
            </li>
            <li>
              <FolderKanban size={13} aria-hidden="true" />
              <span>{currentProfile.projects.length} {currentProfile.projects.length === 1 ? "project" : "projects"} shared</span>
            </li>
          </ul>
          {!currentProfile.bio && isOwner && (
            <button type="button" className="button button-ghost pf-empty-cta" onClick={() => setModalOpen(true)}>
              Add your bio
            </button>
          )}
        </section>

        <aside className="pf-card pf-skills" id="pf-skills" aria-labelledby="pf-skills-h" tabIndex={-1}>
          <p className="pf-card-eyebrow">Capabilities</p>
          <h2 id="pf-skills-h" className="pf-card-title">Skills</h2>
          {currentProfile.skills.length || currentProfile.categories.length ? (
            <ul className="pf-chips" aria-label="Skills">
              {[...currentProfile.categories.map((c) => c.name), ...currentProfile.skills.map((s) => s.name)].map((name) => (
                <li key={name} className="pf-chip">{name}</li>
              ))}
            </ul>
          ) : (
            <div className="pf-empty">
              <p>No skills listed yet.</p>
              {isOwner ? (
                <button type="button" className="pf-empty-link" onClick={() => setModalOpen(true)}>Add your skills</button>
              ) : (
                <span>Skills will appear here once added.</span>
              )}
            </div>
          )}
        </aside>

        <section className="pf-card pf-projects" id="pf-projects" aria-labelledby="pf-projects-h" tabIndex={-1}>
          <div className="pf-card-top">
            <div>
              <p className="pf-card-eyebrow">Selected work</p>
              <h2 id="pf-projects-h" className="pf-card-title">Projects</h2>
            </div>
            {currentProfile.projects.length > 0 && (
              <Link href="/projects" className="section-link pf-card-link">View all</Link>
            )}
          </div>
          {currentProfile.projects.length ? (
            <ul className="pf-project-grid">
              {currentProfile.projects.slice(0, 6).map((project) => (
                <li key={project.id}>
                  <ProfileProjectCard project={project} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="pf-empty">
              <p>No projects yet.</p>
              {isOwner ? (
                <Link href="/projects" className="pf-empty-link">Share your first project</Link>
              ) : (
                <span>This member hasn&apos;t added any projects yet.</span>
              )}
            </div>
          )}
        </section>

        <aside className="pf-card pf-interests" aria-labelledby="pf-interests-h">
          <p className="pf-card-eyebrow">Interests</p>
          <h2 id="pf-interests-h" className="pf-card-title">Interests</h2>
          {currentProfile.categories.length ? (
            <ul className="pf-pills" aria-label="Interests">
              {currentProfile.categories.map((c) => (
                <li key={c.id} className="pf-pill">{c.name}</li>
              ))}
            </ul>
          ) : (
            <div className="pf-empty">
              <p>No interests added yet.</p>
              {isOwner ? (
                <button type="button" className="pf-empty-link" onClick={() => setModalOpen(true)}>Add your interests</button>
              ) : (
                <span>Interests will appear here once added.</span>
              )}
            </div>
          )}
        </aside>

        <section className="pf-card pf-activity" id="pf-activity" aria-labelledby="pf-activity-h" tabIndex={-1}>
          <p className="pf-card-eyebrow">Community footprint</p>
          <h2 id="pf-activity-h" className="pf-card-title">Activity</h2>
          {currentProfile.activity.length ? (
            <ol className="pf-timeline">
              {currentProfile.activity.map((item) => (
                <li key={item.id} className="pf-timeline-item">
                  <span className={`pf-timeline-dot pf-timeline-dot-${item.kind}`} aria-hidden="true" />
                  <div className="pf-timeline-body">
                    <p className="pf-timeline-title">{item.title}</p>
                    {item.subtitle && (
                      item.projectId ? (
                        <Link href={`/projects/${item.projectId}`} className="pf-timeline-sub pf-timeline-link">{item.subtitle}</Link>
                      ) : (
                        <p className="pf-timeline-sub">{item.subtitle}</p>
                      )
                    )}
                    <time className="pf-timeline-time" dateTime={item.at}>{timeAgo(item.at)}</time>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="pf-empty">
              <p>No activity yet.</p>
              <span>Projects, discussions and achievements will show up here.</span>
            </div>
          )}
        </section>

        <section className="pf-card pf-achievements" id="pf-achievements" aria-labelledby="pf-achievements-h" tabIndex={-1}>
          <p className="pf-card-eyebrow">Recognition</p>
          <h2 id="pf-achievements-h" className="pf-card-title">Achievements</h2>
          {currentProfile.badges.length ? (
            <ul className="pf-badges">
              {currentProfile.badges.map((badge) => (
                <li key={badge.id} className="pf-badge">
                  <span className="pf-badge-icon" aria-hidden="true"><Award size={16} /></span>
                  <span className="pf-badge-text">
                    <strong>{badge.name}</strong>
                    {badge.description && <small>{badge.description}</small>}
                    {badge.awardedAt && <time dateTime={badge.awardedAt}>{formatMonthYear(badge.awardedAt)}</time>}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="pf-empty">
              <p>No achievements yet.</p>
              <span>Badges will appear here when earned.</span>
            </div>
          )}
        </section>

        {visibleLinks.length > 0 && (
          <aside className="pf-card pf-social" aria-labelledby="pf-social-h">
            <p className="pf-card-eyebrow">Elsewhere</p>
            <h2 id="pf-social-h" className="pf-card-title">Social Links</h2>
            <ul className="pf-links">
              {visibleLinks.map((link) => {
                let host = "";
                try {
                  host = new URL(link.url).hostname.replace(/^www\./, "");
                } catch {
                  host = link.url;
                }
                return (
                  <li key={`${link.platform}-${link.url}`}>
                    <Link href={link.url} target="_blank" rel="noreferrer" className="pf-link-row">
                      <SocialIcon platform={link.platform} />
                      <span className="pf-link-text">
                        <strong>{socialLabel(link.platform)}</strong>
                        <small>{host}</small>
                      </span>
                      <ArrowUpRight size={14} aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </aside>
        )}
      </div>

      {/* ── Followers / Following dialog ───────────────────── */}
      {followListTab && (
        <div className="pf-dialog-root" role="dialog" aria-modal="true" aria-label={followListTab === "followers" ? "Followers" : "Following"}>
          <div className="pf-dialog-overlay" onClick={() => setFollowListTab(null)} aria-hidden="true" />
          <div className="pf-dialog">
            <div className="pf-dialog-head">
              <h2>{followListTab === "followers" ? "Followers" : "Following"}</h2>
              <button type="button" className="icon-button" aria-label="Close" onClick={() => setFollowListTab(null)}>
                <X size={18} />
              </button>
            </div>
            {followListsLoading ? (
              <p className="muted-text">Loading…</p>
            ) : listRows.length === 0 ? (
              <p className="muted-text">{followListTab === "followers" ? "No followers yet." : "Not following anyone yet."}</p>
            ) : (
              <ul className="pf-dialog-list">
                {listRows.map((entry, i) => {
                  const raw = entry.profiles as { id?: string; display_name?: string; username?: string; avatar_url?: string | null } | Array<{ id?: string; display_name?: string; username?: string; avatar_url?: string | null }> | null;
                  const p = Array.isArray(raw) ? raw[0] : raw;
                  const pid = followListTab === "followers"
                    ? (entry as { follower_id?: string }).follower_id ?? p?.id ?? `row-${i}`
                    : (entry as { following_id?: string }).following_id ?? p?.id ?? `row-${i}`;
                  return (
                    <li key={pid}>
                      <Link href={`/profile?member=${encodeURIComponent(pid)}`} className="pf-dialog-row" onClick={() => setFollowListTab(null)}>
                        <span className="pf-dialog-avatar" aria-hidden="true">
                          {p?.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.avatar_url} alt="" loading="lazy" />
                          ) : (
                            (p?.display_name ?? "M").slice(0, 2).toUpperCase()
                          )}
                        </span>
                        <span>
                          <strong>{p?.display_name ?? "Member"}</strong>
                          <small>@{p?.username ?? "member"}</small>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ── Edit Profile Modal (owner only) ────────────────── */}
      {modalOpen && isOwner && (
        <div
          className="pf-modal-root"
          onClick={(e) => { if (e.target === e.currentTarget && !loading) setModalOpen(false); }}
        >
          <div className="pf-modal" role="dialog" aria-modal="true" aria-labelledby="pf-edit-h">
            <button
              onClick={() => setModalOpen(false)}
              disabled={loading}
              className="pf-modal-close"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>

            <div className="eyebrow" style={{ color: "var(--lime)" }}>Member Settings</div>
            <h2 id="pf-edit-h">Edit profile</h2>

            <form onSubmit={handleSave} className="pf-form">
              {error && <p className="pf-form-error" role="alert">{error}</p>}
              {success && <p className="pf-form-success" role="status">{success}</p>}

              <div className="field">
                <label htmlFor="pf-display-name">Display Name *</label>
                <input
                  id="pf-display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your full name"
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="pf-username">Username *</label>
                <input
                  id="pf-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="pf-avatar">Avatar URL (optional)</label>
                <input
                  id="pf-avatar"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  inputMode="url"
                />
              </div>

              <div className="field">
                <label htmlFor="pf-facebook">Facebook</label>
                <input
                  id="pf-facebook"
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  placeholder="https://facebook.com/your-profile"
                  inputMode="url"
                />
              </div>

              <div className="field">
                <label htmlFor="pf-youtube">YouTube</label>
                <input
                  id="pf-youtube"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://youtube.com/@yourchannel"
                  inputMode="url"
                />
              </div>

              <div className="field">
                <label htmlFor="pf-bio">Bio</label>
                <textarea
                  id="pf-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell the community what you're working on, learning, or looking for..."
                  rows={4}
                />
              </div>

              <div className="field">
                <span className="pf-field-label" id="pf-skills-label">Skills</span>
                <div className="skill-selector" role="group" aria-labelledby="pf-skills-label">
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
                <label htmlFor="pf-cat-search">Focus areas</label>
                <input
                  id="pf-cat-search"
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
                          className={`filter${selected ? " active" : ""}`}
                          aria-pressed={selected}
                          onClick={() => setCategoryIds((current) => selected ? current.filter((id) => id !== category.id) : [...current, category.id])}
                        >
                          {category.name}
                        </button>
                      );
                    })}
                </div>
              </div>

              <div className="pf-form-actions">
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
                  {loading ? <LoaderCircle size={14} className="spin" aria-hidden="true" /> : null}
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileProjectCard({ project }: { project: Project }) {
  const [thumbError, setThumbError] = useState(false);
  const showThumb = Boolean(project.coverImageUrl) && !thumbError;
  const status = projectStatusLabel(project.status);
  const date = formatMonthYear(project.createdAt);

  return (
    <article className="pf-project" aria-label={project.name}>
      <div className="pf-project-thumb" aria-hidden="true">
        {showThumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.coverImageUrl as string} alt="" loading="lazy" onError={() => setThumbError(true)} />
        ) : (
          <span className="pf-project-thumb-fallback"><FlaskConical size={18} aria-hidden="true" /></span>
        )}
      </div>
      <div className="pf-project-body">
        <h3 className="pf-project-title">{project.name}</h3>
        <p className="pf-project-desc">{project.description}</p>
        {project.technologies.length > 0 && (
          <ul className="pf-project-tags" aria-label="Technologies">
            {project.technologies.slice(0, 3).map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        )}
        <p className="pf-project-meta">
          <span className={`pf-status-pill pf-status-${status.toLowerCase()}`}>{status}</span>
          {date && <span> · {date}</span>}
        </p>
        <Link href={`/projects/${project.id}`} className="pf-project-cta">
          View Project <ArrowRight size={13} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
