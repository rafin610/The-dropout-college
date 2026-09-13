import { Suspense } from "react";
import { getCategories, getMembers } from "@/lib/supabase-data";
import { ExploreClient } from "@/app/explore/explore-client";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  let members: Awaited<ReturnType<typeof getMembers>> = [];
  let categories: Awaited<ReturnType<typeof getCategories>> = [];
  let loadError = false;

  try {
    [members, categories] = await Promise.all([getMembers(), getCategories()]);
  } catch {
    loadError = true;
  }

  if (loadError) {
    return (
      <section className="panel">
        <h2>Unable to load members</h2>
        <p className="member-bio">Please try again later.</p>
      </section>
    );
  }

  return (
    <>
      <div className="page-title">
        <div className="eyebrow">Explore the network</div>
        <h1>
          Find your next<br />
          <span style={{ color: "var(--lime)" }}>interesting person.</span>
        </h1>
        <p>Search across disciplines, projects, and ambitions. The best collaborators are rarely looking for the same thing you are.</p>
      </div>

      <Suspense fallback={<div className="panel"><p className="loading">Loading explore...</p></div>}>
        <ExploreClient initialMembers={members} categories={categories} />
      </Suspense>
    </>
  );
}