import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Bell, Plus, Compass } from "lucide-react";
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

  type Profile = { display_name: string | null; bio: string | null } | null;
  type Notification = { id: string; title: string; body: string | null; created_at: string };

  let profile: Profile = null;
  let notifications: Notification[] | null = null;
  let projects: Awaited<ReturnType<typeof getProjects>> = [];

  try {
    const [profileRes, notifRes, fetchedProjects] = await Promise.all([
      supabase.from("profiles").select("display_name, bio").eq("id", user.id).maybeSingle(),
      supabase.from("notifications").select("id, title, body, created_at").eq("profile_id", user.id).order("created_at", { ascending: false }).limit(5),
      getProjects(user.id),
    ]);
    profile = profileRes.data;
    notifications = notifRes.data;
    projects = fetchedProjects;
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
            <span style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: "#fff" }}>Submit a new project</span>
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