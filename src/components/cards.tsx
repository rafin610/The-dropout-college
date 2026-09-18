"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, CalendarDays, ExternalLink, MessageCircle, X } from "lucide-react";
import { Pill } from "@/components/app-shell";
import type { Event, Member, Project } from "@/lib/supabase-data";

export function MemberCard({ member }: { member: Member }) {
  const [avatarError, setAvatarError] = useState(false);
  const visibleSkills = member.skills.slice(0, 3);
  const remainingSkills = Math.max(0, member.skills.length - visibleSkills.length);

  return (
    <Link href={`/profile?member=${encodeURIComponent(member.id)}`} className="member-card">
      <div className="member-top">
        <div className="member-avatar" style={{ background: member.color }}>
          {member.avatarUrl && !avatarError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={member.avatarUrl}
              alt={`${member.name} profile`}
              referrerPolicy="no-referrer"
              loading="lazy"
              onError={() => setAvatarError(true)}
              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
            />
          ) : (
            <span>{member.initials}</span>
          )}
        </div>
        {member.online && <span className="online-dot" aria-label="Online" />}
      </div>
      <h3>{member.name}</h3>
      <span className="member-handle">{member.handle}</span>
      <p className="member-bio">{member.bio || "No bio added yet."}</p>
      <div className="skill-cloud" style={{ marginTop: 10 }}>
        <Pill tone={member.role === "admin" || member.role === "super_admin" ? "coral" : "neutral"}>{member.role.replaceAll("_", " ")}</Pill>
        {visibleSkills.map((skill) => <Pill key={skill} tone="lime">{skill}</Pill>)}
        {remainingSkills > 0 && <Pill tone="neutral">+{remainingSkills} more</Pill>}
      </div>
    </Link>
  );
}

export function ProjectCard({ project }: { project: Project }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div
        className="project-card"
        style={{ "--project-color": project.color, cursor: "pointer" } as React.CSSProperties}
        onClick={() => setModalOpen(true)}
        aria-label={`View details for ${project.name}`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setModalOpen(true); } }}
      >
        <div className="project-visual" style={project.coverImageUrl ? { backgroundImage: `url(${project.coverImageUrl})` } : undefined} aria-hidden="true">
          {!project.coverImageUrl && <span style={{ color: project.color }}>D/PROJECT</span>}
        </div>
        <div className="project-top">
          <Pill tone={project.status === "Live" || project.status === "launched" ? "lime" : "neutral"}>
            {project.status}
          </Pill>
          <span style={{ color: project.color }}><ArrowUpRight size={16} /></span>
        </div>
        <h3>{project.name}</h3>
        <p className="project-description-preview">{project.description}</p>
        {project.technologies.length > 0 && <div className="project-technologies">{project.technologies.slice(0, 3).map((technology) => <Pill key={technology} tone="cyan">{technology}</Pill>)}{project.technologies.length > 3 && <Pill tone="neutral">+{project.technologies.length - 3} more</Pill>}</div>}
        <div className="project-footer">
          <div className="team-stack">
            {project.team.map((person, index) => (
              <span key={`${person}-${index}`} style={{ background: ["#d8ff62", "#77e7e1", "#ff836d"][index % 3] }}>
                {person}
              </span>
            ))}
          </div>
          <span className="member-handle">{project.metric}</span>
          <span className="project-card-link">See more <ArrowUpRight size={12} /></span>
        </div>
      </div>

      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10,12,11,0.85)",
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
              background: "rgba(22,26,24,0.98)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: 28,
              boxShadow: "0 24px 60px rgba(0,0,0,0.8)",
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
              <Pill tone={project.status === "Live" || project.status === "launched" ? "lime" : "neutral"}>{project.status}</Pill>
              <Pill tone="cyan">{project.metric}</Pill>
            </div>
            <p style={{ color: "#d6ddd4", lineHeight: 1.7, fontSize: 13, margin: "0 0 24px" }}>{project.description}</p>
            {project.technologies.length > 0 && <div className="project-technologies project-modal-technologies">{project.technologies.map((technology) => <Pill key={technology} tone="cyan">{technology}</Pill>)}</div>}
            {project.links?.map((link) => <Link key={link.url} href={link.url} target="_blank" rel="noreferrer" className="project-external-link"><ExternalLink size={13} /> {link.label}</Link>)}
            <div style={{ borderTop: "1px solid var(--line)", paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>Team:</span>
                <div className="team-stack">
                  {project.team.map((person, index) => (
                    <span key={person} style={{ background: ["#d8ff62", "#77e7e1", "#ff836d"][index % 3] }}>
                      {person}
                    </span>
                  ))}
                </div>
              </div>
              <Link
                href="https://discord.gg/3xfu5TMgF"
                target="_blank"
                rel="noreferrer"
                className="button button-primary"
                style={{ fontSize: 11, padding: "8px 14px" }}
              >
                Discuss in Discord <MessageCircle size={13} />
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
            background: "rgba(10,12,11,0.85)",
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
              background: "rgba(22,26,24,0.98)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: 28,
              boxShadow: "0 24px 60px rgba(0,0,0,0.8)",
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

