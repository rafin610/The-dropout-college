import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { getCategories, getCounts, getEvents, getMembers, getProjects } from "@/lib/supabase-data";
import { SectionHeading } from "@/components/app-shell";
import { EventCard, MemberCard, ProjectCard } from "@/components/cards";
import { StayConnected } from "@/components/social";
import { getSiteSections, getSiteSettings } from "@/server/site-content";

export const dynamic = "force-dynamic";

export default async function Home() {
  let categories: Awaited<ReturnType<typeof getCategories>> = [];
  let members: Awaited<ReturnType<typeof getMembers>> = [];
  let projects: Awaited<ReturnType<typeof getProjects>> = [];
  let events: Awaited<ReturnType<typeof getEvents>> = [];
  let counts: Awaited<ReturnType<typeof getCounts>> = { members: 0, projects: 0, events: 0, teams: 0 };
  let settings: Awaited<ReturnType<typeof getSiteSettings>> = {};
  let sections: Awaited<ReturnType<typeof getSiteSections>> = [];
  let loadError = false;

  try {
    [categories, members, projects, events, counts, settings, sections] = await Promise.all([
      getCategories(),
      getMembers(8, true),
      getProjects(undefined, 6),
      getEvents(),
      getCounts(),
      getSiteSettings(),
      getSiteSections(),
    ]);
  } catch {
    loadError = true;
  }

  if (loadError) {
    return (
      <section className="panel">
        <h2>Unable to load the network</h2>
        <p className="member-bio">Please try again later.</p>
      </section>
    );
  }

  const valuesSection = sections.find((section) => section.slug === "community-values");
  const rawCards =
    valuesSection?.content && typeof valuesSection.content === "object" && "cards" in valuesSection.content
      ? (valuesSection.content as { cards?: unknown }).cards
      : null;
  const communityValues = Array.isArray(rawCards)
    ? rawCards.filter((card): card is string => typeof card === "string")
    : ["Curiosity", "Learning", "Sharing", "Helping", "Collaboration", "Growth"];

  const whoWeAre = sections.find((section) => section.slug === "who-we-are");
  const ourAim = sections.find((section) => section.slug === "our-aim");
  const ourGoal = sections.find((section) => section.slug === "our-goal");
  const whyJoin = sections.find((section) => section.slug === "why-join");
  const heroCtaHref = settings.hero_cta_href || "https://discord.gg/3xfu5TMgF";
  const inviteLink = settings.community_invite_link || heroCtaHref;
  const featuredMembers = members.filter((member) => {
    const bio = member.bio.trim().replace(/[.]$/, "");
    return bio.length > 0 && bio !== "No bio added yet";
  });
  const stats: Array<[number, string]> = [
    [counts.members, counts.members === 1 ? "member" : "members"],
    [counts.projects, counts.projects === 1 ? "project" : "projects"],
    ...(counts.events > 0 ? [[counts.events, counts.events === 1 ? "event" : "events"] as [number, string]] : []),
    ...(counts.teams > 0 ? [[counts.teams, counts.teams === 1 ? "team" : "teams"] as [number, string]] : []),
  ];

  return (
    <>
      <section className="hero">
        <div>
          <div className="eyebrow">
            {settings.hero_subtitle || "A home for the relentlessly curious"} <span style={{ color: "var(--lime)" }}>●</span>
          </div>
          <h1>{settings.hero_title || "Make your next move together."}</h1>
          <p className="hero-copy">
            {settings.hero_description || "The DropOut College is a learning-focused community built around curiosity, knowledge sharing, guidance, collaboration, and personal growth."}
          </p>
          <div className="hero-actions">
            <Link href={inviteLink} className="button button-ghost" target={inviteLink.startsWith("http") ? "_blank" : undefined} rel={inviteLink.startsWith("http") ? "noreferrer" : undefined}>
              <MessageCircle size={15} /> Join Discord
            </Link>
          </div>
        </div>
        <div className="hero-art" aria-label="Abstract network visualization">
          <span className="hero-orbit" />
          <div style={{ position: "absolute", left: 20, top: 18, color: "var(--muted)", font: "10px DM Mono" }}>LIVE / {counts.members}</div>
          <div style={{ position: "absolute", right: 20, top: 18, color: "var(--muted)", font: "10px DM Mono" }}>NETWORK</div>
        </div>
      </section>

      <section className="stats-grid" aria-label="Community statistics">
        {stats.map(([value, label]) => (
          <div className="stat" key={String(label)}>
            <strong>{String(value)}</strong>
            <span>{String(label)}</span>
          </div>
        ))}
      </section>

      <section className="content-grid section">
        <div className="content-panel">
          <div className="eyebrow">Who We Are</div>
          <h2>{whoWeAre?.title || "Who We Are"}</h2>
          <p>{settings.who_we_are || "We are creating an environment where people can come together, learn new things, ask questions, share knowledge, help each other, and grow together."}</p>
        </div>
        <div className="content-panel accent-panel">
          <div className="eyebrow">Our Aim</div>
          <h2>{ourAim?.title || "Our Aim"}</h2>
          <p>{settings.our_aim || "To build a positive learning culture where curiosity is encouraged, beginners feel supported, useful knowledge is shared, and members grow through guidance and collaboration."}</p>
        </div>
      </section>

      <section className="section">
        <SectionHeading
          eyebrow="Learning-first culture"
          title={ourGoal?.title || "Our Goal"}
        />
        <div className="feature-grid">
          {["Guidance", "Resources", "People to learn with", "People to ask questions", "Opportunities to share knowledge", "Opportunities to collaborate"].map((item) => (
            <div className="feature-tile" key={item}>
              <span className="feature-index">{item.slice(0, 1)}</span>
              <p>{item}</p>
            </div>
          ))}
        </div>
        <p className="lead-copy">{settings.our_goal || "We are not trying to create a community where one person teaches everyone. Instead, everyone can learn, contribute, help, and grow."}</p>
      </section>

      <section className="section" id="community-values">
        <SectionHeading
          eyebrow="Our values"
          title="Community culture"
          action={<Link href="/explore" className="section-link">Meet the community <ArrowRight size={13} /></Link>}
        />
        <div className="value-grid">
          {communityValues.map((value, idx) => (
            <article className="value-card" key={`${value}-${idx}`}>
              <div className="value-icon">0{idx + 1}</div>
              <h3>{value}</h3>
              <p>
                {idx === 0 && "Always be willing to explore something new."}
                {idx === 1 && "Never stop improving yourself and building your skills."}
                {idx === 2 && "Share useful knowledge, resources, and discoveries with others."}
                {idx === 3 && "If you know something, help someone who does not yet."}
                {idx === 4 && "Build and learn together instead of learning alone."}
                {idx === 5 && "Focus on becoming better every day."}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <SectionHeading eyebrow="Find your frequency" title="Communities with range." action={<Link href="/explore" className="section-link">View all <ArrowRight size={13} /></Link>} />
        <div className="category-grid">
          {categories.length ? (
            categories.map((category) => (
              <Link href={`/explore?category=${category.id}`} className="category-card" key={category.id}>
                <span className="category-icon">{category.icon || "•"}</span>
                <h3>{category.name}</h3>
                <p>{category.description || "No description added yet."}</p>
                <div className="category-meta"><span>Explore</span><span>↗</span></div>
              </Link>
            ))
          ) : (
            <p className="muted-text">No categories have been added yet.</p>
          )}
        </div>
      </section>

      <section className="section">
        <SectionHeading eyebrow="People in motion" title="People building, sharing, growing." action={<Link href="/explore" className="section-link">Browse people <ArrowRight size={13} /></Link>} />
        <div className="member-grid">{featuredMembers.map((member) => <MemberCard key={member.id} member={member} />)}</div>
      </section>

      <section className="section">
        <SectionHeading eyebrow="What people are making" title="Fresh projects and ideas." action={<Link href="/projects" className="section-link">See projects <ArrowRight size={13} /></Link>} />
        <div className="project-grid">{projects.map((project) => <ProjectCard key={project.id} project={project} />)}</div>
      </section>

      <section className="section">
        <SectionHeading eyebrow="Live sessions" title="Events to join." action={<Link href="/events" className="section-link">View calendar <ArrowRight size={13} /></Link>} />
        <div className="event-grid">{events.map((event) => <EventCard key={event.id} event={event} />)}</div>
      </section>

      <StayConnected />

      <section className="section">
        <div className="discord-banner">
          <div>
            <div className="eyebrow">You are welcome here</div>
            <h2>{whyJoin?.title || "Have something you want to learn?"}</h2>
          </div>
          <div>
            <p>{whyJoin?.description || "Have something you want to learn? Have something you want to share? Want to grow with like-minded people?"}</p>
            <div className="hero-actions compact-actions">
              <Link href={inviteLink} className="button button-primary" target={inviteLink.startsWith("http") ? "_blank" : undefined} rel={inviteLink.startsWith("http") ? "noreferrer" : undefined}>
                <MessageCircle size={15} /> Join Discord
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
