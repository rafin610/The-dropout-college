"use client";

import Link from "next/link";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ExternalLink,
  Eye,
  LayoutDashboard,
  Loader2,
  MessageCircle,
  Search,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { timeAgo } from "@/lib/time";
import type { JournalArticle } from "@/server/journal/types";

type PanelSection = "overview" | "members" | "journals" | "permissions";
type MemberRole = "member" | "moderator" | "admin";
type MemberStatus = "active" | "suspended" | "deleted";

interface Member {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  status: MemberStatus;
  createdAt: string;
  roles: string[];
  posts: number;
  comments: number;
  journals: number;
  followers: number;
  following: number;
}

interface Overview {
  stats: {
    totalMembers: number;
    activeMembers: number;
    suspendedMembers: number;
    newMembers: number;
    publishedPosts: number | null;
    publishedJournals: number;
    comments: number | null;
    followRelationships: number;
    admins: number;
    moderators: number;
  };
  recentMembers: Array<Pick<Member, "id" | "displayName" | "username" | "avatarUrl" | "status" | "createdAt"> & { role: MemberRole }>;
  recentActivity: Array<{
    id: string;
    kind: "post" | "comment";
    summary: string;
    createdAt: string;
    authorName: string;
    username: string;
  }>;
  recentJournals: Array<{
    id: string;
    title: string;
    slug: string;
    published_at: string | null;
    updated_at: string;
    author: { display_name?: string; username?: string } | Array<{ display_name?: string; username?: string }> | null;
  }>;
  system: { database: string; communityFeed: string; activity: string };
}

interface MemberDetail {
  profile: {
    display_name: string;
    username: string;
    avatar_url: string | null;
    bio: string | null;
    headline: string | null;
    location: string | null;
    status: MemberStatus;
    created_at: string;
  };
  roles: string[];
  activity: {
    counts: Record<"posts" | "comments" | "journals" | "followers" | "following", number | null>;
    posts: Array<{ id: string; content: string; created_at: string }>;
    comments: Array<{ id: string; content: string; created_at: string }>;
    journals: Array<{ id: string; title: string; slug: string; status: string; updated_at: string; created_at: string }>;
  };
}

interface ModeratorPermission {
  key: string;
  label: string;
  enabled: boolean;
}

type ConfirmAction = {
  member: Member;
  kind: "role" | "status";
  value: MemberRole | MemberStatus;
};
type JournalAction = {
  article: JournalArticle;
  status?: "published" | "archived";
  remove?: boolean;
};

const SECTIONS: Array<{ id: PanelSection; label: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "members", label: "Members", icon: Users },
  { id: "journals", label: "Journals", icon: BookOpen },
  { id: "permissions", label: "Roles & Permissions", icon: ShieldCheck },
];

const STAT_LABELS: Array<{ key: keyof Overview["stats"]; label: string }> = [
  { key: "totalMembers", label: "Registered members" },
  { key: "activeMembers", label: "Active members" },
  { key: "suspendedMembers", label: "Suspended members" },
  { key: "newMembers", label: "Joined in 30 days" },
  { key: "publishedPosts", label: "Published posts" },
  { key: "publishedJournals", label: "Published journals" },
  { key: "comments", label: "Comments" },
  { key: "followRelationships", label: "Follow relationships" },
  { key: "admins", label: "Admins" },
  { key: "moderators", label: "Moderators" },
];

const PERMISSION_MATRIX: Array<{
  name: string;
  permissionKey?: string;
  member: string;
  moderator: string;
  admin: string;
}> = [
  { name: "Create posts", member: "Allowed", moderator: "Allowed", admin: "Allowed" },
  { name: "Comment, Love, share and follow", member: "Allowed", moderator: "Allowed", admin: "Allowed" },
  { name: "Read published journals", member: "Allowed", moderator: "Allowed", admin: "Allowed" },
  { name: "Manage member accounts", permissionKey: "users.manage", member: "—", moderator: "Configurable", admin: "Full access" },
  { name: "Create and edit journal drafts", permissionKey: "articles.create", member: "—", moderator: "Configurable", admin: "Full access" },
  { name: "Publish or unpublish journals", permissionKey: "articles.publish", member: "—", moderator: "Configurable", admin: "Full access" },
  { name: "Moderate community projects", permissionKey: "projects.moderate", member: "—", moderator: "Configurable", admin: "Full access" },
  { name: "Manage community reports", permissionKey: "reports.manage", member: "—", moderator: "Configurable", admin: "Full access" },
  { name: "Assign roles and configure permissions", member: "—", moderator: "—", admin: "Full access" },
  { name: "Critical platform settings", member: "—", moderator: "—", admin: "Full access" },
];

function getRole(roles: readonly string[]): MemberRole {
  if (roles.includes("admin") || roles.includes("super_admin")) return "admin";
  if (roles.includes("moderator")) return "moderator";
  return "member";
}

function prettyRole(role: MemberRole) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

function getErrorMessage(body: { error?: { message?: string } } | null, fallback: string) {
  return body?.error?.message || fallback;
}

export function StaffClient({
  canManageMembers,
  canManageRoles,
  canManageJournals,
  canPublishJournals,
  canDeleteJournals,
  canAdminister,
  isSuperAdmin,
  viewerId,
  articles,
}: {
  canManageMembers: boolean;
  canManageRoles: boolean;
  canManageJournals: boolean;
  canPublishJournals: boolean;
  canDeleteJournals: boolean;
  canAdminister: boolean;
  isSuperAdmin: boolean;
  viewerId: string;
  articles: JournalArticle[];
}) {
  const [section, setSection] = useState<PanelSection>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberError, setMemberError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | MemberStatus>("all");
  const [roleFilter, setRoleFilter] = useState<"all" | MemberRole>("all");
  const [page, setPage] = useState(1);
  const [memberTotal, setMemberTotal] = useState(0);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberDetail, setMemberDetail] = useState<MemberDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<ConfirmAction | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [pendingJournal, setPendingJournal] = useState<JournalAction | null>(null);
  const [journalBusy, setJournalBusy] = useState(false);
  const [journalError, setJournalError] = useState("");
  const [permissions, setPermissions] = useState<ModeratorPermission[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissionsError, setPermissionsError] = useState("");
  const [permissionBusy, setPermissionBusy] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadOverview() {
      try {
        const response = await fetch("/api/v1/staff/overview", { cache: "no-store" });
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(getErrorMessage(body, "The campus overview could not be loaded."));
        if (active) setOverview(body?.data as Overview);
      } catch (error) {
        if (active) setOverviewError(error instanceof Error ? error.message : "The campus overview could not be loaded.");
      } finally {
        if (active) setOverviewLoading(false);
      }
    }
    void loadOverview();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (section !== "members" || !canManageMembers) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setMembersLoading(true);
      setMemberError("");
      try {
        const params = new URLSearchParams({ page: String(page), pageSize: "25" });
        if (search.trim()) params.set("search", search.trim());
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (roleFilter !== "all") params.set("role", roleFilter);
        const response = await fetch(`/api/v1/staff/members?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(getErrorMessage(body, "Members could not be loaded."));
        const data = body?.data as { members?: Member[]; total?: number } | undefined;
        setMembers(data?.members ?? []);
        setMemberTotal(data?.total ?? 0);
      } catch (error) {
        if (!controller.signal.aborted) {
          setMemberError(error instanceof Error ? error.message : "Members could not be loaded.");
        }
      } finally {
        if (!controller.signal.aborted) setMembersLoading(false);
      }
    }, search.trim() ? 200 : 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [canManageMembers, page, roleFilter, search, section, statusFilter]);

  useEffect(() => {
    if (section !== "permissions") return;
    let active = true;
    async function loadPermissions() {
      setPermissionsLoading(true);
      setPermissionsError("");
      try {
        const response = await fetch("/api/v1/staff/moderator-permissions", { cache: "no-store" });
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(getErrorMessage(body, "Moderator permissions could not be loaded."));
        if (active) setPermissions(Array.isArray(body?.data) ? body.data : []);
      } catch (error) {
        if (active) setPermissionsError(error instanceof Error ? error.message : "Moderator permissions could not be loaded.");
      } finally {
        if (active) setPermissionsLoading(false);
      }
    }
    void loadPermissions();
    return () => {
      active = false;
    };
  }, [section]);

  useEffect(() => {
    if (!selectedMember) return;
    const memberId = selectedMember.id;
    const controller = new AbortController();
    async function loadMember() {
      setDetailLoading(true);
      try {
        const response = await fetch(`/api/v1/staff/members/${memberId}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(getErrorMessage(body, "The member profile could not be loaded."));
        setMemberDetail(body?.data as MemberDetail);
      } catch (error) {
        if (!controller.signal.aborted) {
          setActionError(error instanceof Error ? error.message : "The member profile could not be loaded.");
        }
      } finally {
        if (!controller.signal.aborted) setDetailLoading(false);
      }
    }
    void loadMember();
    return () => controller.abort();
  }, [selectedMember]);

  const memberPages = Math.max(1, Math.ceil(memberTotal / 25));
  const visibleJournals = useMemo(() => articles, [articles]);

  async function confirmMemberAction() {
    if (!pendingAction || actionBusy) return;
    setActionBusy(true);
    setActionError("");
    const { member, kind, value } = pendingAction;
    try {
      const response = await fetch("/api/v1/staff/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: member.id,
          [kind]: value,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(getErrorMessage(body, "The member could not be updated."));

      setMembers((current) =>
        current.map((item) =>
          item.id === member.id
            ? kind === "role"
              ? { ...item, roles: [String(value)] }
              : { ...item, status: value as MemberStatus }
            : item,
        ),
      );
      if (selectedMember?.id === member.id && memberDetail) {
        if (kind === "role") setMemberDetail({ ...memberDetail, roles: [String(value)] });
        else setMemberDetail({ ...memberDetail, profile: { ...memberDetail.profile, status: value as MemberStatus } });
      }
      setPendingAction(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "The member could not be updated.");
    } finally {
      setActionBusy(false);
    }
  }

  async function togglePermission(permission: ModeratorPermission) {
    if (!canManageRoles || permissionBusy) return;
    setPermissionBusy(permission.key);
    setPermissionsError("");
    setPermissions((current) =>
      current.map((item) => item.key === permission.key ? { ...item, enabled: !item.enabled } : item),
    );
    try {
      const response = await fetch("/api/v1/staff/moderator-permissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permission: permission.key, enabled: !permission.enabled }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(getErrorMessage(body, "The Moderator permission could not be changed."));
    } catch (error) {
      setPermissions((current) =>
        current.map((item) => item.key === permission.key ? { ...item, enabled: permission.enabled } : item),
      );
      setPermissionsError(error instanceof Error ? error.message : "The Moderator permission could not be changed.");
    } finally {
      setPermissionBusy(null);
    }
  }

  async function confirmJournalAction() {
    if (!pendingJournal || journalBusy) return;
    setJournalBusy(true);
    setJournalError("");
    try {
      const response = pendingJournal.remove
        ? await fetch(`/api/v1/journal/articles/${pendingJournal.article.id}`, { method: "DELETE" })
        : await fetch(`/api/v1/journal/articles/${pendingJournal.article.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: pendingJournal.status }),
          });
      const body = response.status === 204 ? null : await response.json().catch(() => null);
      if (!response.ok) throw new Error(getErrorMessage(body, "The journal could not be updated."));
      window.location.reload();
    } catch (error) {
      setJournalError(error instanceof Error ? error.message : "The journal could not be updated.");
    } finally {
      setJournalBusy(false);
    }
  }

  const openAction = (action: ConfirmAction) => {
    setActionError("");
    setPendingAction(action);
  };

  return (
    <main className="c-page c-admin-page">
      <header className="c-admin-header">
        <div>
          <p className="c-kicker">Campus administration</p>
          <h1 className="c-title">Community control room</h1>
          <p className="c-subtitle">A clear view of the people, conversations and journals shaping campus.</p>
        </div>
        <Link href="/" className="c-button c-button-quiet"><ExternalLink size={15} /> Campus home</Link>
      </header>

      <div className="c-admin-layout">
        <nav className="c-admin-nav" aria-label="Admin panel sections">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              key={id}
              className={section === id ? "active" : ""}
              aria-current={section === id ? "page" : undefined}
              onClick={() => setSection(id)}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="c-admin-content">
          {section === "overview" && (
            <div className="c-admin-section">
              <div className="c-admin-section-heading">
                <div>
                  <p className="c-kicker">Overview</p>
                  <h2>Campus at a glance</h2>
                </div>
                <span className={`c-admin-health ${overview?.system.database === "connected" ? "healthy" : ""}`}>
                  <span /> {overview?.system.database === "connected" ? "Database connected" : "Checking status"}
                </span>
              </div>

              {overviewError && <p className="c-admin-feedback error" role="alert">{overviewError}</p>}
              {overviewLoading ? (
                <div className="c-admin-empty"><Loader2 className="c-spin" size={18} /> Loading live campus metrics…</div>
              ) : overview ? (
                <>
                  <div className="c-admin-stats">
                    {STAT_LABELS.map(({ key, label }) => (
                      <article key={key} className="c-admin-stat">
                        <span>{label}</span>
                        <strong>{overview.stats[key] === null ? "—" : Number(overview.stats[key]).toLocaleString()}</strong>
                      </article>
                    ))}
                  </div>

                  {(overview.system.communityFeed !== "ready" || overview.system.activity !== "ready") && (
                    <p className="c-admin-notice">
                      <CircleAlert size={16} />
                      Campus post and comment metrics are withheld until the social database migration is applied.
                    </p>
                  )}

                  <div className="c-admin-columns">
                    <section className="c-admin-card">
                      <div className="c-admin-card-heading">
                        <div><h3>Recently joined</h3><span>Newest member profiles</span></div>
                        <button type="button" className="c-admin-text-button" onClick={() => setSection("members")}>Manage members <ArrowRight size={14} /></button>
                      </div>
                      {overview.recentMembers.length ? (
                        <ul className="c-admin-list">
                          {overview.recentMembers.map((member) => (
                            <li key={member.id}>
                              <Avatar name={member.displayName} url={member.avatarUrl} />
                              <div className="c-admin-person">
                                <strong>{member.displayName}</strong>
                                <span>@{member.username} · {displayDate(member.createdAt)}</span>
                              </div>
                              <span className={`c-admin-badge ${member.role}`}>{prettyRole(member.role)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : <p className="c-admin-muted">No members found.</p>}
                    </section>

                    <section className="c-admin-card">
                      <div className="c-admin-card-heading">
                        <div><h3>Recent community activity</h3><span>Latest posts and comments</span></div>
                        <Activity size={17} aria-hidden="true" />
                      </div>
                      {overview.recentActivity.length ? (
                        <ul className="c-admin-list c-admin-activity">
                          {overview.recentActivity.map((item) => (
                            <li key={item.id}>
                              {item.kind === "post" ? <ArrowDownRight size={16} /> : <MessageCircle size={16} />}
                              <div className="c-admin-person">
                                <strong>{item.authorName} {item.kind === "post" ? "shared a post" : "commented"}</strong>
                                <span>{item.summary}{item.summary.length >= 110 ? "…" : ""}</span>
                              </div>
                              <time>{timeAgo(item.createdAt)}</time>
                            </li>
                          ))}
                        </ul>
                      ) : <p className="c-admin-muted">{overview.system.activity === "ready" ? "No recent activity." : "Activity will appear when the Campus feed migration is applied."}</p>}
                    </section>

                    <section className="c-admin-card c-admin-journal-card">
                      <div className="c-admin-card-heading">
                        <div><h3>Recently published journals</h3><span>Latest editorial work</span></div>
                        <button type="button" className="c-admin-text-button" onClick={() => setSection("journals")}>Manage journals <ArrowRight size={14} /></button>
                      </div>
                      {overview.recentJournals.length ? (
                        <ul className="c-admin-list">
                          {overview.recentJournals.map((journal) => {
                            const author = Array.isArray(journal.author) ? journal.author[0] : journal.author;
                            return (
                              <li key={journal.id}>
                                <BookOpen size={16} />
                                <div className="c-admin-person">
                                  <strong>{journal.title}</strong>
                                  <span>{author?.display_name || "Campus author"} · {journal.published_at ? timeAgo(journal.published_at) : timeAgo(journal.updated_at)}</span>
                                </div>
                                <Link href={`/journal/${journal.slug}`} aria-label={`Read ${journal.title}`}><ExternalLink size={14} /></Link>
                              </li>
                            );
                          })}
                        </ul>
                      ) : <p className="c-admin-muted">No published journals yet.</p>}
                    </section>
                  </div>

                  <div className="c-admin-quicklinks">
                    <button type="button" onClick={() => setSection("members")}><Users size={17} /><span><strong>Member Management</strong><small>Search members and review activity</small></span><ArrowRight size={16} /></button>
                    <button type="button" onClick={() => setSection("journals")}><BookOpen size={17} /><span><strong>Journal Management</strong><small>Review drafts and published work</small></span><ArrowRight size={16} /></button>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {section === "members" && (
            <div className="c-admin-section">
              <div className="c-admin-section-heading">
                <div><p className="c-kicker">People</p><h2>Member management</h2><p>Search community profiles and manage account access.</p></div>
                <span className="c-admin-count">{memberTotal.toLocaleString()} members</span>
              </div>
              {!canManageMembers ? (
                <div className="c-admin-empty"><ShieldCheck size={18} /> Member management is not included in your current staff permissions.</div>
              ) : (
                <>
                  <div className="c-admin-toolbar">
                    <label className="c-admin-search">
                      <Search size={16} aria-hidden="true" />
                      <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search name or username" />
                    </label>
                    <label className="c-admin-filter">
                      <span className="sr-only">Filter by role</span>
                      <select value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value as typeof roleFilter); setPage(1); }}>
                        <option value="all">All roles</option>
                        <option value="member">Members</option>
                        <option value="moderator">Moderators</option>
                        <option value="admin">Admins</option>
                      </select>
                    </label>
                    <label className="c-admin-filter">
                      <span className="sr-only">Filter by account status</span>
                      <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as typeof statusFilter); setPage(1); }}>
                        <option value="all">All statuses</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="deleted">Removed</option>
                      </select>
                    </label>
                  </div>
                  {memberError && <p className="c-admin-feedback error" role="alert">{memberError}</p>}
                  <div className="c-admin-table-wrap">
                    <table className="c-admin-table">
                      <thead><tr><th>Member</th><th>Role</th><th>Status</th><th>Joined</th><th>Activity</th><th><span className="sr-only">Actions</span></th></tr></thead>
                      <tbody>
                        {membersLoading ? (
                          <tr><td colSpan={6} className="c-admin-table-state"><Loader2 className="c-spin" size={17} /> Loading members…</td></tr>
                        ) : members.length ? members.map((member) => {
                          const role = getRole(member.roles);
                          return (
                            <tr key={member.id}>
                              <td>
                                <button type="button" className="c-admin-member-button" onClick={() => { setMemberDetail(null); setActionError(""); setSelectedMember(member); }}>
                                  <Avatar name={member.displayName} url={member.avatarUrl} />
                                  <span><strong>{member.displayName}</strong><small>@{member.username}</small></span>
                                </button>
                              </td>
                              <td><span className={`c-admin-badge ${role}`}>{prettyRole(role)}</span></td>
                              <td><span className={`c-admin-status ${member.status}`}>{member.status === "deleted" ? "Removed" : member.status}</span></td>
                              <td>{displayDate(member.createdAt)}</td>
                              <td className="c-admin-activity-counts"><span>{member.posts} posts</span><span>{member.comments} comments</span><span>{member.followers} followers</span></td>
                              <td>
                                <details className="c-admin-actions">
                                  <summary aria-label={`Actions for ${member.displayName}`}>...</summary>
                                  <div className="c-admin-action-menu">
                                    <button type="button" onClick={() => setSelectedMember(member)}>View profile</button>
                                    {canManageRoles && member.id !== viewerId && (role !== "admin" || isSuperAdmin) && (
                                      <>
                                        <button type="button" onClick={() => openAction({ member, kind: "role", value: role === "moderator" ? "member" : "moderator" })}>
                                          {role === "moderator" ? "Return to Member" : "Make Moderator"}
                                        </button>
                                        {isSuperAdmin && <button type="button" onClick={() => openAction({ member, kind: "role", value: "admin" })}>Make Admin</button>}
                                      </>
                                    )}
                                    {member.id !== viewerId && canManageMembers && member.status !== "deleted" && (
                                      <button type="button" className="danger" onClick={() => openAction({ member, kind: "status", value: member.status === "active" ? "suspended" : "active" })}>
                                        {member.status === "active" ? "Suspend account" : "Reactivate account"}
                                      </button>
                                    )}
                                    {member.id !== viewerId && canManageMembers && member.status !== "deleted" && (
                                      <button type="button" className="danger" onClick={() => openAction({ member, kind: "status", value: "deleted" })}>Remove account</button>
                                    )}
                                    {member.status === "deleted" && canManageMembers && member.id !== viewerId && (
                                      <button type="button" onClick={() => openAction({ member, kind: "status", value: "active" })}>Restore account</button>
                                    )}
                                  </div>
                                </details>
                              </td>
                            </tr>
                          );
                        }) : (
                          <tr><td colSpan={6} className="c-admin-table-state">No members match these filters.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="c-admin-pagination">
                    <span>Page {page} of {memberPages}</span>
                    <div>
                      <button type="button" aria-label="Previous page" disabled={page <= 1 || membersLoading} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={16} /></button>
                      <button type="button" aria-label="Next page" disabled={page >= memberPages || membersLoading} onClick={() => setPage((value) => value + 1)}><ChevronRight size={16} /></button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {section === "journals" && (
            <div className="c-admin-section">
              <div className="c-admin-section-heading">
                <div><p className="c-kicker">Editorial</p><h2>Journal management</h2><p>Keep drafts, published stories and the reading experience in sync.</p></div>
                {canManageJournals && <Link href="/journal/studio" className="c-button c-button-primary"><BookOpen size={15} /> New journal</Link>}
              </div>
              {!canManageJournals ? (
                <div className="c-admin-empty"><ShieldCheck size={18} /> Journal authoring is not included in your current staff permissions.</div>
              ) : visibleJournals.length ? (
                <div className="c-admin-table-wrap">
                  <table className="c-admin-table c-admin-journals">
                    <thead><tr><th>Journal</th><th>Author</th><th>Status</th><th>Last updated</th><th><span className="sr-only">Actions</span></th></tr></thead>
                    <tbody>
                      {visibleJournals.map((article) => (
                        <tr key={article.id}>
                          <td><strong>{article.title}</strong><small>/{article.slug}</small></td>
                          <td>{article.author?.displayName || "Campus author"}</td>
                          <td><span className={`c-admin-status ${article.status}`}>{article.status === "archived" ? "Unpublished" : article.status}</span></td>
                          <td>{timeAgo(article.updatedAt)}</td>
                          <td className="c-admin-journal-actions">
                            {(article.authorId === viewerId || canAdminister) && (
                              <Link href={`/journal/studio/${article.id}`} aria-label={`Edit and preview ${article.title}`} title="Edit or preview">
                                <Eye size={15} /><span>Edit / preview</span>
                              </Link>
                            )}
                            {article.status === "published" && <Link href={`/journal/${article.slug}`} target="_blank" rel="noreferrer" aria-label={`Read ${article.title}`}><ExternalLink size={15} /></Link>}
                            {canPublishJournals && (article.authorId === viewerId || canAdminister) && (
                            <button type="button" onClick={() => { setJournalError(""); setPendingJournal({ article, status: article.status === "published" ? "archived" : "published" }); }}>
                              {article.status === "published" ? "Unpublish" : "Publish"}
                            </button>
                            )}
                            {canDeleteJournals && (article.authorId === viewerId || canAdminister) && (
                            <button type="button" className="danger" onClick={() => { setJournalError(""); setPendingJournal({ article, remove: true }); }}>Delete</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <div className="c-admin-empty"><BookOpen size={18} /> No journals are available for this account.</div>}
            </div>
          )}

          {section === "permissions" && (
            <div className="c-admin-section">
              <div className="c-admin-section-heading">
                <div><p className="c-kicker">Access control</p><h2>Roles &amp; permissions</h2><p>Primary community roles and their current responsibilities.</p></div>
              </div>
              <div className="c-admin-role-cards">
                <article><span className="c-admin-badge admin">Admin</span><h3>Platform administration</h3><p>Full campus access, member management, role assignment and journal administration.</p></article>
                <article><span className="c-admin-badge moderator">Moderator</span><h3>Community stewardship</h3><p>Access to approved staff tools. Permissions below are configurable by an Admin.</p></article>
                <article><span className="c-admin-badge member">Member</span><h3>Community participation</h3><p>Create posts, comment, Love and share posts, follow people and manage a personal profile.</p></article>
              </div>
              <section className="c-admin-card c-admin-permission-card">
                <div className="c-admin-card-heading"><div><h3>Permission matrix</h3><span>Staff capabilities are enforced by the database and server APIs.</span></div></div>
                <div className="c-admin-table-wrap">
                  <table className="c-admin-table">
                    <thead><tr><th>Capability</th><th>Member</th><th>Moderator</th><th>Admin</th></tr></thead>
                    <tbody>
                      {PERMISSION_MATRIX.map((row) => {
                        const permission = permissions.find((item) => item.key === row.permissionKey);
                        return (
                          <tr key={row.name}>
                            <td>{row.name}</td>
                            <td>{row.member}</td>
                            <td>
                              {permission ? (
                                <label className="c-admin-permission-toggle">
                                  <input
                                    type="checkbox"
                                    checked={permission.enabled}
                                    disabled={!canManageRoles || permissionsLoading || permissionBusy !== null}
                                    onChange={() => void togglePermission(permission)}
                                    aria-label={`${permission.enabled ? "Disable" : "Enable"} ${permission.label} for Moderators`}
                                  />
                                  <span>{permission.enabled ? "Allowed" : "Not granted"}</span>
                                </label>
                              ) : row.moderator}
                            </td>
                            <td>{row.admin}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {permissionsLoading && <p className="c-admin-muted"><Loader2 className="c-spin" size={14} /> Loading permission settings…</p>}
                {permissionsError && <p className="c-admin-feedback error" role="alert">{permissionsError}</p>}
                {!canManageRoles && <p className="c-admin-muted">Only an Admin can change Moderator permissions. System-level permissions are not configurable here.</p>}
              </section>
            </div>
          )}
        </div>
      </div>

      {selectedMember && (
        <div className="c-admin-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedMember(null); }}>
          <section className="c-admin-dialog c-admin-member-dialog" role="dialog" aria-modal="true" aria-labelledby="member-dialog-title">
            <button type="button" className="c-admin-dialog-close" aria-label="Close member profile" onClick={() => setSelectedMember(null)}><X size={18} /></button>
            {detailLoading ? <div className="c-admin-empty"><Loader2 className="c-spin" size={18} /> Loading member activity…</div> : memberDetail ? (
              <>
                <div className="c-admin-profile-head">
                  <Avatar name={memberDetail.profile.display_name} url={memberDetail.profile.avatar_url} size="large" />
                  <div><p className="c-kicker">Member profile</p><h2 id="member-dialog-title">{memberDetail.profile.display_name}</h2><span>@{memberDetail.profile.username}</span></div>
                </div>
                <p className="c-admin-profile-bio">{memberDetail.profile.bio || memberDetail.profile.headline || "No profile biography provided."}</p>
                <div className="c-admin-profile-meta"><span className={`c-admin-status ${memberDetail.profile.status}`}>{memberDetail.profile.status}</span><span>Joined {displayDate(memberDetail.profile.created_at)}</span>{memberDetail.profile.location && <span>{memberDetail.profile.location}</span>}</div>
                <div className="c-admin-detail-stats">
                  {(["posts", "comments", "journals", "followers", "following"] as const).map((key) => (
                    <div key={key}><strong>{memberDetail.activity.counts[key] === null ? "—" : memberDetail.activity.counts[key]?.toLocaleString()}</strong><span>{key}</span></div>
                  ))}
                </div>
                <div className="c-admin-detail-columns">
                  <div><h3>Recent posts</h3>{memberDetail.activity.posts.length ? memberDetail.activity.posts.map((post) => <p key={post.id}>{post.content}<small>{timeAgo(post.created_at)}</small></p>) : <span className="c-admin-muted">No posts yet.</span>}</div>
                  <div><h3>Recent comments</h3>{memberDetail.activity.comments.length ? memberDetail.activity.comments.map((comment) => <p key={comment.id}>{comment.content}<small>{timeAgo(comment.created_at)}</small></p>) : <span className="c-admin-muted">No comments yet.</span>}</div>
                </div>
                <div className="c-admin-detail-journals"><h3>Journals</h3>{memberDetail.activity.journals.length ? memberDetail.activity.journals.map((journal) => <Link key={journal.id} href={`/journal/studio/${journal.id}`}>{journal.title} <span>{journal.status}</span></Link>) : <span className="c-admin-muted">No journals yet.</span>}</div>
                {actionError && <p className="c-admin-feedback error" role="alert">{actionError}</p>}
              </>
            ) : <div className="c-admin-empty"><CircleAlert size={18} /> Member details could not be loaded.</div>}
          </section>
        </div>
      )}

      {pendingAction && (
        <div className="c-admin-overlay" role="presentation">
          <section className="c-admin-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description">
            <button type="button" className="c-admin-dialog-close" aria-label="Cancel" disabled={actionBusy} onClick={() => { setPendingAction(null); setActionError(""); }}><X size={18} /></button>
            <p className="c-kicker">Confirm change</p>
            <h2 id="confirm-title">{getConfirmationTitle(pendingAction)}</h2>
            <p id="confirm-description">{getConfirmationDescription(pendingAction)}</p>
            <div className="c-admin-confirm-person"><strong>{pendingAction.member.displayName}</strong><span>@{pendingAction.member.username}</span></div>
            {actionError && <p className="c-admin-feedback error" role="alert">{actionError}</p>}
            <div className="c-admin-dialog-actions">
              <button type="button" className="c-button c-button-quiet" disabled={actionBusy} onClick={() => { setPendingAction(null); setActionError(""); }}>Cancel</button>
              <button type="button" className="c-button c-button-danger" disabled={actionBusy} onClick={() => void confirmMemberAction()}>
                {actionBusy ? <Loader2 className="c-spin" size={15} /> : <Check size={15} />}
                {actionBusy ? "Saving…" : "Confirm"}
              </button>
            </div>
          </section>
        </div>
      )}

      {pendingJournal && (
        <div className="c-admin-overlay" role="presentation">
          <section className="c-admin-dialog" role="alertdialog" aria-modal="true" aria-labelledby="journal-confirm-title">
            <button type="button" className="c-admin-dialog-close" aria-label="Cancel" disabled={journalBusy} onClick={() => { setPendingJournal(null); setJournalError(""); }}><X size={18} /></button>
            <p className="c-kicker">Journal workflow</p>
            <h2 id="journal-confirm-title">
              {pendingJournal.remove ? "Delete this journal?" : pendingJournal.status === "published" ? "Publish this journal?" : "Unpublish this journal?"}
            </h2>
            <p>
              {pendingJournal.remove
                ? "This journal will be removed from the reading pages and staff list."
                : pendingJournal.status === "published"
                  ? "The journal will become visible on the public Campus reading pages."
                  : "The journal will be hidden from public reading pages while preserving the original article URL."}
            </p>
            <div className="c-admin-confirm-person"><strong>{pendingJournal.article.title}</strong><span>/{pendingJournal.article.slug}</span></div>
            {journalError && <p className="c-admin-feedback error" role="alert">{journalError}</p>}
            <div className="c-admin-dialog-actions">
              <button type="button" className="c-button c-button-quiet" disabled={journalBusy} onClick={() => { setPendingJournal(null); setJournalError(""); }}>Cancel</button>
              <button type="button" className={`c-button ${pendingJournal.remove ? "c-button-danger" : "c-button-primary"}`} disabled={journalBusy} onClick={() => void confirmJournalAction()}>
                {journalBusy ? <Loader2 className="c-spin" size={15} /> : <Check size={15} />}
                {journalBusy ? "Saving…" : pendingJournal.remove ? "Delete journal" : pendingJournal.status === "published" ? "Publish" : "Unpublish"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function Avatar({ name, url, size }: { name: string; url: string | null; size?: "large" }) {
  return (
    <span className={`c-admin-avatar${size === "large" ? " large" : ""}`}>
      {url ? <img src={url} alt="" /> : name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function getConfirmationTitle(action: ConfirmAction) {
  if (action.kind === "role") return `Change role to ${prettyRole(action.value as MemberRole)}?`;
  if (action.value === "deleted") return "Remove this member?";
  return action.value === "suspended" ? "Suspend this account?" : "Reactivate this account?";
}

function getConfirmationDescription(action: ConfirmAction) {
  if (action.kind === "role") return "This changes the member’s access to staff tools. The server will verify that the change is permitted.";
  if (action.value === "deleted") return "The account will be marked removed and access disabled. The profile, posts and follow relationships will be retained.";
  return action.value === "suspended"
    ? "The member will lose access to their account until an administrator reactivates it."
    : "The member will regain access using their existing profile and relationships.";
}
