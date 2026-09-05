/* eslint-disable react-hooks/error-boundaries */
import Link from "next/link";
import { Code2 as Github, Globe, AtSign as Linkedin } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { getProjects } from "@/lib/supabase-data";
import { ProjectCard } from "@/components/cards";
import { Pill, SectionHeading } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  try {
    const user = await getCurrentUser();
    const supabase = await createSupabaseServerClient();
    const [{ data: profile }, { data: links }, projects] = await Promise.all([supabase.from("profiles").select("id, username, display_name, avatar_url, bio, created_at, profile_categories(categories(name)), profile_skills(skills(name))").eq("id", user.id).maybeSingle(), supabase.from("social_links").select("platform, url").eq("profile_id", user.id), getProjects(user.id)]);
    if (!profile) return <section className="panel"><h2>Profile not found</h2><p className="member-bio">Complete your profile to appear in the community.</p></section>;
    const skills = (profile.profile_skills ?? []).flatMap((item) => { const skill = item.skills as unknown as { name?: string } | { name?: string }[] | null; return Array.isArray(skill) ? skill.flatMap((entry) => entry.name ? [entry.name] : []) : skill?.name ? [skill.name] : []; });
    return <><div className="profile-header"><div className="profile-large">{profile.display_name.slice(0, 2).toUpperCase()}</div><div><div className="eyebrow">Member since {new Date(profile.created_at).getFullYear()}</div><h1>{profile.display_name}</h1><p>@{profile.username}</p></div><button className="button button-ghost" style={{ marginLeft: "auto" }}>Edit profile</button></div><div className="profile-layout"><div><section className="panel"><SectionHeading eyebrow="About" title={profile.bio ? "About" : "No bio yet"} /><p className="hero-copy">{profile.bio || "Add a short introduction to help members get to know you."}</p><div className="skill-cloud">{skills.length ? skills.map((skill) => <Pill key={skill} tone="lime">{skill}</Pill>) : <span className="muted-text">No skills added yet.</span>}</div><div className="skill-cloud" style={{ marginTop: 24 }}>{(links ?? []).map((link) => <Link href={link.url} className="section-link" key={link.platform}>{link.platform === "github" ? <Github size={14} /> : link.platform === "linkedin" ? <Linkedin size={14} /> : <Globe size={14} />} {link.platform}</Link>)}</div></section><section className="section"><SectionHeading eyebrow="Selected work" title="Projects" action={<Link href="/projects" className="section-link">View all</Link>} />{projects.length ? <div className="project-grid">{projects.slice(0, 2).map((project) => <ProjectCard key={project.id} project={project} />)}</div> : <p className="muted-text">No projects added yet.</p>}</section></div></div></>;
  } catch { return <section className="panel"><h2>Unable to load your profile</h2><p className="member-bio">Please sign in and try again.</p></section>; }
}