import Link from "next/link";
import { ArrowUpRight, CalendarDays, Check, Clock3, Users } from "lucide-react";
import { events, members, projects } from "@/lib/data";
import { Pill } from "@/components/app-shell";

export function MemberCard({ member = members[0] }: { member?: typeof members[number] }) {
  return <Link href="/profile" className="member-card"><div className="member-top"><div className="member-avatar" style={{ background: member.color }}>{member.initials}</div>{member.online && <span className="online-dot" aria-label="Online" />}</div><h3>{member.name}</h3><span className="member-handle">{member.handle} · {member.skill}</span><p className="member-bio">{member.bio}</p><Pill tone="lime">{member.category}</Pill></Link>;
}

export function ProjectCard({ project = projects[0] }: { project?: typeof projects[number] }) {
  return <Link href="/projects" className="project-card" style={{ "--project-color": project.color } as React.CSSProperties}><div className="project-top"><Pill tone={project.status === "Live" ? "lime" : "neutral"}>{project.status}</Pill><span style={{ color: project.color }}><ArrowUpRight size={16} /></span></div><h3>{project.name}</h3><p>{project.description}</p><div className="project-footer"><div className="team-stack">{project.team.map((person, index) => <span key={person} style={{ background: ["#d8ff62", "#77e7e1", "#ff836d"][index % 3] }}>{person}</span>)}</div><span className="member-handle">{project.metric}</span></div></Link>;
}

export function EventCard({ event = events[0] }: { event?: typeof events[number] }) {
  return <Link href="/events" className="event-card"><div className="event-date"><strong>{event.date}</strong><span>{event.month}</span></div><h3>{event.title}</h3><p>{event.meta}</p><Pill tone={event.accent}>{event.type}</Pill></Link>;
}

export function ActivityList() {
  return <div className="activity-list"><div className="activity"><div className="activity-icon"><Check size={13} /></div><div>Shipped a new project update<span>2 hours ago · Lumen OS</span></div></div><div className="activity"><div className="activity-icon"><Users size={13} /></div><div>Joined the AI Lab circle<span>Yesterday · Community</span></div></div><div className="activity"><div className="activity-icon"><CalendarDays size={13} /></div><div>Registered for Build night<span>Yesterday · Event</span></div></div><div className="activity"><div className="activity-icon"><Clock3 size={13} /></div><div>Profile viewed by 12 members<span>Monday · Profile</span></div></div></div>;
}