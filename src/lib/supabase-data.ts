import { createSupabaseServerClient } from "@/server/supabase/server";

export type Category = { id: string; name: string; description: string | null; icon: string | null; color: string | null };
export type Member = { id: string; name: string; handle: string; bio: string; category: string; initials: string; color: string; online: boolean };
export type Project = { id: string; name: string; description: string; status: string; color: string; team: string[]; metric: string };
export type Event = { id: string; date: string; month: string; title: string; type: string; meta: string; accent: string };

const colors = ["#d8ff62", "#77e7e1", "#ff836d", "#c4a4ff"];

function initials(name: string) { return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
function colorFor(index: number, color?: string | null) { return color || colors[index % colors.length]; }

export async function getCategories(): Promise<Category[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("categories").select("id, name, description, icon, color").eq("is_active", true).order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function getMembers(): Promise<Member[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("profiles").select("id, username, display_name, bio, last_active_at, profile_categories(categories(name, color))").eq("status", "active").order("display_name");
  if (error) throw error;
  return (data ?? []).map((profile, index) => {
    const categoryValue = Array.isArray(profile.profile_categories) ? profile.profile_categories[0]?.categories : null;
    const category = Array.isArray(categoryValue) ? categoryValue[0] : categoryValue;
    return { id: profile.id, name: profile.display_name, handle: `@${profile.username}`, bio: profile.bio || "", category: category?.name || "Member", initials: initials(profile.display_name), color: colorFor(index, category?.color), online: profile.last_active_at ? Date.now() - new Date(profile.last_active_at).getTime() < 15 * 60 * 1000 : false };
  });
}

export async function getProjects(ownerId?: string): Promise<Project[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("projects").select("id, name, description, status, categories(name, color), project_members(profile_id, profiles(display_name)), project_technologies(technology)").is("deleted_at", null).order("created_at", { ascending: false });
  if (ownerId) query = query.eq("owner_id", ownerId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((project, index) => {
    const category = Array.isArray(project.categories) ? project.categories[0] : project.categories;
    const members = Array.isArray(project.project_members) ? project.project_members : [];
    const team = members.map((member) => { const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles; return profile?.display_name ? initials(profile.display_name) : "?"; });
    return { id: project.id, name: project.name, description: project.description, status: project.status, color: colorFor(index, category?.color), team, metric: `${members.length} contributor${members.length === 1 ? "" : "s"}` };
  });
}

export async function getEvents(): Promise<Event[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("events").select("id, title, event_type, starts_at, location, capacity, event_participants(profile_id)").eq("status", "published").order("starts_at");
  if (error) throw error;
  return (data ?? []).map((event, index) => { const date = new Date(event.starts_at); const participants = Array.isArray(event.event_participants) ? event.event_participants.length : 0; return { id: event.id, date: date.toLocaleDateString("en-US", { day: "2-digit" }), month: date.toLocaleDateString("en-US", { month: "short" }).toUpperCase(), title: event.title, type: event.event_type, meta: `${date.toLocaleDateString("en-US", { weekday: "long" })} · ${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC${event.location ? ` · ${event.location}` : ""}${event.capacity ? ` · ${participants}/${event.capacity}` : ""}`, accent: index % 3 === 0 ? "lime" : index % 3 === 1 ? "coral" : "cyan" }; });
}

export async function getCounts() {
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
}