import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Pill } from "@/components/app-shell";
import type { Event, Member, Project } from "@/lib/supabase-data";

export function MemberCard({ member }: { member: Member }) {
  return <Link href={`/profile?member=${member.id}`} className="member-card"><div className="member-top"><div className="member-avatar" style={{ background: member.color }}>{member.initials}</div>{member.online && <span className="online-dot" aria-label="Online" />}</div><h3>{member.name}</h3><span className="member-handle">{member.handle}</span><p className="member-bio">{member.bio || "No bio added yet."}</p><Pill tone="lime">{member.category}</Pill></Link>;
}

export function ProjectCard({ project }: { project: Project }) {
  return <Link href="/projects" className="project-card" style={{ "--project-color": project.color } as React.CSSProperties}><div className="project-top"><Pill tone={project.status === "Live" ? "lime" : "neutral"}>{project.status}</Pill><span style={{ color: project.color }}><ArrowUpRight size={16} /></span></div><h3>{project.name}</h3><p>{project.description}</p><div className="project-footer"><div className="team-stack">{project.team.map((person, index) => <span key={person} style={{ background: ["#d8ff62", "#77e7e1", "#ff836d"][index % 3] }}>{person}</span>)}</div><span className="member-handle">{project.metric}</span></div></Link>;
}

export function EventCard({ event }: { event: Event }) {
  return <Link href="/events" className="event-card"><div className="event-date"><strong>{event.date}</strong><span>{event.month}</span></div><h3>{event.title}</h3><p>{event.meta}</p><Pill tone={event.accent}>{event.type}</Pill></Link>;
}

