/* eslint-disable react-hooks/error-boundaries */
import Link from "next/link";
import { Activity, ArrowUpRight, FolderKanban, TriangleAlert, Users } from "lucide-react";
import { requirePermission } from "@/server/auth/permissions";
import { createSupabaseServerClient } from "@/server/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  try {
    const user = await requirePermission("dashboard.read");
    const supabase = await createSupabaseServerClient();
    const [users, projects, events, reports, members] = await Promise.all([
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase.from("projects").select("id", { count: "exact", head: true }).is("deleted_at", null),
      supabase.from("events").select("id", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("moderation_reports").select("id", { count: "exact", head: true }).in("status", ["open", "in_review"]),
      supabase.from("profiles").select("id, display_name, username, status, created_at").order("created_at", { ascending: false }).limit(8),
    ]);
    const failure = [users, projects, events, reports, members].find((result) => result.error);
    if (failure?.error) throw failure.error;
    const metrics = [{ label: "Total members", value: users.count ?? 0, icon: Users }, { label: "Projects", value: projects.count ?? 0, icon: FolderKanban }, { label: "Published events", value: events.count ?? 0, icon: Activity }, { label: "Open reports", value: reports.count ?? 0, icon: TriangleAlert }];
    return <main className="admin-page"><header className="admin-header"><div><div className="eyebrow">Control room</div><h1>Keep the room<br /><span>worth joining.</span></h1><p>Live platform data and moderation signals from Supabase.</p></div><div className="admin-header-actions"><Link href="/" className="button button-ghost">Exit admin</Link><div className="admin-user"><span className="user-avatar">{user.email?.slice(0, 2).toUpperCase()}</span><span><strong>{user.email}</strong><small>Authorized administrator</small></span></div></div></header><section className="admin-content" style={{ marginTop: 30 }}><div className="admin-metrics">{metrics.map(({ label, value, icon: Icon }) => <div className="admin-metric" key={label}><div className="admin-metric-icon lime"><Icon size={17} /></div><span>{label}</span><strong>{value}</strong><small>From Supabase</small></div>)}</div><div className="admin-panel admin-table-panel"><div className="section-heading"><div><div className="eyebrow">Members</div><h2>Recently joined</h2></div><Link href="/api/v1/admin/overview" className="section-link">API overview <ArrowUpRight size={13} /></Link></div>{members.data?.length ? <div className="admin-table"><div className="admin-table-head"><span>Member</span><span>Username</span><span>Status</span><span>Joined</span></div>{members.data.map((member) => <div className="admin-table-row" key={member.id}><div className="admin-member"><span className="admin-avatar">{member.display_name.slice(0, 2).toUpperCase()}</span><strong>{member.display_name}</strong></div><span className="muted-text">@{member.username}</span><span className="status-active">{member.status}</span><span className="muted-text">{new Date(member.created_at).toLocaleDateString()}</span></div>)}</div> : <div className="admin-empty"><h3>No members yet</h3><p>Member records will appear here when users complete registration.</p></div>}</div></section></main>;
  } catch { return <main className="admin-page"><section className="admin-empty"><h3>Unable to load admin data</h3><p>Check your administrator permissions and Supabase connection.</p></section></main>; }
}