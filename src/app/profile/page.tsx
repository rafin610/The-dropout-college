import Link from "next/link";
import { getOptionalUser, ensureUserProfile } from "@/server/auth/current-user";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { getCategories, getProjects, getSkills } from "@/lib/supabase-data";
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

  const [linksRes, projects, availableCategories, availableSkills, badgesRes, commentsRes, commentCountRes] = await Promise.all([
    supabase.from("social_links").select("platform, url").eq("profile_id", profile.id),
    getProjects(profile.id),
    getCategories(),
    getSkills(),
    // Achievements: real awarded badges only. Missing table => empty state.
    supabase
      .from("profile_badges")
      .select("awarded_at, badges(id, name, description, icon)")
      .eq("profile_id", profile.id)
      .order("awarded_at", { ascending: false })
      .then((res) => ({ data: res.data ?? [], error: res.error }), () => ({ data: [], error: { message: "unavailable" } })),
    // Recent discussion activity with project context.
    supabase
      .from("project_comments")
      .select("id, content, created_at, project_id, projects(id, name)")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(5)
      .then((res) => ({ data: res.data ?? [] }), () => ({ data: [] })),
    supabase
      .from("project_comments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .then((res) => ({ count: res.count ?? 0 }), () => ({ count: 0 })),
  ]);
  const links = linksRes.data;

  const rawSkills = profile.profile_skills ?? [];
  const skills = (rawSkills as Array<{ skill_id?: string; skills?: unknown }>).flatMap((item) => {
    const skill = item.skills as { name?: string } | Array<{ name?: string }> | null;
    return Array.isArray(skill)
      ? skill.flatMap((entry) => (entry.name ? [{ id: item.skill_id ?? "", name: entry.name }] : []))
      : skill?.name ? [{ id: item.skill_id ?? "", name: skill.name }] : [];
  });
  const selectedCategories = (profile.profile_categories ?? []).flatMap((item: { category_id?: string; categories?: unknown }) => {
    const category = Array.isArray(item.categories) ? item.categories[0] : item.categories;
    return category && typeof category === "object" && "id" in category && "name" in category
      ? [{ id: String(category.id), name: String(category.name) }]
      : [];
  });
  const roles = (profile.user_roles ?? []).map((entry: { role?: string }) => entry.role).filter(Boolean) as string[];

  type BadgeRow = { awarded_at?: string; badges?: { id?: string; name?: string; description?: string; icon?: string | null } | Array<{ id?: string; name?: string; description?: string; icon?: string | null }> | null };
  const badges = ((badgesRes.data ?? []) as BadgeRow[]).flatMap((row) => {
    const b = Array.isArray(row.badges) ? row.badges[0] : row.badges;
    return b?.name ? [{ id: String(b.id ?? b.name), name: String(b.name), description: b.description ? String(b.description) : null, icon: b.icon ? String(b.icon) : null, awardedAt: row.awarded_at ? String(row.awarded_at) : null }] : [];
  });

  type ActivityItem = { id: string; kind: "project" | "discussion" | "achievement" | "joined"; title: string; subtitle: string | null; projectId: string | null; at: string };
  const activity: ActivityItem[] = [];
  for (const p of projects.slice(0, 4)) {
    if (p.createdAt) activity.push({ id: `project-${p.id}`, kind: "project", title: "Created a project", subtitle: p.name, projectId: p.id, at: p.createdAt });
  }
  type CommentRow = { id?: string; content?: string; created_at?: string; project_id?: string; projects?: { id?: string; name?: string } | Array<{ id?: string; name?: string }> | null };
  for (const c of ((commentsRes.data ?? []) as CommentRow[])) {
    if (!c?.id || !c.created_at) continue;
    const proj = Array.isArray(c.projects) ? c.projects[0] : c.projects;
    const snippet = String(c.content ?? "").slice(0, 90);
    activity.push({ id: `comment-${c.id}`, kind: "discussion", title: proj?.name ? `Joined a discussion on ${proj.name}` : "Joined a discussion", subtitle: snippet ? `“${snippet}${String(c.content ?? "").length > 90 ? "…" : ""}”` : null, projectId: proj?.id ? String(proj.id) : c.project_id ? String(c.project_id) : null, at: String(c.created_at) });
  }
  for (const b of badges.slice(0, 3)) {
    if (b.awardedAt) activity.push({ id: `badge-${b.id}`, kind: "achievement", title: "Received an achievement", subtitle: b.name, projectId: null, at: b.awardedAt });
  }
  activity.push({ id: "joined", kind: "joined", title: "Joined The DropOut College", subtitle: null, projectId: null, at: profile.created_at });
  activity.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const recentActivity = activity.slice(0, 8);

  const contributions = projects.length + (commentCountRes.count ?? 0);

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
    badges,
    activity: recentActivity,
    contributions,
  };

  const isOwner = currentUser?.id === profile.id;

  return <ProfileClient profile={profileData} categories={availableCategories} skills={availableSkills} isOwner={isOwner} viewerId={currentUser?.id ?? null} />;
}
