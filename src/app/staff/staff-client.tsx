"use client";

import Link from "next/link";
import { ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";
import { timeAgo } from "@/lib/time";
import type { JournalArticle } from "@/server/journal/types";
import type { MemberRole } from "@/server/auth/roles";

interface StaffMember {
  id: string;
  displayName: string;
  username: string;
  role: MemberRole;
}

export function StaffClient({
  canManageRoles,
  viewerId,
  articles,
  initialMembers,
}: {
  canManageRoles: boolean;
  viewerId: string;
  articles: JournalArticle[];
  initialMembers: StaffMember[];
}) {
  const [members, setMembers] = useState(initialMembers);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function changeRole(member: StaffMember, role: MemberRole) {
    if (busyId) return;
    setBusyId(member.id);
    setError("");
    const previous = members;
    setMembers((current) => current.map((item) => (item.id === member.id ? { ...item, role } : item)));

    try {
      const response = await fetch("/api/v1/staff/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: member.id, role }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null;
      if (!response.ok) {
        throw new Error(payload?.error?.message || "The role could not be changed.");
      }
    } catch (roleError) {
      setMembers(previous);
      setError(roleError instanceof Error ? roleError.message : "The role could not be changed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="c-staff-grid">
      {error && <p className="c-error" role="alert">{error}</p>}

      <section className="c-staff-card">
        <h2>Journal studio</h2>
        <p>Drafts are visible only to staff. Publishing and unpublishing take effect immediately.</p>
        <div className="c-actions-row">
          <Link href="/journal/studio" className="c-button c-button-primary">
            <ExternalLink size={14} />
            <span>New article</span>
          </Link>
          <Link href="/journal" className="c-button">Public journal</Link>
        </div>

        <div style={{ marginTop: 16 }}>
          {articles.length === 0 ? (
            <p className="c-staff-loading">No articles yet.</p>
          ) : (
            <table className="c-table">
              <thead>
                <tr>
                  <th>Article</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {articles.map((article) => (
                  <tr key={article.id}>
                    <td>
                      <strong>{article.title}</strong>
                      <div style={{ color: "var(--muted)", fontSize: 10.5 }}>/{article.slug}</div>
                    </td>
                    <td>
                      <span className={`c-role-badge${article.status === "published" ? " admin" : ""}`}>
                        {article.status}
                      </span>
                    </td>
                    <td style={{ color: "var(--muted)" }}>{timeAgo(article.updatedAt)}</td>
                    <td style={{ textAlign: "right" }}>
                      <Link href={`/journal/studio/${article.id}`} className="c-link-btn">Edit →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {canManageRoles && (
        <section className="c-staff-card">
          <h2>Member roles</h2>
          <p>Promote members to Moderator or return them to Member. Administrator roles are changed in the database.</p>
          <table className="c-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const locked = member.id === viewerId || member.role === "admin" || busyId === member.id;
                return (
                  <tr key={member.id}>
                    <td>
                      <Link href={`/profile/${encodeURIComponent(member.username)}`} className="c-post-name">
                        {member.displayName}
                      </Link>
                      <div style={{ color: "var(--muted)", fontSize: 10.5 }}>@{member.username}</div>
                    </td>
                    <td>
                      {locked ? (
                        <span className={`c-role-badge ${member.role}`}>
                          {member.role === "admin" ? "Admin" : member.role === "moderator" ? "Moderator" : "Member"}
                        </span>
                      ) : (
                        <select
                          className="c-role-select"
                          value={member.role}
                          onChange={(event) => void changeRole(member, event.target.value as MemberRole)}
                          aria-label={`Role for ${member.displayName}`}
                        >
                          <option value="member">Member</option>
                          <option value="moderator">Moderator</option>
                        </select>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {members.length === 0 && <p className="c-staff-loading">No members found.</p>}
          {busyId && <p className="c-staff-loading"><Loader2 size={12} className="spin" /> Saving role…</p>}
        </section>
      )}
    </div>
  );
}
