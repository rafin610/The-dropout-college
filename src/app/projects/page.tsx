import { getCategories, getProjects } from "@/lib/supabase-data";
import { getOptionalUser } from "@/server/auth/current-user";
import { ProjectsClient } from "@/app/projects/projects-client";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  let projects: Awaited<ReturnType<typeof getProjects>> = [];
  let categories: Awaited<ReturnType<typeof getCategories>> = [];
  let userId: string | null = null;
  let loadError = false;

  try {
    const [fetchedProjects, fetchedCategories, user] = await Promise.all([
      getProjects(),
      getCategories(),
      getOptionalUser(),
    ]);
    projects = fetchedProjects;
    categories = fetchedCategories;
    userId = user?.id ?? null;
  } catch {
    loadError = true;
  }

  if (loadError) {
    return (
      <section className="panel">
        <h2>Unable to load projects</h2>
        <p className="member-bio">Please try again later.</p>
      </section>
    );
  }

  return (
    <>
      <div className="page-title">
        <div className="eyebrow">The project index</div>
        <h1>
          Good ideas deserve<br />
          <span style={{ color: "var(--lime)" }}>good company.</span>
        </h1>
        <p>See what members are building, find a gap you can fill, and put your name next to something real.</p>
      </div>

      <ProjectsClient
        initialProjects={projects}
        categories={categories}
        userId={userId}
      />
    </>
  );
}