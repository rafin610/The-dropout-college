/* eslint-disable react-hooks/error-boundaries */
import Link from "next/link";
import { ArrowRight, Bell, Plus } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { getProjects } from "@/lib/supabase-data";
import { ProjectCard } from "@/components/cards";
import { SectionHeading } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  try {
    const user = await getCurrentUser();
    const supabase = await createSupabaseServerClient();
    const [{ data: profile }, { data: notifications }, projects] = await Promise.all([supabase.from("profiles").select("display_name, bio").eq("id", user.id).maybeSingle(), supabase.from("notifications").select("id, title, body, created_at").eq("profile_id", user.id).order("created_at", { ascending: false }).limit(5), getProjects(user.id)]);
    return <><div className="page-title"><div className="eyebrow">Your dashboard</div><h1>{profile?.display_name || "Your space"}<br /><span style={{ color: "var(--lime)" }}>keep moving.</span></h1><p>{profile?.bio || "Complete your profile so the right people can find you."}</p></div><div className="panel"><h3><Bell size={15} style={{ verticalAlign: "middle", color: "var(--lime)" }} /> Notifications</h3>{notifications?.length ? <div className="activity-list">{notifications.map((notification) => <div className="activity" key={notification.id}><div className="activity-icon">!</div><div>{notification.title}<span>{notification.body}</span></div></div>)}</div> : <p className="member-bio">No notifications yet.</p>}</div><section className="section"><SectionHeading eyebrow="In motion" title="Your projects" action={<Link href="/projects" className="section-link">View all <ArrowRight size={13} /></Link>} />{projects.length ? <div className="project-grid">{projects.map((project) => <ProjectCard key={project.id} project={project} />)}<Link href="/projects" className="project-card" style={{ justifyContent: "center", alignItems: "center", color: "var(--muted)" }}><Plus size={20} /><span style={{ marginTop: 10, fontSize: 11 }}>Start something new</span></Link></div> : <p className="muted-text">You have not added any projects yet.</p>}</section></>;
  } catch { return <section className="panel"><h2>Unable to load your dashboard</h2><p className="member-bio">Please sign in and try again.</p></section>; }
}