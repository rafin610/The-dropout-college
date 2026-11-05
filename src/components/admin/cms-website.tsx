"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ExternalLink, Eye, EyeOff } from "lucide-react";
import type { SiteSection, SiteSettingsMap } from "@/lib/site-cms-types";
import type { JournalArticle } from "@/server/journal/types";

export function CmsWebsiteTab({
  settings,
  onUpdateSettings,
  sections,
  onUpdateSections,
  articles,
  projects,
  users,
  onSave,
  saving,
  message,
}: {
  settings: SiteSettingsMap;
  onUpdateSettings: (settings: SiteSettingsMap) => void;
  sections: SiteSection[];
  onUpdateSections: (sections: SiteSection[]) => void;
  articles: JournalArticle[];
  projects: Array<{ id: string; name: string; description: string; status: string; cover_image_url?: string | null }>;
  users: Array<{ id: string; displayName: string; username: string }>;
  onSave: () => Promise<void>;
  saving: boolean;
  message: string;
}) {
  const [activeSubTab, setActiveSubTab] = useState<"hero" | "sections" | "carousel" | "projects" | "members">("hero");

  // Move section up or down
  const moveSection = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const copy = [...sections];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);

    // Re-index sort_order
    const updated = copy.map((sec, idx) => ({ ...sec, sort_order: idx + 1 }));
    onUpdateSections(updated);
  };

  // Toggle section enabled
  const toggleSection = (slug: string) => {
    const updated = sections.map((sec) =>
      sec.slug === slug ? { ...sec, enabled: !sec.enabled } : sec
    );
    onUpdateSections(updated);
  };

  // Update section title/description
  const updateSectionMeta = (slug: string, title: string, description: string) => {
    const updated = sections.map((sec) =>
      sec.slug === slug ? { ...sec, title, description } : sec
    );
    onUpdateSections(updated);
  };

  // Journal carousel configuration
  const carouselSection = sections.find((s) => s.slug === "journal-carousel");
  const carouselConfig = (carouselSection?.content || {}) as {
    autoplay?: boolean;
    intervalMs?: number;
    interval?: number;
    featuredArticleIds?: string[];
    pinnedArticleIds?: string[];
  };
  const featuredArticleIds = Array.isArray(carouselConfig.featuredArticleIds)
    ? carouselConfig.featuredArticleIds
    : Array.isArray(carouselConfig.pinnedArticleIds)
      ? carouselConfig.pinnedArticleIds
      : [];

  const toggleCarouselArticle = (articleId: string) => {
    let nextIds: string[];
    if (featuredArticleIds.includes(articleId)) {
      nextIds = featuredArticleIds.filter((id) => id !== articleId);
    } else {
      nextIds = [...featuredArticleIds, articleId];
    }

    const updated = sections.map((sec) =>
      sec.slug === "journal-carousel"
        ? {
            ...sec,
            content: {
              ...sec.content,
              featuredArticleIds: nextIds,
            },
          }
        : sec
    );
    onUpdateSections(updated);
  };

  const updateCarouselInterval = (ms: number) => {
    const updated = sections.map((sec) =>
      sec.slug === "journal-carousel"
        ? {
            ...sec,
            content: {
              ...sec.content,
              intervalMs: ms,
            },
          }
        : sec
    );
    onUpdateSections(updated);
  };

  // Featured Projects configuration
  const projectsSection = sections.find((s) => s.slug === "featured-projects");
  const projectsConfig = (projectsSection?.content || {}) as {
    featuredProjectIds?: string[];
    pinnedProjectIds?: string[];
  };
  const featuredProjectIds = Array.isArray(projectsConfig.featuredProjectIds)
    ? projectsConfig.featuredProjectIds
    : Array.isArray(projectsConfig.pinnedProjectIds)
      ? projectsConfig.pinnedProjectIds
      : [];

  const toggleFeaturedProject = (projectId: string) => {
    let nextIds: string[];
    if (featuredProjectIds.includes(projectId)) {
      nextIds = featuredProjectIds.filter((id) => id !== projectId);
    } else {
      nextIds = [...featuredProjectIds, projectId];
    }

    const updated = sections.map((sec) =>
      sec.slug === "featured-projects"
        ? {
            ...sec,
            content: {
              ...sec.content,
              featuredProjectIds: nextIds,
            },
          }
        : sec
    );
    onUpdateSections(updated);
  };

  // Featured Members configuration
  const membersSection = sections.find((s) => s.slug === "featured-members");
  const membersConfig = (membersSection?.content || {}) as {
    featuredMemberIds?: string[];
    pinnedUserIds?: string[];
  };
  const featuredMemberIds = Array.isArray(membersConfig.featuredMemberIds)
    ? membersConfig.featuredMemberIds
    : Array.isArray(membersConfig.pinnedUserIds)
      ? membersConfig.pinnedUserIds
      : [];

  const toggleFeaturedMember = (memberId: string) => {
    let nextIds: string[];
    if (featuredMemberIds.includes(memberId)) {
      nextIds = featuredMemberIds.filter((id) => id !== memberId);
    } else {
      nextIds = [...featuredMemberIds, memberId];
    }

    const updated = sections.map((sec) =>
      sec.slug === "featured-members"
        ? {
            ...sec,
            content: {
              ...sec.content,
              featuredMemberIds: nextIds,
            },
          }
        : sec
    );
    onUpdateSections(updated);
  };

  return (
    <div className="admin-panel cms-panel">
      {/* Top Header */}
      <div className="section-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="eyebrow">Homepage CMS</div>
          <h2>Manage Discovery Homepage</h2>
          <p>Control hero copy, section hierarchy, carousel slides, and featured showcases.</p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link href="/" target="_blank" className="button button-ghost button-sm" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span>Preview Homepage</span>
            <ExternalLink size={13} />
          </Link>
          <Link href="/about" target="_blank" className="button button-ghost button-sm" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span>Preview About Us</span>
            <ExternalLink size={13} />
          </Link>
        </div>
      </div>

      {/* Sub-navigation tabs */}
      <div className="pill-row" style={{ marginTop: 16, borderBottom: "1px solid var(--line)", paddingBottom: 14 }}>
        {[
          ["hero", "Hero Section"],
          ["sections", "Section Ordering & Visibility"],
          ["carousel", "Journal Carousel"],
          ["projects", "Featured Projects"],
          ["members", "Featured Members"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`filter ${activeSubTab === id ? "active" : ""}`}
            onClick={() => setActiveSubTab(id as typeof activeSubTab)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 1. Hero Configuration */}
      {activeSubTab === "hero" && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 16, marginBottom: 14 }}>Hero Section Content</h3>
          <div className="admin-form-grid">
            <div className="field full">
              <label>Hero Headline</label>
              <input
                value={settings.hero_title ?? ""}
                onChange={(e) => onUpdateSettings({ ...settings, hero_title: e.target.value })}
                placeholder="Where relentless learners build together."
              />
            </div>

            <div className="field">
              <label>Hero Subtitle / Tag</label>
              <input
                value={settings.hero_subtitle ?? ""}
                onChange={(e) => onUpdateSettings({ ...settings, hero_subtitle: e.target.value })}
                placeholder="The Community for Self-Driven Creators"
              />
            </div>

            <div className="field">
              <label>Hero Badge Text</label>
              <input
                value={settings.hero_badge_text ?? ""}
                onChange={(e) => onUpdateSettings({ ...settings, hero_badge_text: e.target.value })}
                placeholder="Discover the Community"
              />
            </div>

            <div className="field full">
              <label>Hero Concise Description</label>
              <textarea
                value={settings.hero_description ?? ""}
                onChange={(e) => onUpdateSettings({ ...settings, hero_description: e.target.value })}
                rows={3}
                placeholder="Brief editorial summary of the community..."
              />
            </div>

            <div className="field">
              <label>Primary CTA Button Label</label>
              <input
                value={settings.hero_primary_cta_label ?? ""}
                onChange={(e) => onUpdateSettings({ ...settings, hero_primary_cta_label: e.target.value })}
                placeholder="Explore Community"
              />
            </div>

            <div className="field">
              <label>Primary CTA URL</label>
              <input
                value={settings.hero_primary_cta_href ?? ""}
                onChange={(e) => onUpdateSettings({ ...settings, hero_primary_cta_href: e.target.value })}
                placeholder="/explore"
              />
            </div>

            <div className="field">
              <label>Secondary CTA Button Label</label>
              <input
                value={settings.hero_secondary_cta_label ?? ""}
                onChange={(e) => onUpdateSettings({ ...settings, hero_secondary_cta_label: e.target.value })}
                placeholder="Explore Projects"
              />
            </div>

            <div className="field">
              <label>Secondary CTA URL</label>
              <input
                value={settings.hero_secondary_cta_href ?? ""}
                onChange={(e) => onUpdateSettings({ ...settings, hero_secondary_cta_href: e.target.value })}
                placeholder="/projects"
              />
            </div>

            <div className="field full">
              <label>Discord Invite URL</label>
              <input
                value={settings.community_invite_link ?? ""}
                onChange={(e) => onUpdateSettings({ ...settings, community_invite_link: e.target.value })}
                placeholder="https://discord.gg/3xfu5TMgF"
              />
            </div>
          </div>
        </div>
      )}

      {/* 2. Section Ordering & Visibility */}
      {activeSubTab === "sections" && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 16, marginBottom: 8 }}>Homepage Sections Manager</h3>
          <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
            Toggle sections on or off, edit their titles, and reorder their position on the discovery homepage.
          </p>

          <div style={{ display: "grid", gap: 10 }}>
            {sections
              .filter((s) => !s.slug.startsWith("about-"))
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((sec, idx) => (
                <div
                  key={sec.slug}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    borderRadius: 10,
                    gap: 12,
                    opacity: sec.enabled ? 1 : 0.65,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <button
                        type="button"
                        onClick={() => moveSection(idx, "up")}
                        disabled={idx === 0}
                        style={{ padding: "2px 6px", fontSize: 11, background: "none", border: "1px solid var(--line)", borderRadius: 4, cursor: idx === 0 ? "not-allowed" : "pointer" }}
                        title="Move Up"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSection(idx, "down")}
                        disabled={idx === sections.length - 1}
                        style={{ padding: "2px 6px", fontSize: 11, background: "none", border: "1px solid var(--line)", borderRadius: 4, cursor: idx === sections.length - 1 ? "not-allowed" : "pointer" }}
                        title="Move Down"
                      >
                        <ArrowDown size={12} />
                      </button>
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, fontVariantNumeric: "tabular-nums", color: "var(--muted)", fontWeight: 700 }}>#{sec.sort_order}</span>
                        <input
                          type="text"
                          value={sec.title}
                          onChange={(e) => updateSectionMeta(sec.slug, e.target.value, sec.description)}
                          style={{ fontWeight: 600, fontSize: 14, background: "transparent", border: "none", borderBottom: "1px dashed var(--line)", padding: "2px 4px", width: "100%", maxWidth: 300 }}
                        />
                      </div>
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>slug: {sec.slug}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => toggleSection(sec.slug)}
                      className="button button-sm"
                      style={{
                        padding: "6px 12px",
                        fontSize: 12,
                        borderRadius: 6,
                        background: sec.enabled ? "var(--accent-soft)" : "rgba(255, 107, 107, 0.1)",
                        color: sec.enabled ? "var(--accent)" : "var(--coral)",
                        border: `1px solid ${sec.enabled ? "var(--accent)" : "rgba(255, 107, 107, 0.3)"}`,
                      }}
                    >
                      {sec.enabled ? <Eye size={13} style={{ marginRight: 4 }} /> : <EyeOff size={13} style={{ marginRight: 4 }} />}
                      {sec.enabled ? "Visible" : "Hidden"}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 3. Journal Carousel Configuration */}
      {activeSubTab === "carousel" && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 16, marginBottom: 8 }}>Journal Carousel Pinned Articles</h3>
          <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
            Select which published articles appear in the homepage editorial carousel. Pinned articles will display first.
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, padding: 12, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Autoplay Interval:</label>
            <select
              value={carouselConfig.intervalMs || 5500}
              onChange={(e) => updateCarouselInterval(Number(e.target.value))}
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--bg)", fontSize: 13 }}
            >
              <option value={4000}>4.0 seconds</option>
              <option value={5500}>5.5 seconds (Default)</option>
              <option value={7000}>7.0 seconds</option>
              <option value={10000}>10.0 seconds</option>
            </select>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            {articles.length === 0 ? (
              <p className="muted-text">No articles found.</p>
            ) : (
              articles
                .filter((a) => a.status === "published")
                .map((art) => {
                  const isFeatured = featuredArticleIds.includes(art.id);
                  return (
                    <div
                      key={art.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        borderRadius: 8,
                        background: isFeatured ? "var(--accent-soft)" : "var(--surface)",
                        border: `1px solid ${isFeatured ? "var(--accent)" : "var(--line)"}`,
                        gap: 12,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ fontSize: 13, display: "block" }}>{art.title}</strong>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>
                          By {art.author?.displayName || "Author"} · {art.categoryName || "General"} · {art.readingTimeMinutes || 2} min
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleCarouselArticle(art.id)}
                        className={`button button-sm ${isFeatured ? "button-primary" : "button-ghost"}`}
                        style={{ padding: "4px 10px", fontSize: 12 }}
                      >
                        {isFeatured ? "Pinned in Carousel ★" : "+ Pin in Carousel"}
                      </button>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* 4. Featured Projects Configuration */}
      {activeSubTab === "projects" && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 16, marginBottom: 8 }}>Featured Projects Selection</h3>
          <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
            Select which community projects are highlighted on the discovery homepage.
          </p>

          <div style={{ display: "grid", gap: 8 }}>
            {projects.length === 0 ? (
              <p className="muted-text">No projects available.</p>
            ) : (
              projects.map((proj) => {
                const isSelected = featuredProjectIds.includes(proj.id);
                return (
                  <div
                    key={proj.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: isSelected ? "var(--accent-soft)" : "var(--surface)",
                      border: `1px solid ${isSelected ? "var(--accent)" : "var(--line)"}`,
                      gap: 12,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ fontSize: 13, display: "block" }}>{proj.name}</strong>
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>Status: {proj.status}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleFeaturedProject(proj.id)}
                      className={`button button-sm ${isSelected ? "button-primary" : "button-ghost"}`}
                      style={{ padding: "4px 10px", fontSize: 12 }}
                    >
                      {isSelected ? "Featured on Home ★" : "+ Feature on Home"}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 5. Featured Members Configuration */}
      {activeSubTab === "members" && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 16, marginBottom: 8 }}>Featured Members Selection</h3>
          <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
            Highlight specific active creators and builders on the homepage.
          </p>

          <div style={{ display: "grid", gap: 8 }}>
            {users.slice(0, 20).map((user) => {
              const isSelected = featuredMemberIds.includes(user.id);
              return (
                <div
                  key={user.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: 8,
                    background: isSelected ? "var(--accent-soft)" : "var(--surface)",
                    border: `1px solid ${isSelected ? "var(--accent)" : "var(--line)"}`,
                    gap: 12,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ fontSize: 13, display: "block" }}>{user.displayName}</strong>
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>@{user.username}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleFeaturedMember(user.id)}
                    className={`button button-sm ${isSelected ? "button-primary" : "button-ghost"}`}
                    style={{ padding: "4px 10px", fontSize: 12 }}
                  >
                    {isSelected ? "Pinned on Home ★" : "+ Pin on Home"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Save Bar */}
      <div style={{ marginTop: 28, paddingTop: 16, borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 14 }}>
        <button
          className="button button-primary"
          type="button"
          disabled={saving}
          onClick={onSave}
          style={{ minWidth: 160 }}
        >
          {saving ? "Saving Changes…" : "Save Homepage CMS"}
        </button>
        {message && (
          <span style={{ fontSize: 13, color: message.includes("success") ? "var(--lime)" : "var(--text)" }}>
            {message}
          </span>
        )}
      </div>
    </div>
  );
}
