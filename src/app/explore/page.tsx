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
      <div className="page-title community-page-title">
        <h1>Community Members</h1>
        <p>Connect with amazing people, collaborate on projects, and grow together.</p>
      </div>

      <Suspense fallback={<div className="panel"><p className="loading">Loading explore...</p></div>}>
        <ExploreClient initialMembers={members} categories={categories} />
      </Suspense>
    </>
  );
}