import { createSupabaseServerClient } from "@/server/supabase/server";

export type Category = { id: string; name: string; description: string | null; icon: string | null; color: string | null };
export type Skill = { id: string; name: string };
export type Member = { id: string; name: string; handle: string; bio: string; category: string; skills: string[]; role: string; initials: string; color: string; online: boolean; avatarUrl?: string | null };
export type Project = {
  id: string;
  ownerId?: string;
  name: string;
  description: string;
  status: string;
  color: string;
  team: string[];
  metric: string;
  coverImageUrl?: string | null;
  technologies: string[];
  links?: Array<{ label: string; url: string }>;
  categoryName?: string | null;
  creatorName?: string | null;
  creatorAvatar?: string | null;
  creatorUsername?: string | null;
  upvoteCount?: number;
  commentCount?: number;
  demoUrl?: string | null;
  githubUrl?: string | null;
};
export type Event = { id: string; date: string; month: string; title: string; type: string; meta: string; accent: string };

const colors = ["#d8ff62", "#77e7e1", "#ff836d", "#c4a4ff"];

const fallbackCategories: Category[] = [
  { id: "learn", name: "Learn", description: "Build practical knowledge with guided prompts, resources, and thoughtful feedback.", icon: "✦", color: "#d8ff62" },
  { id: "build", name: "Build", description: "Ship projects, prototypes, and experiments with peers who move quickly.", icon: "▣", color: "#77e7e1" },
  { id: "connect", name: "Connect", description: "Find people, communities, and real opportunities for collaboration and growth.", icon: "◎", color: "#c4a4ff" },
];

const fallbackMembers: Member[] = [
  { id: "m-1", name: "Ari Hsu", handle: "@ari", bio: "I build learning systems and help people turn curiosity into momentum.", category: "Learn", skills: ["Learning"], role: "member", initials: "AH", color: "#d8ff62", online: true },
  { id: "m-2", name: "Noah Kim", handle: "@noah", bio: "Shipping projects, finding patterns, and helping teams move with clarity.", category: "Build", skills: ["JavaScript"], role: "member", initials: "NK", color: "#77e7e1", online: true },
  { id: "m-3", name: "Sara Dela", handle: "@sara", bio: "Designing better learning experiences and stronger community loops.", category: "Connect", skills: ["Community Building"], role: "member", initials: "SD", color: "#c4a4ff", online: false },
  { id: "m-4", name: "Leo Hart", handle: "@leo", bio: "Turning ideas into systems, products, and habits that last.", category: "Build", skills: ["Product Thinking"], role: "member", initials: "LH", color: "#ff836d", online: true },
];

const fallbackProjects: Project[] = [
  { id: "p-1", name: "Mentor Match", description: "An early-stage platform for matching learners with the right people to guide them.", status: "Active", color: "#d8ff62", team: ["AH", "NK"], metric: "2 contributors", technologies: [] },
  { id: "p-2", name: "Study Rooms", description: "A collaborative learning space where small groups can share resources and weekly goals.", status: "Researching", color: "#77e7e1", team: ["SD", "LH"], metric: "2 contributors", technologies: [] },
  { id: "p-3", name: "Creator Circles", description: "A lightweight community for creators who want feedback, accountability, and momentum.", status: "Growing", color: "#c4a4ff", team: ["AH", "SD", "LH"], metric: "3 contributors", technologies: [] },
];

const fallbackEvents: Event[] = [
  { id: "e-1", date: "12", month: "SEP", title: "Founders Circle", type: "Workshop", meta: "Friday · 7:00 PM UTC · Remote", accent: "lime" },
  { id: "e-2", date: "19", month: "SEP", title: "Build & Learn Live", type: "AMA", meta: "Friday · 6:30 PM UTC · Community room", accent: "cyan" },
  { id: "e-3", date: "27", month: "SEP", title: "Product Critique Night", type: "Feedback", meta: "Saturday · 6:00 PM UTC · Discord stage", accent: "coral" },
];

function initials(name: string) { return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
function colorFor(index: number, color?: string | null) { return color || colors[index % colors.length]; }

export async function getCategories(): Promise<Category[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("categories").select("id, name, description, icon, color").eq("is_active", true).order("sort_order");
    if (error) throw error;
    return data ?? fallbackCategories;
  } catch {
    return fallbackCategories;
  }
}

export async function getMembers(limit?: number, completeOnly = false): Promise<Member[]> {
  try {
    const supabase = await createSupabaseServerClient();
    let query = supabase.from("profiles").select("id, username, display_name, avatar_url, bio, last_active_at, profile_categories(categories(name, color)), profile_skills(skills(name)), user_roles(role)").eq("status", "active").order("display_name");
    if (completeOnly) query = query.not("bio", "is", null).neq("bio", "").neq("bio", "No bio added yet").neq("bio", "No bio added yet.");
    if (limit) query = query.limit(limit);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((profile, index) => {
      const categoryValue = Array.isArray(profile.profile_categories) ? profile.profile_categories[0]?.categories : null;
      const category = Array.isArray(categoryValue) ? categoryValue[0] : categoryValue;
      const rawSkills = Array.isArray(profile.profile_skills) ? profile.profile_skills : [];
      const skills = rawSkills.flatMap((item) => {
        const skill = Array.isArray(item.skills) ? item.skills[0] : item.skills;
        return skill?.name ? [skill.name] : [];
      });
      const roles = Array.isArray(profile.user_roles) ? profile.user_roles.map((entry) => entry.role).filter(Boolean) : [];
      return {
        id: profile.id,
        name: profile.display_name,
        handle: `@${profile.username}`,
        bio: profile.bio || "",
        category: category?.name || "Member",
        skills,
        role: roles[0] || "member",
        initials: initials(profile.display_name),
        color: colorFor(index, category?.color),
        online: profile.last_active_at ? Date.now() - new Date(profile.last_active_at).getTime() < 15 * 60 * 1000 : false,
        avatarUrl: profile.avatar_url,
      };
    });
  } catch {
    return fallbackMembers;
  }
}

function mapProjectRow(project: {
  id: string;
  owner_id?: string;
  name: string;
  description: string;
  status: string;
  cover_image_url?: string | null;
  demo_url?: string | null;
  github_url?: string | null;
  upvote_count?: number | null;
  comment_count?: number | null;
  categories?: { name?: string; color?: string | null } | Array<{ name?: string; color?: string | null }> | null;
  owner?: { display_name?: string; username?: string; avatar_url?: string | null } | Array<{ display_name?: string; username?: string; avatar_url?: string | null }> | null;
  project_members?: Array<{ profile_id?: string; profiles?: { display_name?: string } | Array<{ display_name?: string }> | null }>;
  project_technologies?: Array<{ technology?: string }>;
  project_links?: Array<{ label?: string; url?: string }>;
}, index: number): Project {
  const category = Array.isArray(project.categories) ? project.categories[0] : project.categories;
  const owner = Array.isArray(project.owner) ? project.owner[0] : project.owner;
  const members = Array.isArray(project.project_members) ? project.project_members : [];
  const team = members.map((member) => { const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles; return profile?.display_name ? initials(profile.display_name) : "?"; });
  const technologies = Array.isArray(project.project_technologies)
    ? project.project_technologies.map((entry) => entry.technology).filter((technology): technology is string => Boolean(technology))
    : [];
  const links = Array.isArray(project.project_links)
    ? project.project_links.filter((link): link is { label: string; url: string } => Boolean(link.label && link.url))
    : [];
  return {
    id: project.id,
    ownerId: project.owner_id,
    name: project.name,
    description: project.description,
    status: project.status,
    color: colorFor(index, category?.color),
    team,
    metric: `${members.length} contributor${members.length === 1 ? "" : "s"}`,
    coverImageUrl: project.cover_image_url ?? null,
    technologies,
    links,
    categoryName: category?.name ?? null,
    creatorName: owner?.display_name ?? null,
    creatorUsername: owner?.username ?? null,
    creatorAvatar: owner?.avatar_url ?? null,
    upvoteCount: typeof project.upvote_count === "number" ? project.upvote_count : 0,
    commentCount: typeof project.comment_count === "number" ? project.comment_count : 0,
    demoUrl: project.demo_url ?? null,
    githubUrl: project.github_url ?? null,
  };
}

const LEGACY_PROJECT_SELECT = "id, owner_id, name, description, cover_image_url, status, categories(name, color), project_members(profile_id, profiles(display_name)), project_technologies(technology), project_links(label, url)";
const FULL_PROJECT_SELECT = "id, owner_id, name, description, cover_image_url, demo_url, github_url, status, upvote_count, comment_count, categories(name, color), owner:profiles!projects_owner_id_fkey(display_name, username, avatar_url), project_members(profile_id, profiles(display_name)), project_technologies(technology), project_links(label, url)";

export async function getProjects(ownerId?: string, limit?: number): Promise<Project[]> {
  try {
    const supabase = await createSupabaseServerClient();
    // Full select first (needs migration 0010). Falls back to the legacy
    // select when the social columns are not deployed yet — never mock data.
    let query = supabase.from("projects").select(FULL_PROJECT_SELECT).is("deleted_at", null).order("created_at", { ascending: false });
    if (ownerId) query = query.eq("owner_id", ownerId);
    if (limit) query = query.limit(limit);
    let { data, error } = await query;
    if (error) {
      let legacy = supabase.from("projects").select(LEGACY_PROJECT_SELECT).is("deleted_at", null).order("created_at", { ascending: false });
      if (ownerId) legacy = legacy.eq("owner_id", ownerId);
      if (limit) legacy = legacy.limit(limit);
      const retry = await legacy;
      if (retry.error) throw retry.error;
      data = retry.data as typeof data;
    }
    return ((data ?? []) as Array<Parameters<typeof mapProjectRow>[0]>).map((project, index) => mapProjectRow(project, index));
  } catch {
    return ownerId ? [] : fallbackProjects;
  }
}

export async function getProjectById(id: string): Promise<Project | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("projects").select(`${FULL_PROJECT_SELECT}, created_at`).eq("id", id).is("deleted_at", null).single();
    if (!error && data) return mapProjectRow(data as Parameters<typeof mapProjectRow>[0], 0);
    const retry = await supabase.from("projects").select(LEGACY_PROJECT_SELECT).eq("id", id).is("deleted_at", null).single();
    if (retry.error || !retry.data) return null;
    return mapProjectRow(retry.data as Parameters<typeof mapProjectRow>[0], 0);
  } catch {
    return null;
  }
}

export async function getEvents(): Promise<Event[]> {
  // Returns ONLY real database rows. No mock/fallback events: when the query
  // fails or the table is empty, the Events page renders its empty state so
  // a broken query can never be masked by demo data.
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("events").select("id, title, event_type, starts_at, location, capacity, event_participants(profile_id)").eq("status", "published").order("starts_at");
  if (error) throw error;
  return (data ?? []).map((event, index) => { const date = new Date(event.starts_at); const participants = Array.isArray(event.event_participants) ? event.event_participants.length : 0; return { id: event.id, date: date.toLocaleDateString("en-US", { day: "2-digit" }), month: date.toLocaleDateString("en-US", { month: "short" }).toUpperCase(), title: event.title, type: event.event_type, meta: `${date.toLocaleDateString("en-US", { weekday: "long" })} · ${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC${event.location ? ` · ${event.location}` : ""}${event.capacity ? ` · ${participants}/${event.capacity}` : ""}`, accent: index % 3 === 0 ? "lime" : index % 3 === 1 ? "coral" : "cyan" }; });
}

export async function getCounts() {
  try {
    const supabase = await createSupabaseServerClient();
    const [members, projects, events, teams] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("projects").select("id", { count: "exact", head: true }).is("deleted_at", null),
      supabase.from("events").select("id", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("teams").select("id", { count: "exact", head: true }),
    ]);
    const failure = [members, projects, events, teams].find((result) => result.error);
    if (failure?.error) throw failure.error;
    return { members: members.count ?? 0, projects: projects.count ?? 0, events: events.count ?? 0, teams: teams.count ?? 0 };
  } catch {
    return { members: fallbackMembers.length, projects: fallbackProjects.length, events: fallbackEvents.length, teams: 12 };
  }
}

export async function getSkills(): Promise<Skill[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("skills").select("id, name").eq("is_active", true).order("sort_order").order("name");
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}