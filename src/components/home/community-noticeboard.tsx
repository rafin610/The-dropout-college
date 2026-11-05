import Link from "next/link";
import { ArrowUpRight, Bell, Calendar, Flame, Info, Sparkles } from "lucide-react";
import type { Announcement } from "@/server/site-content";

export function CommunityNoticeboardSection({
  announcements,
  title = "Community Noticeboard",
  eyebrow = "Announcements & Updates",
}: {
  announcements: Announcement[];
  title?: string;
  eyebrow?: string;
}) {
  const publishedAnnouncements = announcements.filter((a) => a.published);

  if (publishedAnnouncements.length === 0) {
    return null;
  }

  return (
    <section className="section home-noticeboard-section" id="noticeboard" aria-label="Community Noticeboard">
      <div className="section-heading">
        <div>
          <div className="eyebrow">
            <Sparkles size={11} className="home-hero-sparkle" /> {eyebrow}
          </div>
          <h2>{title}</h2>
        </div>
      </div>

      <div className="home-noticeboard-grid">
        {publishedAnnouncements.map((item) => {
          let Icon = Info;
          let tone = "notice-news";
          if (item.type === "event") {
            Icon = Calendar;
            tone = "notice-event";
          } else if (item.type === "challenge") {
            Icon = Flame;
            tone = "notice-challenge";
          } else if (item.type === "update") {
            Icon = Bell;
            tone = "notice-update";
          }

          return (
            <article key={item.id} className={`home-notice-card ${tone}`}>
              <div className="home-notice-header">
                <span className="home-notice-type">
                  <Icon size={12} />
                  <span>{item.type.toUpperCase()}</span>
                </span>
                <span className="home-notice-date">{item.date}</span>
              </div>

              <h3 className="home-notice-title">{item.title}</h3>
              <p className="home-notice-content">{item.content}</p>

              {item.linkUrl && (
                <div className="home-notice-footer">
                  <Link
                    href={item.linkUrl}
                    className="home-notice-link"
                    target={item.linkUrl.startsWith("http") ? "_blank" : undefined}
                    rel={item.linkUrl.startsWith("http") ? "noreferrer" : undefined}
                  >
                    <span>{item.linkText || "Learn More"}</span>
                    <ArrowUpRight size={13} />
                  </Link>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
