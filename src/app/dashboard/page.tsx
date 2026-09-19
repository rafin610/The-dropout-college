import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Bell, Plus, Compass, CalendarDays, CheckCircle2 } from "lucide-react";
import { getOptionalUser, ensureUserProfile } from "@/server/auth/current-user";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { getProjects } from "@/lib/supabase-data";
import { ProjectCard } from "@/components/cards";
import { SectionHeading } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getOptionalUser();
  if (!user) {
    redirect("/login?next=/dashboard");
  }

  await ensureUserProfile(user);
  const supabase = await createSupabaseServerClient();

  type Profile = { display_name: string | null; bio: string | null; avatar_url: string | null; user_roles: Array<{ role: string }>; profile_categories: Array<{ categories: { name: string } | Array<{ name: string }> | null }>; profile_skills: Array<{ skills: { name: string } | Array<{ name: string }> | null }> } | null;
  type Notification = { id: string; title: string; body: string | null; created_at: string };
  type UpcomingEvent = { id: string; title: string; event_type: string; starts_at: string; location: string | null };

  let profile: Profile = null;
  let notifications: Notification[] | null = null;
  let projects: Awaited<ReturnType<typeof getProjects>> = [];
  let upcomingEvents: UpcomingEvent[] = [];

  try {
    const [profileRes, notifRes, fetchedProjects, eventRes] = await Promise.all([
      supabase.from("profiles").select("display_name, bio, avatar_url, user_roles(role), profile_categories(categories(name)), profile_skills(skills(name))").eq("id", user.id).maybeSingle(),
      supabase.from("notifications").select("id, title, body, created_at").eq("profile_id", user.id).order("created_at", { ascending: false }).limit(5),
      getProjects(user.id),
      supabase.from("events").select("id, title, event_type, starts_at, location").eq("status", "published").gte("starts_at", new Date().toISOString()).order("starts_at").limit(3),
    ]);
    profile = profileRes.data;
    notifications = notifRes.data;
    projects = fetchedProjects;
    upcomingEvents = eventRes.data ?? [];
  } catch {
    return (
      <section className="panel">
        <h2>Unable to load your dashboard</h2>
        <p className="member-bio">Please try refreshing the page or sign in again.</p>
        <Link href="/login?next=/dashboard" className="button button-primary" style={{ marginTop: 16 }}>
          Sign in
        </Link>
      </section>
    );
  }

  const role = profile?.user_roles?.[0]?.role ?? "member";
  const categoryNames = (profile?.profile_categories ?? []).flatMap((entry) => {
    const category = Array.isArray(entry.categories) ? entry.categories[0] : entry.categories;
    return category?.name ? [category.name] : [];
  });
  const skillNames = (profile?.profile_skills ?? []).flatMap((entry) => {
    const skill = Array.isArray(entry.skills) ? entry.skills[0] : entry.skills;
    return skill?.name ? [skill.name] : [];
  });
  const completionItems = [profile?.display_name, profile?.bio, profile?.avatar_url, categoryNames.length > 0, projects.length > 0];
  const completion = Math.round((completionItems.filter(Boolean).length / completionItems.length) * 100);

  return (
    <>
      <div className="page-title">
        <div className="eyebrow">Your dashboard</div>
        <h1>
          {profile?.display_name || "Your space"}<br />
          <span style={{ color: "var(--lime)" }}>keep moving.</span>
        </h1>
        <p>{profile?.bio || "Complete your profile so the right people can find you."}</p>
      </div>

      <div className="stats-grid">
        <div className="stat"><strong>{completion}%</strong><span>Profile complete</span></div>
        <div className="stat"><strong>{projects.length}</strong><span>Your projects</span></div>
        <div className="stat"><strong>{upcomingEvents.length}</strong><span>Upcoming events</span></div>
        <div className="stat"><strong>{role.replaceAll("_", " ")}</strong><span>Current role</span></div>
      </div>

      <section className="content-grid section" style={{ marginTop: 28 }}>
        <div className="panel">
          <div className="eyebrow">Your profile signal</div>
          <h3 style={{ marginTop: 8 }}>{categoryNames.length ? categoryNames.join(" · ") : "Choose your focus areas"}</h3>
          <p className="member-bio">{skillNames.length ? `${skillNames.slice(0, 5).join(", ")} are part of your public profile.` : "Add categories and skills so relevant collaborators can find you."}</p>
          <Link href="/profile" className="section-link">Manage profile <ArrowRight size={12} /></Link>
        </div>
        <div className="panel">
          <div className="eyebrow"><CalendarDays size={13} style={{ verticalAlign: "middle", marginRight: 6 }} />Next on the calendar</div>
          {upcomingEvents.length ? upcomingEvents.map((event) => <div className="activity" key={event.id}><div className="activity-icon"><CheckCircle2 size={14} /></div><div>{event.title}<span>{new Date(event.starts_at).toLocaleString()} {event.location ? `· ${event.location}` : ""}</span></div></div>) : <p className="member-bio">No upcoming events are scheduled.</p>}
        </div>
      </section>

      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>
            <Bell size={15} style={{ verticalAlign: "middle", color: "var(--lime)", marginRight: 8 }} />
            Notifications
          </h3>
          <Link href="/profile" className="section-link">Profile settings <ArrowRight size={12} /></Link>
        </div>
        {notifications?.length ? (
          <div className="activity-list">
            {notifications.map((notification) => (
              <div className="activity" key={notification.id}>
                <div className="activity-icon">!</div>
                <div>
                  {notification.title}
                  <span>{notification.body}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="member-bio">No notifications yet. You will be alerted when other members interact with your projects.</p>
        )}
      </div>

      <section className="section">
        <SectionHeading
          eyebrow="In motion"
          title="Your projects"
          action={<Link href="/projects" className="section-link">View all <ArrowRight size={13} /></Link>}
        />
        <div className="project-grid">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
          <Link
            href="/projects"
            className="project-card"
            style={{ justifyContent: "center", alignItems: "center", color: "var(--muted)", minHeight: 220 }}
          >
            <Plus size={24} color="var(--lime)" />
            <span style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: "var(--text)" }}>Submit a new project</span>
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="discord-banner">
          <div>
            <div className="eyebrow">Explore opportunities</div>
            <h2>Find active teams and mentors</h2>
            <p>Browse through ongoing community discussions and open contributor roles.</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/explore" className="button button-ghost">
              <Compass size={14} /> Explore Directory
            </Link>
            <Link href="https://discord.gg/3xfu5TMgF" target="_blank" rel="noreferrer" className="button button-primary">
              Join Discord
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}