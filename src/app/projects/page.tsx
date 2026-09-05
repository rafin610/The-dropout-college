/* eslint-disable react-hooks/error-boundaries */
import { Plus, Search } from "lucide-react";
import { getProjects } from "@/lib/supabase-data";
import { ProjectCard } from "@/components/cards";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  try {
    const projects = await getProjects();
    return <><div className="page-title"><div className="eyebrow">The project index</div><h1>Good ideas deserve<br /><span style={{ color: "var(--lime)" }}>good company.</span></h1><p>See what members are building, find a gap you can fill, and put your name next to something real.</p></div><div className="toolbar"><div className="input-wrap"><Search size={15} /><input placeholder="Search projects..." /></div><button className="button button-primary"><Plus size={15} /> Submit a project</button></div>{projects.length ? <div className="project-grid">{projects.map((project) => <ProjectCard key={project.id} project={project} />)}</div> : <p className="muted-text">No projects have been added yet.</p>}</>;
  } catch { return <section className="panel"><h2>Unable to load projects</h2><p className="member-bio">Please try again later.</p></section>; }
}