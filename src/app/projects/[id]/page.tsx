import Link from "next/link";
import { getProjectById } from "@/lib/supabase-data";
import { getOptionalUser } from "@/server/auth/current-user";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { ProjectDetailsClient } from "@/app/projects/[id]/project-details-client";

export const dynamic = "force-dynamic";

export default async function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [project, user] = await Promise.all([getProjectById(id), getOptionalUser()]);

  if (!project) {
    return (
      <section className="panel" style={{ maxWidth: 560, margin: "40px auto", textAlign: "center" }}>
        <div className="eyebrow" style={{ color: "var(--coral)" }}>Not found</div>
        <h1 style={{ fontSize: 26, margin: "12px 0" }}>Project not found</h1>
        <p className="muted-text">This project may have been removed or the link is incorrect.</p>
        <Link href="/projects" className="button button-ghost" style={{ marginTop: 16 }}>Back to projects</Link>
      </section>
    );
  }

  let isAdmin = false;
  if (user) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase.from("user_roles").select("role").eq("profile_id", user.id).in("role", ["admin", "super_admin"]);
      isAdmin = (data ?? []).length > 0;
    } catch {
      isAdmin = false;
    }
  }

  return <ProjectDetailsClient project={project} userId={user?.id ?? null} isAdmin={isAdmin} />;
}
