"use client";

import { useEffect, useMemo, useState } from "react";

type Metric = { label: string; value: number; tone: string };

type SiteSettings = Record<string, string>;
type SiteSection = {
  id?: string;
  slug: string;
  title: string;
  description: string;
  cta_label: string;
  cta_href: string;
  enabled: boolean;
  sort_order: number;
  content?: Record<string, unknown>;
};
type SocialLink = {
  id?: string;
  platform: string;
  label: string;
  url: string;
  enabled: boolean;
  sort_order: number;
};
type UserRow = {
  id: string;
  displayName: string;
  username: string;
  email: string;
  status: string;
  createdAt: string;
  roles: string[];
};

const defaultSettings: SiteSettings = {
  site_name: "The DropOut College",
  site_description: "A learning-focused community built around curiosity, knowledge sharing, guidance, collaboration, and personal growth.",
  hero_title: "Make your next move together.",
  hero_subtitle: "A home for the relentlessly curious",
  hero_description: "The DropOut College is a learning-focused community where people come together to learn, ask questions, share ideas, and grow with like-minded people.",
  hero_cta_text: "Join The DropOut College",
  hero_cta_href: "https://discord.gg/3xfu5TMgF",
  who_we_are: "We are creating an environment where people can come together, learn new things, ask questions, share knowledge, help each other, and grow together.",
  our_aim: "To build a positive learning culture where curiosity is encouraged, beginners feel supported, useful knowledge is shared, and members grow through guidance and collaboration.",
  our_goal: "To build a large, supportive ecosystem where anyone with the willingness to learn can find guidance, resources, people to learn with, and opportunities to share and collaborate.",
  footer_text: "The DropOut College is a learning community for curious people who want to grow together through guidance, sharing, and collaboration.",
  community_invite_link: "https://discord.gg/3xfu5TMgF",
  contact_email: "hello@thedropoutcollege.com",
  contact_phone: "+1 (000) 000-0000",
  discord_link: "https://discord.gg/3xfu5TMgF",
  github_link: "",
  facebook_link: "",
  instagram_link: "",
  youtube_link: "",
};

const defaultSections: SiteSection[] = [
  { slug: "who-we-are", title: "Who We Are", description: "Learning-focused people building a positive environment for curiosity, guidance, and personal growth.", cta_label: "Learn more", cta_href: "#who-we-are", enabled: true, sort_order: 1 },
  { slug: "our-aim", title: "Our Aim", description: "We want to create a supportive culture where people genuinely want to learn and improve together.", cta_label: "Explore the community", cta_href: "/explore", enabled: true, sort_order: 2 },
  { slug: "our-goal", title: "Our Goal", description: "We want to build a learning ecosystem where everyone can find guidance, resources, and people to learn and collaborate with.", cta_label: "Join the community", cta_href: "https://discord.gg/3xfu5TMgF", enabled: true, sort_order: 3 },
  { slug: "community-values", title: "Community Values", description: "The culture of The DropOut College is centered on curiosity, learning, and helping one another grow.", cta_label: "Meet the community", cta_href: "/explore", enabled: true, sort_order: 4 },
  { slug: "why-join", title: "Why Join Us", description: "Because learning is more rewarding when it happens together with thoughtful, motivated people.", cta_label: "Join now", cta_href: "https://discord.gg/3xfu5TMgF", enabled: true, sort_order: 5 },
];

const defaultSocialLinks: SocialLink[] = [
  { platform: "discord", label: "Discord", url: "https://discord.gg/3xfu5TMgF", enabled: true, sort_order: 1 },
  { platform: "github", label: "GitHub", url: "", enabled: true, sort_order: 2 },
  { platform: "instagram", label: "Instagram", url: "", enabled: true, sort_order: 3 },
  { platform: "facebook", label: "Facebook", url: "", enabled: true, sort_order: 4 },
  { platform: "youtube", label: "YouTube", url: "", enabled: true, sort_order: 5 },
];

export function AdminDashboard() {
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [sections, setSections] = useState<SiteSection[]>(defaultSections);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(defaultSocialLinks);
  const [userRows, setUserRows] = useState<UserRow[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [siteRes, overviewRes, usersRes] = await Promise.all([
          fetch("/api/v1/admin/site", { cache: "no-store" }),
          fetch("/api/v1/admin/overview", { cache: "no-store" }),
          fetch("/api/v1/admin/users?page=1&pageSize=10", { cache: "no-store" }),
        ]);

        if (siteRes.ok) {
          const siteData = await siteRes.json();
          const nextSettings = { ...defaultSettings, ...(siteData?.data?.settings ?? {}) };
          setSettings(nextSettings);
          setSections(siteData?.data?.sections?.length ? siteData.data.sections : defaultSections);
          setSocialLinks(siteData?.data?.socialLinks?.length ? siteData.data.socialLinks : defaultSocialLinks);
        }

        if (overviewRes.ok) {
          const overviewData = await overviewRes.json();
          const data = overviewData?.data ?? {};
          setMetrics([
            { label: "Total users", value: Number(data.users ?? 0), tone: "lime" },
            { label: "Active users", value: Number(data.activeUsers ?? 0), tone: "cyan" },
            { label: "Published content", value: Number(data.events ?? 0), tone: "coral" },
            { label: "Open reports", value: Number(data.openReports ?? 0), tone: "violet" },
          ]);
        }

        if (usersRes.ok) {
          const userData = await usersRes.json();
          setUserRows(userData?.data ?? []);
        }
      } catch {
        setMessage("Unable to load admin data right now.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return userRows;
    return userRows.filter((user) => `${user.displayName} ${user.username} ${user.email}`.toLowerCase().includes(search.toLowerCase()));
  }, [search, userRows]);

  async function saveSiteChanges() {
    setMessage("Saving website content...");
    const response = await fetch("/api/v1/admin/site", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings, sections, socialLinks }),
    });

    if (!response.ok) {
      setMessage("The website updates could not be saved.");
      return;
    }

    setMessage("Website changes saved successfully.");
  }

  async function updateUserStatus(userId: string, status: string) {
    const response = await fetch("/api/v1/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, status }),
    });

    if (response.ok) {
      setUserRows((current) => current.map((user) => (user.id === userId ? { ...user, status } : user)));
      setMessage("User status updated.");
      return;
    }

    setMessage("You do not have permission to change this user.");
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <div className="eyebrow">Control room</div>
          <h1>Manage the room<br /><span>worth joining.</span></h1>
          <p>Use the admin dashboard to manage users, community content, navigation, and the public website.</p>
        </div>
        <div className="admin-header-actions">
          <a className="button button-ghost" href="/">Exit admin</a>
        </div>
      </header>

      <div className="admin-layout">
        <aside className="admin-nav">
          <div className="admin-nav-label">Sections</div>
          {[
            ["overview", "Overview"],
            ["users", "Users"],
            ["website", "Website CMS"],
            ["settings", "Settings"],
          ].map(([id, label]) => (
            <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>
          ))}
        </aside>

        <div>
          {loading ? <div className="admin-empty"><p className="loading">Loading admin dashboard…</p></div> : (
            <>
              {tab === "overview" && (
                <>
                  <div className="admin-metrics">
                    {metrics.map((metric) => (
                      <div className="admin-metric" key={metric.label}>
                        <div className={`admin-metric-icon ${metric.tone}`}>
                          <span>{metric.label.slice(0, 1)}</span>
                        </div>
                        <span>{metric.label}</span>
                        <strong>{metric.value}</strong>
                        <small>Live</small>
                      </div>
                    ))}
                  </div>

                  <div className="admin-panel" style={{ marginTop: 20 }}>
                    <div className="section-heading">
                      <div>
                        <div className="eyebrow">Members</div>
                        <h2>Recently active</h2>
                      </div>
                    </div>
                    <div className="table-wrap">
                      <div className="admin-table">
                        <div className="admin-table-head">
                          <span>User</span>
                          <span>Role</span>
                          <span>Status</span>
                          <span>Joined</span>
                          <span>Action</span>
                        </div>
                        {filteredUsers.length ? filteredUsers.map((user) => (
                          <div className="admin-table-row" key={user.id}>
                            <div className="admin-member">
                              <span className="admin-avatar">{user.displayName.slice(0, 2).toUpperCase()}</span>
                              <div>
                                <strong>{user.displayName}</strong>
                                <small>@{user.username}</small>
                              </div>
                            </div>
                            <span>{user.roles[0] || "member"}</span>
                            <span className={`status-badge ${user.status === "active" ? "active" : "inactive"}`}>{user.status}</span>
                            <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                            <div className="inline-actions">
                              <button onClick={() => updateUserStatus(user.id, user.status === "active" ? "suspended" : "active")}>Toggle</button>
                            </div>
                          </div>
                        )) : <div className="admin-table-row"><span>No users found</span></div>}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {tab === "users" && (
                <div className="admin-panel">
                  <div className="section-heading">
                    <div>
                      <div className="eyebrow">People</div>
                      <h2>User management</h2>
                    </div>
                  </div>

                  <div className="toolbar" style={{ marginBottom: 20 }}>
                    <div className="input-wrap">
                      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users" />
                    </div>
                    <div className="filter-row">
                      <button className="filter active" type="button">All</button>
                      <button className="filter" type="button">Active</button>
                      <button className="filter" type="button">Suspended</button>
                    </div>
                  </div>

                  <div className="table-wrap">
                    <div className="admin-table">
                      <div className="admin-table-head">
                        <span>Name</span>
                        <span>Email</span>
                        <span>Role</span>
                        <span>Status</span>
                        <span>Action</span>
                      </div>
                      {filteredUsers.map((user) => (
                        <div className="admin-table-row" key={user.id}>
                          <div className="admin-member">
                            <span className="admin-avatar">{user.displayName.slice(0, 2).toUpperCase()}</span>
                            <div>
                              <strong>{user.displayName}</strong>
                              <small>@{user.username}</small>
                            </div>
                          </div>
                          <span>{user.email}</span>
                          <span>{user.roles[0] || "member"}</span>
                          <span className={`status-badge ${user.status === "active" ? "active" : "inactive"}`}>{user.status}</span>
                          <div className="inline-actions">
                            <button onClick={() => updateUserStatus(user.id, user.status === "active" ? "suspended" : "active")}>Toggle</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {tab === "website" && (
                <div className="admin-panel">
                  <div className="section-heading">
                    <div>
                      <div className="eyebrow">CMS</div>
                      <h2>Website content editor</h2>
                    </div>
                  </div>

                  <div className="admin-form-grid">
                    <div className="field full">
                      <label>Hero title</label>
                      <input value={settings.hero_title ?? ""} onChange={(event) => setSettings({ ...settings, hero_title: event.target.value })} />
                    </div>
                    <div className="field">
                      <label>Hero subtitle</label>
                      <input value={settings.hero_subtitle ?? ""} onChange={(event) => setSettings({ ...settings, hero_subtitle: event.target.value })} />
                    </div>
                    <div className="field">
                      <label>Hero CTA text</label>
                      <input value={settings.hero_cta_text ?? ""} onChange={(event) => setSettings({ ...settings, hero_cta_text: event.target.value })} />
                    </div>
                    <div className="field full">
                      <label>Hero description</label>
                      <textarea value={settings.hero_description ?? ""} onChange={(event) => setSettings({ ...settings, hero_description: event.target.value })} />
                    </div>
                    <div className="field full">
                      <label>Who We Are</label>
                      <textarea value={settings.who_we_are ?? ""} onChange={(event) => setSettings({ ...settings, who_we_are: event.target.value })} />
                    </div>
                    <div className="field full">
                      <label>Our Aim</label>
                      <textarea value={settings.our_aim ?? ""} onChange={(event) => setSettings({ ...settings, our_aim: event.target.value })} />
                    </div>
                    <div className="field full">
                      <label>Our Goal</label>
                      <textarea value={settings.our_goal ?? ""} onChange={(event) => setSettings({ ...settings, our_goal: event.target.value })} />
                    </div>
                    <div className="field full">
                      <label>Footer text</label>
                      <textarea value={settings.footer_text ?? ""} onChange={(event) => setSettings({ ...settings, footer_text: event.target.value })} />
                    </div>
                    <div className="field full">
                      <label>CTA link</label>
                      <input value={settings.hero_cta_href ?? ""} onChange={(event) => setSettings({ ...settings, hero_cta_href: event.target.value })} />
                    </div>
                    <div className="field full">
                      <label>Community invite URL</label>
                      <input value={settings.community_invite_link ?? ""} onChange={(event) => setSettings({ ...settings, community_invite_link: event.target.value })} />
                    </div>
                  </div>

                  <div style={{ marginTop: 20 }}>
                    <h3>Section blocks</h3>
                    <div className="pill-row">
                      {sections.map((section) => (
                        <button key={section.slug} type="button" className="filter active" onClick={() => {
                          const next = sections.map((item) => item.slug === section.slug ? { ...item, enabled: !item.enabled } : item);
                          setSections(next);
                        }}>
                          {section.title} {section.enabled ? "On" : "Off"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: 24 }}>
                    <button className="button button-primary" type="button" onClick={saveSiteChanges}>Save website content</button>
                    {message && <p style={{ marginTop: 12, color: "var(--muted)" }}>{message}</p>}
                  </div>
                </div>
              )}

              {tab === "settings" && (
                <div className="admin-panel">
                  <div className="section-heading">
                    <div>
                      <div className="eyebrow">Settings</div>
                      <h2>Social links & contact</h2>
                    </div>
                  </div>

                  <div className="admin-form-grid">
                    <div className="field">
                      <label>Website name</label>
                      <input value={settings.site_name ?? ""} onChange={(event) => setSettings({ ...settings, site_name: event.target.value })} />
                    </div>
                    <div className="field">
                      <label>Contact email</label>
                      <input value={settings.contact_email ?? ""} onChange={(event) => setSettings({ ...settings, contact_email: event.target.value })} />
                    </div>
                    <div className="field">
                      <label>Discord</label>
                      <input value={settings.discord_link ?? ""} onChange={(event) => setSettings({ ...settings, discord_link: event.target.value })} />
                    </div>
                    <div className="field">
                      <label>GitHub</label>
                      <input value={settings.github_link ?? ""} onChange={(event) => setSettings({ ...settings, github_link: event.target.value })} />
                    </div>
                    <div className="field">
                      <label>Instagram</label>
                      <input value={settings.instagram_link ?? ""} onChange={(event) => setSettings({ ...settings, instagram_link: event.target.value })} />
                    </div>
                    <div className="field">
                      <label>YouTube</label>
                      <input value={settings.youtube_link ?? ""} onChange={(event) => setSettings({ ...settings, youtube_link: event.target.value })} />
                    </div>
                    <div className="field">
                      <label>Facebook</label>
                      <input value={settings.facebook_link ?? ""} onChange={(event) => setSettings({ ...settings, facebook_link: event.target.value })} />
                    </div>
                    <div className="field">
                      <label>Contact phone</label>
                      <input value={settings.contact_phone ?? ""} onChange={(event) => setSettings({ ...settings, contact_phone: event.target.value })} />
                    </div>
                  </div>

                  <div style={{ marginTop: 24 }}>
                    <button className="button button-primary" type="button" onClick={saveSiteChanges}>Save settings</button>
                    {message && <p style={{ marginTop: 12, color: "var(--muted)" }}>{message}</p>}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
