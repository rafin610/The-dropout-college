"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUp,
  ArrowUpRight,
  CalendarDays,
  Check,
  Copy,
  ExternalLink,
  MessageCircle,
  MoreVertical,
  User,
  X,
} from "lucide-react";
import { Pill } from "@/components/app-shell";
import type { Event, Member, Project } from "@/lib/supabase-data";
import { useFollow, useUpvote } from "@/lib/social-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function displayStatus(status?: string | null): string {
  if (status === "in_progress" || status === "Building" || status === "Active") return "Building";
  if (status === "launched" || status === "Live" || status === "Launched") return "Launched";
  if (status === "recruiting" || status === "Recruiting") return "Recruiting";
  if (status === "archived" || status === "Archived") return "Archived";
  return "Idea";
}

function formatRole(role?: string | null): string {
  if (!role) return "Member";
  const clean = role.replaceAll("_", " ").trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export function MemberCard({ member, viewerId: propViewerId }: { member: Member; viewerId?: string | null }) {
  const router = useRouter();
  const [avatarError, setAvatarError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentViewerId, setCurrentViewerId] = useState<string | null>(propViewerId ?? null);

  useEffect(() => {
    if (propViewerId !== undefined) {
      setCurrentViewerId(propViewerId);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => {
      setCurrentViewerId(data.user?.id ?? null);
    });
  }, [propViewerId]);

  const follow = useFollow(member.id, currentViewerId);
  const visibleSkills = member.skills.slice(0, 3);
  const remainingSkills = Math.max(0, member.skills.length - visibleSkills.length);
  const isSelf = currentViewerId === member.id;

  async function handleFollowClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!currentViewerId) {
      router.push("/login");
      return;
    }
    if (isSelf) {
      router.push("/profile");
      return;
    }
    await follow.toggle();
  }

  async function copyProfileLink(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      const url = `${window.location.origin}/profile?member=${encodeURIComponent(member.id)}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
    setMenuOpen(false);
  }

  return (
    <article className="member-card">
      <div className="member-top-row">
        <Link href={`/profile?member=${encodeURIComponent(member.id)}`} className="member-avatar-wrap">
          <div className="member-avatar" style={{ background: member.color || "var(--accent)" }}>
            {member.avatarUrl && !avatarError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={member.avatarUrl}
                alt={`${member.name} profile`}
                referrerPolicy="no-referrer"
                loading="lazy"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <span>{member.initials || "M"}</span>
            )}
          </div>
        </Link>

        <div className="member-info">
          <Link href={`/profile?member=${encodeURIComponent(member.id)}`} className="member-name-link">
            <h3 className="member-name">{member.name}</h3>
          </Link>
          <span className="member-handle">{member.handle}</span>
          <div className="member-status-badge">
            <span className="member-status-dot" aria-hidden="true" />
            <span className="member-status-text">{formatRole(member.role)}</span>
          </div>
        </div>

        <div className="member-menu-container">
          <button
            type="button"
            className="member-menu-btn"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenuOpen((prev) => !prev);
            }}
            aria-label="Member options"
          >
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <div className="member-dropdown-menu" onClick={(e) => e.stopPropagation()}>
              <button type="button" onClick={copyProfileLink}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
                <span>{copied ? "Link copied!" : "Copy profile link"}</span>
              </button>
              <Link href={`/profile?member=${encodeURIComponent(member.id)}`} onClick={() => setMenuOpen(false)}>
                <User size={13} />
                <span>View full profile</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      <p className="member-bio">{member.bio || "No bio added yet."}</p>

      <div className="member-skills-row">
        {visibleSkills.length > 0 ? (
          visibleSkills.map((skill) => (
            <span key={skill} className="member-skill-pill">
              {skill}
            </span>
          ))
        ) : (
          <span className="member-skill-pill member-skill-empty">Member</span>
        )}
        {remainingSkills > 0 && (
          <span className="member-skill-pill member-skill-more">+{remainingSkills}</span>
        )}
      </div>

      <div className="member-actions-row">
        <Link href={`/profile?member=${encodeURIComponent(member.id)}`} className="member-btn-view">
          View Profile
        </Link>
        <button
          type="button"
          onClick={handleFollowClick}
          disabled={follow.loading}
          className={`member-btn-follow ${follow.isFollowing ? "following" : ""}`}
        >
          {isSelf ? "You" : follow.isFollowing ? "Following" : "Follow"}
        </button>
      </div>
    </article>
  );
}

export function ProjectCard({ project, userId }: { project: Project; userId?: string | null }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [coverError, setCoverError] = useState(false);
  const showCover = Boolean(project.coverImageUrl) && !coverError;
  const status = displayStatus(project.status);
  const { count: upvotes, upvoted, loading: upvoting, toggle } = useUpvote(project.id, project.upvoteCount ?? 0, userId ?? null);
  const comments = project.commentCount ?? 0;
  const creatorInitials = (project.creatorName ?? "M").split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  return (
    <>
      <article
        className="project-card project-card-social"
        style={{ "--project-color": project.color } as React.CSSProperties}
        aria-label={project.name}
      >
        <div className="project-cover" aria-hidden="true">
          {showCover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={project.coverImageUrl as string} alt="" loading="lazy" onError={() => setCoverError(true)} />
          ) : (
            <span className="project-cover-fallback">D/PROJECT</span>
          )}
        </div>
        <div className="project-top">
          <Pill tone={status === "Launched" ? "lime" : "neutral"}>
            {status}
          </Pill>
          {project.categoryName && <span className="member-handle">{project.categoryName}</span>}
        </div>
        <h3 style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{project.name}</h3>
        <p className="project-description-preview">{project.description}</p>
        <div className="project-creator">
          <span className="project-creator-avatar" aria-hidden="true">
            {project.creatorAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={project.creatorAvatar} alt="" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : (
              creatorInitials
            )}
          </span>
          <span className="project-creator-name">{project.creatorName ?? "Community member"}</span>
        </div>
        <div className="project-social-row">
          <button
            type="button"
            className={`upvote-button${upvoted ? " active" : ""}`}
            onClick={(e) => { e.stopPropagation(); void toggle(); }}
            disabled={upvoting}
            aria-pressed={upvoted}
            aria-label={upvoted ? `Remove upvote (${upvotes})` : `Upvote (${upvotes})`}
            title={userId ? (upvoted ? "Remove upvote" : "Upvote") : "Sign in to upvote"}
          >
            <ArrowUp size={14} /> {upvotes}
          </button>
          <Link href={`/projects/${project.id}#comments`} className="comment-button" aria-label={`Comments (${comments})`}>
            <MessageCircle size={14} /> {comments}
          </Link>
          <Link href={`/projects/${project.id}`} className="project-card-link" style={{ marginLeft: "auto" }} onClick={() => setModalOpen(false)}>
            See more <ArrowUpRight size={12} />
          </Link>
        </div>
      </article>

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
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`project-title-${project.id}`}
            style={{
              width: "min(560px, 94vw)",
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
              style={{ position: "absolute", top: 20, right: 20, background: "transparent", border: 0, color: "var(--muted)", cursor: "pointer" }}
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
            <div className="eyebrow" style={{ color: "var(--lime)" }}>Project Details</div>
            <h2 id={`project-title-${project.id}`} style={{ fontSize: 24, margin: "10px 0" }}>{project.name}</h2>
            <div style={{ display: "flex", gap: 8, margin: "12px 0 20px" }}>
              <Pill tone={status === "Launched" ? "lime" : "neutral"}>{status}</Pill>
              <Pill tone="cyan">{project.metric}</Pill>
            </div>
            <p style={{ color: "var(--text)", lineHeight: 1.7, fontSize: 13, margin: "0 0 24px" }}>{project.description}</p>
            {project.technologies.length > 0 && <div className="project-technologies project-modal-technologies">{project.technologies.map((technology) => <Pill key={technology} tone="cyan">{technology}</Pill>)}</div>}
            {project.links?.map((link) => <Link key={link.url} href={link.url} target="_blank" rel="noreferrer" className="project-external-link"><ExternalLink size={13} /> {link.label}</Link>)}
            <div style={{ borderTop: "1px solid var(--line)", paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>Team:</span>
                <div className="team-stack">
                  {project.team.map((person, index) => (
                    <span key={person} style={{ background: ["var(--accent)", "var(--teal)", "var(--clay)"][index % 3] }}>
                      {person}
                    </span>
                  ))}
                </div>
              </div>
              <Link
                href={`/projects/${project.id}`}
                className="button button-primary"
                style={{ fontSize: 11, padding: "8px 14px" }}
              >
                Open project <MessageCircle size={13} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function EventCard({ event }: { event: Event }) {
  const [modalOpen, setModalOpen] = useState(false);

  function downloadIcs() {
    const calendarData = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//The DropOut College//Events//EN",
      "BEGIN:VEVENT",
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.type} event at The DropOut College - ${event.meta}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([calendarData], { type: "text/calendar;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${event.title.replace(/[^a-zA-Z0-9]/g, "_")}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <>
      <div
        className="event-card"
        onClick={() => setModalOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setModalOpen(true); }}
        style={{ cursor: "pointer" }}
      >
        <div className="event-date">
          <strong>{event.date}</strong>
          <span>{event.month}</span>
        </div>
        <h3>{event.title}</h3>
        <p>{event.meta}</p>
        <Pill tone={event.accent}>{event.type}</Pill>
      </div>

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
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div
            style={{
              width: "min(540px, 94vw)",
              background: "var(--popover)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: 28,
              boxShadow: "var(--shadow-lg)",
              position: "relative",
            }}
          >
            <button
              onClick={() => setModalOpen(false)}
              style={{ position: "absolute", top: 20, right: 20, background: "transparent", border: 0, color: "var(--muted)", cursor: "pointer" }}
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
            <div className="eyebrow" style={{ color: "var(--lime)" }}>{event.month} {event.date} · {event.type}</div>
            <h2 style={{ fontSize: 24, margin: "10px 0" }}>{event.title}</h2>
            <p style={{ color: "var(--muted)", fontSize: 12, margin: "0 0 20px" }}>{event.meta}</p>
            <div style={{ borderTop: "1px solid var(--line)", paddingTop: 20, display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
              <Link href={`/events/${event.id}`} className="button button-ghost" style={{ fontSize: 11 }} onClick={() => setModalOpen(false)}>
                View details
              </Link>
              <button onClick={downloadIcs} className="button button-ghost" style={{ fontSize: 11 }}>
                <CalendarDays size={14} /> Add to calendar (.ics)
              </button>
              <Link
                href="https://discord.gg/3xfu5TMgF"
                target="_blank"
                rel="noreferrer"
                className="button button-primary"
                style={{ fontSize: 11 }}
              >
                Join Event on Discord <MessageCircle size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

