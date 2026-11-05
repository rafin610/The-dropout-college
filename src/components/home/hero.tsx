import Link from "next/link";
import { Compass, Sparkles, FolderGit2 } from "lucide-react";
import { LearningNetwork } from "@/components/learning-network";
import type { SiteSettingsMap } from "@/server/site-content";

export function HomepageHero({ settings }: { settings: SiteSettingsMap }) {
  const badgeText = settings.hero_badge_text || "Community Discovery";
  const title = settings.hero_title || "Where relentless learners build together.";
  const description =
    settings.hero_description ||
    "The DropOut College is an editorial community discovery platform where independent developers, designers, writers, and curious creators share knowledge, ship real projects, and grow outside traditional boundaries.";

  const primaryLabel = settings.hero_primary_cta_label || "Explore Community";
  const primaryHref = settings.hero_primary_cta_href || "/explore";
  const secondaryLabel = settings.hero_secondary_cta_label || "Explore Projects";
  const secondaryHref = settings.hero_secondary_cta_href || "/projects";

  return (
    <section className="hero home-hero" aria-label="Community discovery hero">
      <div className="home-hero-content">
        <div className="eyebrow home-hero-eyebrow">
          <span className="home-hero-badge">
            <Sparkles size={11} className="home-hero-sparkle" /> {badgeText}
          </span>
          <span className="home-hero-pulse-dot" aria-hidden="true" />
        </div>

        <h1 className="home-hero-title">{title}</h1>

        <p className="hero-copy home-hero-description">{description}</p>

        <div className="hero-actions home-hero-actions">
          <Link href={primaryHref} className="button button-primary">
            <Compass size={15} />
            <span>{primaryLabel}</span>
          </Link>

          <Link href={secondaryHref} className="button button-ghost">
            <FolderGit2 size={15} />
            <span>{secondaryLabel}</span>
          </Link>
        </div>

        <div className="home-hero-tags">
          <span className="home-hero-tag">#SelfTaught</span>
          <span className="home-hero-tag">#BuildInPublic</span>
          <span className="home-hero-tag">#PeerLearning</span>
          <span className="home-hero-tag">#TheDropOutJournal</span>
        </div>
      </div>

      <div className="home-hero-visual-wrap">
        <LearningNetwork />
      </div>
    </section>
  );
}
