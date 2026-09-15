import Link from "next/link";
import { getOptionalUser, ensureUserProfile } from "@/server/auth/current-user";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { getCategories, getProjects } from "@/lib/supabase-data";
import { ProfileClient, type ProfileData } from "@/app/profile/profile-client";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ member?: string }>;
}) {
  const { member: memberId } = await searchParams;
  const currentUser = await getOptionalUser();

  const supabase = await createSupabaseServerClient();
  let targetUserId = memberId;

  if (!targetUserId) {
    if (!currentUser) {
      return (
        <section className="panel" style={{ maxWidth: 540, margin: "40px auto", textAlign: "center" }}>
          <div className="eyebrow" style={{ color: "var(--lime)" }}>Community Profile</div>
          <h2 style={{ fontSize: 28, margin: "14px 0" }}>Sign in to view your profile</h2>
          <p className="member-bio" style={{ margin: "0 0 24px" }}>
            Create your profile, showcase your projects, and connect with other learners across the talent network.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Link href="/login?next=/profile" className="button button-primary">
              Sign in
            </Link>
            <Link href="/explore" className="button button-ghost">
              Browse community
            </Link>
          </div>
        </section>
      );
    }
    targetUserId = currentUser.id;
    await ensureUserProfile(currentUser);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, created_at, profile_categories(category_id, categories(id, name)), profile_skills(skills(name)), user_roles(role)")
    .or(`id.eq.${targetUserId},username.eq.${targetUserId}`)
    .maybeSingle();

  if (!profile) {
    return (
      <section className="panel" style={{ maxWidth: 540, margin: "40px auto", textAlign: "center" }}>
        <div className="eyebrow" style={{ color: "var(--coral)" }}>Not Found</div>
        <h2 style={{ fontSize: 26, margin: "14px 0" }}>Member profile not found</h2>
        <p className="member-bio" style={{ margin: "0 0 24px" }}>
          The requested member could not be located in the community directory.
        </p>
        <Link href="/explore" className="button button-ghost">
          Back to Explore
        </Link>
      </section>
    );
  }

  const [{ data: links }, projects, availableCategories] = await Promise.all([
    supabase.from("social_links").select("platform, url").eq("profile_id", profile.id),
    getProjects(profile.id),
    getCategories(),
  ]);

  const rawSkills = profile.profile_skills ?? [];
  const skills = (rawSkills as Array<{ skills?: unknown }>).flatMap((item) => {
    const skill = item.skills as { name?: string } | Array<{ name?: string }> | null;
    return Array.isArray(skill)
      ? skill.flatMap((entry) => (entry.name ? [entry.name] : []))
      : skill?.name ? [skill.name] : [];
  });
  const selectedCategories = (profile.profile_categories ?? []).flatMap((item: { category_id?: string; categories?: unknown }) => {
    const category = Array.isArray(item.categories) ? item.categories[0] : item.categories;
    return category && typeof category === "object" && "id" in category && "name" in category
      ? [{ id: String(category.id), name: String(category.name) }]
      : [];
  });
  const roles = (profile.user_roles ?? []).map((entry: { role?: string }) => entry.role).filter(Boolean) as string[];

  const profileData: ProfileData = {
    id: profile.id,
    username: profile.username,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url,
    bio: profile.bio,
    createdAt: profile.created_at,
    skills,
    categories: selectedCategories,
    role: roles[0] ?? "member",
    links: (links ?? []).map((l) => ({ platform: l.platform, url: l.url })),
    projects,
  };

  const isOwner = currentUser?.id === profile.id;

  return <ProfileClient profile={profileData} categories={availableCategories} isOwner={isOwner} />;
}
