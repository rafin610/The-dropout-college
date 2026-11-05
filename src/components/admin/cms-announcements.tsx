"use client";

import { useState } from "react";
import { Bell, Calendar, Flame, Info, Plus, Trash2, Edit2, Check, X } from "lucide-react";
import type { Announcement } from "@/lib/site-cms-types";

export function CmsAnnouncementsTab({
  announcements,
  onUpdateAnnouncements,
  onSave,
  saving,
  message,
}: {
  announcements: Announcement[];
  onUpdateAnnouncements: (announcements: Announcement[]) => void;
  onSave: () => Promise<void>;
  saving: boolean;
  message: string;
}) {
  const [editingItem, setEditingItem] = useState<Announcement | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const startCreate = () => {
    setIsNew(true);
    setEditingItem({
      id: crypto.randomUUID(),
      title: "",
      content: "",
      type: "news",
      date: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      linkText: "Learn More",
      linkUrl: "",
      published: true,
    });
  };

  const startEdit = (item: Announcement) => {
    setIsNew(false);
    setEditingItem({ ...item });
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setIsNew(false);
  };

  const saveEdit = () => {
    if (!editingItem || !editingItem.title.trim()) return;

    if (isNew) {
      onUpdateAnnouncements([editingItem, ...announcements]);
    } else {
      onUpdateAnnouncements(
        announcements.map((a) => (a.id === editingItem.id ? editingItem : a))
      );
    }
    setEditingItem(null);
    setIsNew(false);
  };

  const togglePublished = (id: string) => {
    onUpdateAnnouncements(
      announcements.map((a) => (a.id === id ? { ...a, published: !a.published } : a))
    );
  };

  const deleteAnnouncement = (id: string) => {
    onUpdateAnnouncements(announcements.filter((a) => a.id !== id));
    setDeleteConfirmId(null);
  };

  return (
    <div className="admin-panel cms-panel">
      <div className="section-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="eyebrow">Noticeboard CMS</div>
          <h2>Community Announcements & Alerts</h2>
          <p>Create and manage community news, events, live sessions, challenges, and updates.</p>
        </div>

        <button
          type="button"
          onClick={startCreate}
          className="button button-primary"
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <Plus size={15} />
          <span>New Announcement</span>
        </button>
      </div>

      {/* Editor Modal / Form */}
      {editingItem && (
        <div
          style={{
            marginTop: 18,
            marginBottom: 24,
            padding: 20,
            background: "var(--surface)",
            border: "2px solid var(--accent)",
            borderRadius: 12,
            boxShadow: "var(--shadow-md)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ fontSize: 16, margin: 0 }}>
              {isNew ? "Create Community Announcement" : "Edit Announcement"}
            </h3>
            <button type="button" onClick={cancelEdit} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}>
              <X size={18} />
            </button>
          </div>

          <div className="admin-form-grid">
            <div className="field full">
              <label>Announcement Title *</label>
              <input
                value={editingItem.title}
                onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                placeholder="e.g. November Build Challenge is Live"
              />
            </div>

            <div className="field">
              <label>Category / Type</label>
              <select
                value={editingItem.type}
                onChange={(e) => setEditingItem({ ...editingItem, type: e.target.value as Announcement["type"] })}
                style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--bg)", width: "100%" }}
              >
                <option value="news">News</option>
                <option value="event">Event / Live Session</option>
                <option value="challenge">Challenge / Hackathon</option>
                <option value="update">Update / Changelog</option>
              </select>
            </div>

            <div className="field">
              <label>Date Label</label>
              <input
                value={editingItem.date}
                onChange={(e) => setEditingItem({ ...editingItem, date: e.target.value })}
                placeholder="e.g. November 2026 or Friday 7 PM"
              />
            </div>

            <div className="field full">
              <label>Content / Body Text *</label>
              <textarea
                value={editingItem.content}
                onChange={(e) => setEditingItem({ ...editingItem, content: e.target.value })}
                rows={3}
                placeholder="Detailed text describing the announcement..."
              />
            </div>

            <div className="field">
              <label>Action Link Text (Optional)</label>
              <input
                value={editingItem.linkText ?? ""}
                onChange={(e) => setEditingItem({ ...editingItem, linkText: e.target.value })}
                placeholder="e.g. View Details"
              />
            </div>

            <div className="field">
              <label>Action URL (Optional)</label>
              <input
                value={editingItem.linkUrl ?? ""}
                onChange={(e) => setEditingItem({ ...editingItem, linkUrl: e.target.value })}
                placeholder="e.g. /explore or https://discord.gg/..."
              />
            </div>

            <div className="field full" style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
              <input
                type="checkbox"
                id="pubCheck"
                checked={editingItem.published}
                onChange={(e) => setEditingItem({ ...editingItem, published: e.target.checked })}
                style={{ width: 18, height: 18, cursor: "pointer" }}
              />
              <label htmlFor="pubCheck" style={{ margin: 0, cursor: "pointer", fontWeight: 600 }}>
                Publish publicly to Noticeboard (Visible to all visitors)
              </label>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
            <button type="button" onClick={cancelEdit} className="button button-ghost">
              Cancel
            </button>
            <button type="button" onClick={saveEdit} className="button button-primary">
              <Check size={14} />
              <span>Apply to List</span>
            </button>
          </div>
        </div>
      )}

      {/* Announcements List */}
      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        {announcements.length === 0 ? (
          <div className="admin-empty">
            <p>No announcements created yet. Click &quot;New Announcement&quot; to post your first update.</p>
          </div>
        ) : (
          announcements.map((item) => {
            let Icon = Info;
            let tagTone = "var(--cyan)";
            if (item.type === "event") {
              Icon = Calendar;
              tagTone = "var(--coral)";
            } else if (item.type === "challenge") {
              Icon = Flame;
              tagTone = "var(--lime)";
            } else if (item.type === "update") {
              Icon = Bell;
              tagTone = "var(--violet)";
            }

            return (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  padding: "16px 18px",
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  borderRadius: 10,
                  gap: 16,
                  opacity: item.published ? 1 : 0.65,
                }}
              >
                <div style={{ display: "flex", gap: 14, flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: "var(--surface-2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: tagTone,
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={18} />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                      <span
                        style={{
                          textTransform: "uppercase",
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          padding: "2px 8px",
                          borderRadius: 4,
                          background: "var(--surface-2)",
                          color: tagTone,
                        }}
                      >
                        {item.type}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>{item.date}</span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: item.published ? "var(--lime)" : "var(--coral)",
                        }}
                      >
                        ● {item.published ? "Published" : "Draft"}
                      </span>
                    </div>

                    <strong style={{ fontSize: 15, display: "block", marginBottom: 4 }}>{item.title}</strong>
                    <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>{item.content}</p>

                    {item.linkUrl && (
                      <span style={{ fontSize: 11, color: "var(--accent)", marginTop: 6, display: "inline-block" }}>
                        Link: {item.linkText || "View"} ({item.linkUrl})
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => togglePublished(item.id)}
                    className="button button-ghost button-sm"
                    style={{ fontSize: 12, padding: "4px 8px" }}
                  >
                    {item.published ? "Unpublish" : "Publish"}
                  </button>

                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    className="button button-ghost button-sm"
                    style={{ fontSize: 12, padding: "4px 8px" }}
                    title="Edit announcement"
                  >
                    <Edit2 size={13} />
                  </button>

                  {deleteConfirmId === item.id ? (
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        type="button"
                        onClick={() => deleteAnnouncement(item.id)}
                        className="button button-sm"
                        style={{ background: "#ff6b6b", color: "#fff", fontSize: 11, padding: "4px 8px", border: "none" }}
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(null)}
                        className="button button-ghost button-sm"
                        style={{ fontSize: 11, padding: "4px 6px" }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(item.id)}
                      className="button button-ghost button-sm"
                      style={{ fontSize: 12, padding: "4px 8px", color: "var(--coral)" }}
                      title="Delete announcement"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Save Button */}
      <div style={{ marginTop: 28, paddingTop: 16, borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 14 }}>
        <button
          className="button button-primary"
          type="button"
          disabled={saving}
          onClick={onSave}
          style={{ minWidth: 160 }}
        >
          {saving ? "Saving Changes…" : "Save Noticeboard"}
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
