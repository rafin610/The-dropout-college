import Link from "next/link";
import { ArrowRight, BookOpen, FolderGit2, Megaphone, Sparkles } from "lucide-react";
import type { Project } from "@/lib/supabase-data";
import type { JournalArticle } from "@/server/journal/types";
import type { Announcement } from "@/server/site-content";

export type ActivityItem = {
  id: string;
  type: "project" | "journal" | "announcement";
  title: string;
  subtitle: string;
  timestamp: string;
  href: string;
  badge: string;
};

export function CommunityActivitySection({
  projects = [],
  articles = [],
  announcements = [],
  title = "Latest Community Activity",
  eyebrow = "Pulse & Momentum",
}: {
  projects?: Project[];
  articles?: JournalArticle[];
  announcements?: Announcement[];
  title?: string;
  eyebrow?: string;
}) {
  const items: ActivityItem[] = [];

  // Recent announcements
  announcements
    .filter((a) => a.published)
    .slice(0, 2)
    .forEach((a) => {
      items.push({
        id: `ann-${a.id}`,
        type: "announcement",
        title: a.title,
        subtitle: a.content.slice(0, 110) + (a.content.length > 110 ? "…" : ""),
        timestamp: a.date,
        href: a.linkUrl || "#noticeboard",
        badge: "Announcement",
      });
    });

  // Recent articles
  articles.slice(0, 3).forEach((art) => {
    const dateStr = art.publishedAt
      ? new Date(art.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "Recent";
    items.push({
      id: `art-${art.id}`,
      type: "journal",
      title: art.title,
      subtitle: `By ${art.author.displayName} · ${art.readingTimeMinutes || 2} min read`,
      timestamp: dateStr,
      href: `/journal/${art.slug}`,
      badge: "Journal Published",
    });
  });

  // Recent projects
  projects.slice(0, 3).forEach((p) => {
    items.push({
      id: `proj-${p.id}`,
      type: "project",
      title: p.name,
      subtitle: p.creatorName ? `Created by ${p.creatorName} · ${p.status}` : p.status,
      timestamp: "Recent Launch",
      href: `/projects/${p.id}`,
      badge: "New Project",
    });
  });

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="section home-activity-section" aria-label="Recent Community Activity">
      <div className="section-heading">
        <div>
          <div className="eyebrow">
            <Sparkles size={11} className="home-hero-sparkle" /> {eyebrow}
          </div>
          <h2>{title}</h2>
        </div>
        <Link href="/explore" className="section-link">
          <span>Join the Activity</span> <ArrowRight size={13} />
        </Link>
      </div>

      <div className="home-activity-list">
        {items.map((item) => {
          let Icon = Sparkles;
          let toneClass = "tone-lime";
          if (item.type === "journal") {
            Icon = BookOpen;
            toneClass = "tone-cyan";
          } else if (item.type === "project") {
            Icon = FolderGit2;
            toneClass = "tone-coral";
          } else if (item.type === "announcement") {
            Icon = Megaphone;
            toneClass = "tone-violet";
          }

          return (
            <Link key={item.id} href={item.href} className="home-activity-item">
              <div className={`home-activity-icon ${toneClass}`}>
                <Icon size={16} />
              </div>

              <div className="home-activity-details">
                <div className="home-activity-top-line">
                  <span className="home-activity-badge">{item.badge}</span>
                  <span className="home-activity-time">{item.timestamp}</span>
                </div>
                <h4 className="home-activity-title">{item.title}</h4>
                <p className="home-activity-subtitle">{item.subtitle}</p>
              </div>

              <div className="home-activity-arrow" aria-hidden="true">
                <ArrowRight size={14} />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
