import { getCategories, getCounts, getMembers, getProjects } from "@/lib/supabase-data";
import { getPublishedArticles } from "@/server/journal/articles";
import { getAnnouncements, getSiteSections, getSiteSettings } from "@/server/site-content";
import { HomepageHero } from "@/components/home/hero";
import { JournalCarousel } from "@/components/home/journal-carousel";
import { AboutPreviewSection } from "@/components/home/about-preview";
import { FeaturedProjectsSection } from "@/components/home/featured-projects";
import { FeaturedMembersSection } from "@/components/home/featured-members";
import { CommunityActivitySection } from "@/components/home/community-activity";
import { CommunityStatsSection } from "@/components/home/community-stats";
import { CommunityNoticeboardSection } from "@/components/home/community-noticeboard";
import { FinalCommunityCTA } from "@/components/home/final-cta";
import { StayConnected } from "@/components/social";
import { DISCORD_INVITE_URL } from "@/lib/site-cms-types";

export const dynamic = "force-dynamic";

export default async function Home() {
  let categories: Awaited<ReturnType<typeof getCategories>> = [];
  let members: Awaited<ReturnType<typeof getMembers>> = [];
  let journalArticles: Awaited<ReturnType<typeof getPublishedArticles>>["articles"] = [];
  let projects: Awaited<ReturnType<typeof getProjects>> = [];
  let announcements: Awaited<ReturnType<typeof getAnnouncements>> = [];
  let counts: Awaited<ReturnType<typeof getCounts>> = { members: 0, projects: 0, events: 0, teams: 0 };
  let settings: Awaited<ReturnType<typeof getSiteSettings>> = {};
  let sections: Awaited<ReturnType<typeof getSiteSections>> = [];
  let loadError = false;

  try {
    const [
      fetchedCategories,
      fetchedMembers,
      journalData,
      fetchedProjects,
      fetchedAnnouncements,
      fetchedCounts,
      fetchedSettings,
      fetchedSections,
    ] = await Promise.all([
      getCategories(),
      getMembers(12, true),
      getPublishedArticles({ limit: 12 }),
      getProjects(undefined, 6),
      getAnnouncements(),
      getCounts(),
      getSiteSettings(),
      getSiteSections(),
    ]);

    categories = fetchedCategories;
    members = fetchedMembers;
    journalArticles = journalData.articles;
    projects = fetchedProjects;
    announcements = fetchedAnnouncements;
    counts = fetchedCounts;
    settings = fetchedSettings;
    sections = fetchedSections;
  } catch {
    loadError = true;
  }

  if (loadError) {
    return (
      <section className="panel" style={{ padding: 40, textAlign: "center" }}>
        <h2>Unable to load community discovery</h2>
        <p className="member-bio">Please check your connection and try again.</p>
      </section>
    );
  }

  // Section visibility check helper
  const isSectionEnabled = (slug: string, defaultState = true): boolean => {
    const found = sections.find(
      (s) => s.slug === slug || s.slug === slug.replace("-", "_")
    );
    if (!found) return defaultState;
    return Boolean(found.enabled);
  };

  const getSectionConfig = (slug: string): Record<string, unknown> => {
    const found = sections.find(
      (s) => s.slug === slug || s.slug === slug.replace("-", "_")
    );
    if (!found) return {};
    return {
      ...found.content,
      title: found.title,
      description: found.description,
      cta_label: found.cta_label,
      cta_href: found.cta_href,
    };
  };

  // Journal carousel articles ordering / selection
  const carouselConfig = getSectionConfig("journal-carousel");
  const articleIds = carouselConfig.featuredArticleIds ?? carouselConfig.pinnedArticleIds;
  const configuredArticleIds = Array.isArray(articleIds)
    ? articleIds.filter((id): id is string => typeof id === "string")
    : [];

  let carouselArticles = [...journalArticles];
  if (configuredArticleIds.length > 0) {
    // Put explicitly ordered articles first
    const customOrdered = configuredArticleIds
      .map((id) => carouselArticles.find((a) => a.id === id))
      .filter((a): a is (typeof carouselArticles)[0] => Boolean(a));
    const remainder = carouselArticles.filter((a) => !configuredArticleIds.includes(a.id));
    carouselArticles = [...customOrdered, ...remainder];
  } else {
    // Sort featured articles to the front
    carouselArticles.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  }

  // Featured projects ordering / selection
  const projectsConfig = getSectionConfig("featured-projects");
  const projectIds = projectsConfig.featuredProjectIds ?? projectsConfig.pinnedProjectIds;
  const configuredProjectIds = Array.isArray(projectIds)
    ? projectIds.filter((id): id is string => typeof id === "string")
    : [];

  let featuredProjects = [...projects];
  if (configuredProjectIds.length > 0) {
    const customOrdered = configuredProjectIds
      .map((id) => featuredProjects.find((p) => p.id === id))
      .filter((p): p is (typeof featuredProjects)[0] => Boolean(p));
    const remainder = featuredProjects.filter((p) => !configuredProjectIds.includes(p.id));
    featuredProjects = [...customOrdered, ...remainder];
  }

  // Featured members selection
  const membersConfig = getSectionConfig("featured-members");
  const memberIds = membersConfig.featuredMemberIds ?? membersConfig.pinnedUserIds;
  const configuredMemberIds = Array.isArray(memberIds)
    ? memberIds.filter((id): id is string => typeof id === "string")
    : [];

  let featuredMembers = members.filter((m) => {
    const bio = m.bio.trim().replace(/[.]$/, "");
    return bio.length > 0 && bio !== "No bio added yet";
  });
  if (configuredMemberIds.length > 0) {
    const customOrdered = configuredMemberIds
      .map((id) => featuredMembers.find((m) => m.id === id))
      .filter((m): m is (typeof featuredMembers)[0] => Boolean(m));
    const remainder = featuredMembers.filter((m) => !configuredMemberIds.includes(m.id));
    featuredMembers = [...customOrdered, ...remainder];
  }
  featuredMembers = featuredMembers.slice(0, 6);

  // Real database-driven statistics (Never fake or hardcoded numbers)
  const realStats: Array<{ label: string; value: number | string; description?: string }> = [];
  if (counts.members > 0) {
    realStats.push({
      label: "Community Members",
      value: counts.members,
      description: "Self-driven builders & learners",
    });
  }
  if (journalArticles.length > 0) {
    realStats.push({
      label: "Published Journals",
      value: journalArticles.length,
      description: "Original essays & breakdowns",
    });
  }
  if (counts.projects > 0) {
    realStats.push({
      label: "Shipped Projects",
      value: counts.projects,
      description: "Live prototypes & software",
    });
  }
  if (categories.length > 0) {
    realStats.push({
      label: "Core Focus Tracks",
      value: categories.length,
      description: "Learn, Build & Connect",
    });
  }

  const inviteUrl = settings.community_invite_link || DISCORD_INVITE_URL;

  return (
    <div className="home-discovery-page">
      {/* 1. Featured Journal Carousel */}
      {isSectionEnabled("journal-carousel") && (
        <JournalCarousel
          articles={carouselArticles}
          title={String(getSectionConfig("journal-carousel").title || "The DropOut Journal")}
          eyebrow={String(getSectionConfig("journal-carousel").eyebrow || "Curated Knowledge")}
        />
      )}

      {/* 2. Hero Section */}
      {isSectionEnabled("hero") && <HomepageHero settings={settings} />}

      {/* 3. Short About Preview — full story lives on /about */}
      {isSectionEnabled("about-preview") && (
        <AboutPreviewSection
          settings={settings}
          title={String(
            getSectionConfig("about-preview").title ||
              "A learning community built around curiosity, not credentials."
          )}
          eyebrow={String(
            getSectionConfig("about-preview").eyebrow || "Who We Are"
          )}
        />
      )}

      {/* 4. Featured Community Projects */}
      {isSectionEnabled("featured-projects") && (
        <FeaturedProjectsSection
          projects={featuredProjects}
          title={String(getSectionConfig("featured-projects").title || "Featured Community Projects")}
          eyebrow={String(getSectionConfig("featured-projects").eyebrow || "Built by Members")}
          description={String(
            getSectionConfig("featured-projects").description ||
              "Explore real software, experiments, and open-source tools created by community members."
          )}
        />
      )}

      {/* 4. Featured Creators & Builders */}
      {isSectionEnabled("featured-members") && (
        <FeaturedMembersSection
          members={featuredMembers}
          title={String(getSectionConfig("featured-members").title || "Featured Creators & Builders")}
          eyebrow={String(getSectionConfig("featured-members").eyebrow || "People in Motion")}
          description={String(
            getSectionConfig("featured-members").description ||
              "Meet self-taught developers, designers, and thinkers actively building inside The DropOut College."
          )}
        />
      )}

      {/* 5. Latest Community Activity Feed */}
      {isSectionEnabled("community-activity") && (
        <CommunityActivitySection
          projects={projects}
          articles={journalArticles}
          announcements={announcements}
          title={String(getSectionConfig("community-activity").title || "Latest Community Activity")}
          eyebrow={String(getSectionConfig("community-activity").eyebrow || "Pulse & Momentum")}
        />
      )}

      {/* 6. Real Community Statistics (strictly verified data only) */}
      {isSectionEnabled("community-stats") && <CommunityStatsSection stats={realStats} />}

      {/* 7. Community Noticeboard / Announcements */}
      {isSectionEnabled("community-noticeboard") && (
        <CommunityNoticeboardSection
          announcements={announcements}
          title={String(getSectionConfig("community-noticeboard").title || "Community Noticeboard")}
          eyebrow={String(getSectionConfig("community-noticeboard").eyebrow || "Announcements & Updates")}
        />
      )}

      {/* Stay Connected across social channels */}
      <StayConnected />

      {/* 8. Final Community CTA */}
      {isSectionEnabled("final-cta") && (
        <FinalCommunityCTA
          title={String(getSectionConfig("final-cta").title || "Ready to build with relentless learners?")}
          description={String(
            getSectionConfig("final-cta").description ||
              "Join The DropOut College to connect with self-directed developers, share your projects, read original essays, and build real-world momentum."
          )}
          inviteUrl={inviteUrl}
        />
      )}
    </div>
  );
}
