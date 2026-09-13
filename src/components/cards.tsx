"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, CalendarDays, MessageCircle, X } from "lucide-react";
import { Pill } from "@/components/app-shell";
import type { Event, Member, Project } from "@/lib/supabase-data";

export function MemberCard({ member }: { member: Member }) {
  return (
    <Link href={`/profile?member=${encodeURIComponent(member.id)}`} className="member-card">
      <div className="member-top">
        <div className="member-avatar" style={{ background: member.color }}>{member.initials}</div>
        {member.online && <span className="online-dot" aria-label="Online" />}
      </div>
      <h3>{member.name}</h3>
      <span className="member-handle">{member.handle}</span>
      <p className="member-bio">{member.bio || "No bio added yet."}</p>
      <Pill tone="lime">{member.category}</Pill>
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
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setModalOpen(true); }}
      >
        <div className="project-top">
          <Pill tone={project.status === "Live" || project.status === "launched" ? "lime" : "neutral"}>
            {project.status}
          </Pill>
          <span style={{ color: project.color }}><ArrowUpRight size={16} /></span>
        </div>
        <h3>{project.name}</h3>
        <p>{project.description}</p>
        <div className="project-footer">
          <div className="team-stack">
            {project.team.map((person, index) => (
              <span key={`${person}-${index}`} style={{ background: ["#d8ff62", "#77e7e1", "#ff836d"][index % 3] }}>
                {person}
              </span>
            ))}
          </div>
          <span className="member-handle">{project.metric}</span>
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
            style={{
              width: "min(560px, 94vw)",
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
            <div className="eyebrow" style={{ color: "var(--lime)" }}>Project Details</div>
            <h2 style={{ fontSize: 24, margin: "10px 0" }}>{project.name}</h2>
            <div style={{ display: "flex", gap: 8, margin: "12px 0 20px" }}>
              <Pill tone={project.status === "Live" || project.status === "launched" ? "lime" : "neutral"}>{project.status}</Pill>
              <Pill tone="cyan">{project.metric}</Pill>
            </div>
            <p style={{ color: "#d6ddd4", lineHeight: 1.7, fontSize: 13, margin: "0 0 24px" }}>{project.description}</p>
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
            <div style={{ borderTop: "1px solid var(--line)", paddingTop: 20, display: "flex", justifyContent: "flex-end", gap: 10 }}>
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

