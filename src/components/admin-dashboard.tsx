"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminEvents } from "@/components/admin-events";
import type { JournalArticle } from "@/server/journal/types";

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
  const [canManageRoles, setCanManageRoles] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");

  const [articles, setArticles] = useState<JournalArticle[]>([]);

  // Journal deletion state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [siteRes, overviewRes, usersRes, journalRes] = await Promise.all([
          fetch("/api/v1/admin/site", { cache: "no-store" }),
          fetch("/api/v1/admin/overview", { cache: "no-store" }),
          fetch("/api/v1/admin/users?page=1&pageSize=50", { cache: "no-store" }),
          fetch("/api/v1/journal/articles?scope=staff", { cache: "no-store" }),
        ]);

        if (siteRes.ok) {
          const siteData = await siteRes.json();
          const nextSettings = { ...defaultSettings, ...(siteData?.data?.settings ?? {}) };
          setSettings(nextSettings);
          setSections(siteData?.data?.sections?.length ? siteData.data.sections : defaultSections);
          setSocialLinks(siteData?.data?.socialLinks?.length ? siteData.data.socialLinks : defaultSocialLinks);
        }

        if (journalRes.ok) {
          const journalData = await journalRes.json();
          setArticles(journalData?.data ?? []);
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
          setCanManageRoles(Boolean(userData?.capabilities?.canManageRoles));
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
    return userRows.filter((user) => {
      const matchesSearch =
        !search.trim() ||
        `${user.displayName} ${user.username} ${user.email}`.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || user.status.toLowerCase() === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, userRows]);

  async function saveSiteChanges() {
    setMessage("Saving website content...");
    try {
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
      setTimeout(() => setMessage(""), 4000);
    } catch {
      setMessage("Network error saving website content.");
    }
  }

  async function updateUserStatus(userId: string, status: string) {
    setPendingUserId(userId);
    setMessage(`Updating status to ${status}...`);
    try {
      const response = await fetch("/api/v1/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status }),
      });

      const body = await response.json().catch(() => null);
      if (response.ok && body?.data) {
        setUserRows((current) => current.map((user) => (user.id === userId ? body.data : user)));
        setMessage("User status updated successfully.");
        setTimeout(() => setMessage(""), 3000);
        return;
      }

      setMessage(body?.error?.message || "The member status could not be updated.");
    } catch {
      setMessage("Network error while updating user status.");
    } finally {
      setPendingUserId(null);
    }
  }

  async function updateUserRole(userId: string, role: string) {
    if (!canManageRoles) return;
    setPendingUserId(userId);
    setMessage(`Updating role to ${role}...`);
    try {
      const response = await fetch("/api/v1/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });

      const body = await response.json().catch(() => null);
      if (response.ok && body?.data) {
        setUserRows((current) => current.map((user) => (user.id === userId ? body.data : user)));
        setMessage(`User role changed to ${role}.`);
        setTimeout(() => setMessage(""), 3000);
        return;
      }

      setMessage(body?.error?.message || "The member role could not be updated.");
    } catch {
      setMessage("Network error while updating user role.");
    } finally {
      setPendingUserId(null);
    }
  }

  async function deleteJournalArticle() {
    if (!deleteTarget || deleteLoading) return;
    setDeleteLoading(true);
    setDeleteMessage(null);
    try {
      const response = await fetch(`/api/v1/journal/articles/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (response.ok || response.status === 204) {
        setArticles((current) => current.filter((a) => a.id !== deleteTarget.id));
        setDeleteMessage({ type: "success", text: `"${deleteTarget.title}" has been deleted successfully.` });
        setDeleteTarget(null);
        setTimeout(() => setDeleteMessage(null), 4000);
      } else {
        const body = await response.json().catch(() => null);
        const errorText = body?.error?.message || `Failed to delete article (${response.status}).`;
        setDeleteMessage({ type: "error", text: errorText });
      }
    } catch {
      setDeleteMessage({ type: "error", text: "Network error. Please check your connection and try again." });
    } finally {
      setDeleteLoading(false);
    }
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
          <Link className="button button-ghost" href="/">Exit admin</Link>
        </div>
      </header>

      <div className="admin-layout">
        <aside className="admin-nav">
          <div className="admin-nav-label">Sections</div>
          {[
            ["overview", "Overview"],
            ["users", "Users"],
            ["journal", "Journal Articles"],
            ["events", "Events"],
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
                              <button
                                type="button"
                                onClick={() => updateUserStatus(user.id, user.status === "active" ? "suspended" : "active")}
                                style={{
                                  background: user.status === "active" ? "rgba(255, 107, 107, 0.1)" : "rgba(34, 197, 94, 0.1)",
                                  border: `1px solid ${user.status === "active" ? "rgba(255, 107, 107, 0.3)" : "rgba(34, 197, 94, 0.3)"}`,
                                  color: user.status === "active" ? "var(--coral)" : "var(--lime)",
                                  borderRadius: "6px",
                                  padding: "4px 10px",
                                  fontSize: "0.8rem",
                                  cursor: "pointer",
                                }}
                              >
                                {user.status === "active" ? "Suspend" : "Activate"}
                              </button>
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
                      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users by name, handle, or email" />
                    </div>
                    <div className="filter-row">
                      <button
                        className={`filter ${statusFilter === "all" ? "active" : ""}`}
                        type="button"
                        onClick={() => setStatusFilter("all")}
                      >
                        All
                      </button>
                      <button
                        className={`filter ${statusFilter === "active" ? "active" : ""}`}
                        type="button"
                        onClick={() => setStatusFilter("active")}
                      >
                        Active
                      </button>
                      <button
                        className={`filter ${statusFilter === "suspended" ? "active" : ""}`}
                        type="button"
                        onClick={() => setStatusFilter("suspended")}
                      >
                        Suspended
                      </button>
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
                      {filteredUsers.length ? filteredUsers.map((user) => (
                        <div className="admin-table-row" key={user.id}>
                          <div className="admin-member">
                            <span className="admin-avatar">{user.displayName.slice(0, 2).toUpperCase()}</span>
                            <div>
                              <strong>{user.displayName}</strong>
                              <small>@{user.username}</small>
                            </div>
                          </div>
                          <span className="admin-email" title={user.email}>{user.email}</span>
                          <div>
                            <select
                              className="role-select"
                              value={user.roles[0] || "member"}
                              onChange={(e) => updateUserRole(user.id, e.target.value)}
                              aria-label={`Change role for ${user.displayName}`}
                              disabled={!canManageRoles || pendingUserId === user.id}
                            >
                              <option value="member">member</option>
                              <option value="mentor">mentor</option>
                              <option value="event_organizer">organizer</option>
                              <option value="moderator">moderator</option>
                              <option value="admin">admin</option>
                            </select>
                          </div>
                          <span className={`status-badge ${user.status === "active" ? "active" : "inactive"}`}>{user.status}</span>
                          <div className="inline-actions">
                            <button
                              type="button"
                              disabled={pendingUserId === user.id}
                              onClick={() => updateUserStatus(user.id, user.status === "active" ? "suspended" : "active")}
                              style={{
                                background: user.status === "active" ? "rgba(255, 107, 107, 0.1)" : "rgba(34, 197, 94, 0.1)",
                                border: `1px solid ${user.status === "active" ? "rgba(255, 107, 107, 0.3)" : "rgba(34, 197, 94, 0.3)"}`,
                                color: user.status === "active" ? "#ff6b6b" : "var(--lime)",
                                borderRadius: "6px",
                                padding: "4px 10px",
                                fontSize: "0.8rem",
                                cursor: pendingUserId === user.id ? "wait" : "pointer",
                              }}
                            >
                                {pendingUserId === user.id ? "Saving…" : user.status === "active" ? "Suspend" : "Activate"}
                            </button>
                          </div>
                        </div>
                      )) : (
                        <div className="admin-table-row">
                          <span style={{ color: "var(--muted)" }}>No users found</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {tab === "events" && <AdminEvents />}

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

              {tab === "journal" && (
                <div className="admin-panel">
                  <div className="section-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h2>The DropOut Journal Publications</h2>
                      <p>Manage essays, review drafts, and launch the writing studio.</p>
                    </div>
                    <Link href="/journal/studio" className="button button-primary" style={{ whiteSpace: "nowrap" }}>
                      + New Article
                    </Link>
                  </div>

                  {deleteMessage && (
                    <div
                      role="status"
                      aria-live="polite"
                      style={{
                        marginTop: 12,
                        padding: "10px 16px",
                        borderRadius: 8,
                        fontSize: 13,
                        background: deleteMessage.type === "success" ? "rgba(34, 197, 94, 0.1)" : "rgba(255, 107, 107, 0.1)",
                        border: `1px solid ${deleteMessage.type === "success" ? "rgba(34, 197, 94, 0.3)" : "rgba(255, 107, 107, 0.3)"}`,
                        color: deleteMessage.type === "success" ? "var(--lime)" : "var(--coral)",
                      }}
                    >
                      {deleteMessage.text}
                    </div>
                  )}

                  {articles.length === 0 ? (
                    <div className="admin-empty">
                      <p>No journal articles found. Click &quot;New Article&quot; to write your first piece.</p>
                    </div>
                  ) : (
                    <div className="admin-table-wrap" style={{ marginTop: 20 }}>
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Title</th>
                            <th>Author</th>
                            <th>Category</th>
                            <th>Status</th>
                            <th>Reading Time</th>
                            <th>Updated</th>
                            <th style={{ textAlign: "right" }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {articles.map((art) => (
                            <tr key={art.id}>
                              <td>
                                <strong>{art.title}</strong>
                                <div style={{ fontSize: 11, color: "var(--muted)" }}>/journal/{art.slug}</div>
                              </td>
                              <td>{art.author?.displayName || "Author"}</td>
                              <td>{art.categoryName || "General"}</td>
                              <td>
                                <span className={`status-pill status-${art.status}`}>
                                  {art.status}
                                </span>
                              </td>
                              <td>{art.readingTimeMinutes || 1} min</td>
                              <td style={{ fontSize: 12 }}>
                                {new Date(art.updatedAt || art.createdAt).toLocaleDateString()}
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <div style={{ display: "inline-flex", gap: 6 }}>
                                  <Link
                                    href={`/journal/studio/${art.id}`}
                                    className="button button-ghost button-sm"
                                    style={{ padding: "4px 8px", fontSize: 12 }}
                                  >
                                    Edit
                                  </Link>
                                  {art.status === "published" && (
                                    <Link
                                      href={`/journal/${art.slug}`}
                                      className="button button-ghost button-sm"
                                      target="_blank"
                                      style={{ padding: "4px 8px", fontSize: 12 }}
                                    >
                                      View
                                    </Link>
                                  )}
                                  <button
                                    type="button"
                                    aria-label={`Delete ${art.title}`}
                                    onClick={() => setDeleteTarget({ id: art.id, title: art.title })}
                                    style={{
                                      padding: "4px 8px",
                                      fontSize: 12,
                                      background: "rgba(255, 107, 107, 0.08)",
                                      border: "1px solid rgba(255, 107, 107, 0.25)",
                                      color: "#ff6b6b",
                                      borderRadius: 6,
                                      cursor: "pointer",
                                      transition: "all 0.15s ease",
                                    }}
                                    onMouseEnter={(e) => {
                                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(255, 107, 107, 0.18)";
                                      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255, 107, 107, 0.5)";
                                    }}
                                    onMouseLeave={(e) => {
                                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(255, 107, 107, 0.08)";
                                      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255, 107, 107, 0.25)";
                                    }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Delete Confirmation Dialog */}
                  {deleteTarget && (
                    <div
                      style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0, 0, 0, 0.6)",
                        backdropFilter: "blur(6px)",
                        zIndex: 200,
                        display: "grid",
                        placeItems: "center",
                      }}
                      onClick={(e) => { if (e.target === e.currentTarget && !deleteLoading) { setDeleteTarget(null); setDeleteMessage(null); } }}
                    >
                      <div
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="delete-dialog-title"
                        aria-describedby="delete-dialog-desc"
                        style={{
                          width: "min(440px, 90vw)",
                          background: "var(--popover)",
                          border: "1px solid var(--line)",
                          borderRadius: 12,
                          padding: "28px 24px 24px",
                          boxShadow: "var(--shadow-lg)",
                        }}
                      >
                        <div style={{ marginBottom: 8 }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: 40,
                              height: 40,
                              borderRadius: 10,
                              background: "rgba(255, 107, 107, 0.12)",
                              marginBottom: 12,
                            }}
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M3 6h18" />
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          </span>
                        </div>
                        <h3 id="delete-dialog-title" style={{ margin: "0 0 8px", fontSize: 18 }}>Delete article?</h3>
                        <p id="delete-dialog-desc" style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 8px", lineHeight: 1.5 }}>
                          You are about to permanently delete:
                        </p>
                        <p style={{
                          fontWeight: 600,
                          fontSize: 14,
                          padding: "10px 14px",
                          borderRadius: 8,
                          background: "rgba(255, 107, 107, 0.06)",
                          border: "1px solid rgba(255, 107, 107, 0.15)",
                          margin: "0 0 12px",
                          wordBreak: "break-word",
                        }}>
                          &ldquo;{deleteTarget.title}&rdquo;
                        </p>
                        <p style={{ color: "var(--muted)", fontSize: 12, margin: "0 0 20px", lineHeight: 1.5 }}>
                          This action cannot be undone. The article and its content will be permanently removed.
                        </p>

                        {deleteMessage && deleteMessage.type === "error" && (
                          <p role="alert" style={{ color: "var(--coral)", fontSize: 13, margin: "0 0 14px" }}>{deleteMessage.text}</p>
                        )}

                        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            className="button button-ghost"
                            disabled={deleteLoading}
                            onClick={() => { setDeleteTarget(null); setDeleteMessage(null); }}
                            style={{ padding: "8px 16px", fontSize: 13 }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={deleteLoading}
                            onClick={() => void deleteJournalArticle()}
                            style={{
                              padding: "8px 18px",
                              fontSize: 13,
                              fontWeight: 600,
                              background: deleteLoading ? "rgba(255, 107, 107, 0.3)" : "#ff6b6b",
                              color: "#fff",
                              border: "none",
                              borderRadius: 8,
                              cursor: deleteLoading ? "not-allowed" : "pointer",
                              transition: "background 0.15s ease",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            {deleteLoading ? "Deleting…" : "Delete permanently"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
