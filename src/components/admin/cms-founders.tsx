"use client";

import { useState } from "react";
import Image from "next/image";
import {
  User,
  ExternalLink,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Eye,
  EyeOff,
  Briefcase,
  Award,
} from "lucide-react";
import type { FounderProfile } from "@/lib/site-cms-types";

export function CmsFoundersTab({
  founders,
  onUpdateFounders,
  onSave,
  saving,
  message,
}: {
  founders: FounderProfile[];
  onUpdateFounders: (founders: FounderProfile[]) => void;
  onSave: () => Promise<void>;
  saving: boolean;
  message: string;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FounderProfile | null>(null);
  const [newSkill, setNewSkill] = useState("");
  const [activeSubTab, setActiveSubTab] = useState<"general" | "journey" | "projects">("general");

  const startEdit = (founder: FounderProfile) => {
    setEditingId(founder.id);
    setEditForm(JSON.parse(JSON.stringify(founder)));
    setActiveSubTab("general");
    setNewSkill("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
    setNewSkill("");
  };

  const saveEdit = () => {
    if (!editForm) return;
    const updated = founders.map((f) => (f.id === editForm.id ? editForm : f));
    onUpdateFounders(updated);
    setEditingId(null);
    setEditForm(null);
  };

  const toggleVisibility = (id: string) => {
    onUpdateFounders(
      founders.map((f) => (f.id === id ? { ...f, visible: !f.visible } : f))
    );
  };

  const moveOrder = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= founders.length) return;

    const list = [...founders];
    const [moved] = list.splice(index, 1);
    list.splice(targetIndex, 0, moved);

    const reindexed = list.map((item, idx) => ({
      ...item,
      sortOrder: idx + 1,
    }));
    onUpdateFounders(reindexed);
  };

  const handleAddSkill = () => {
    if (!editForm || !newSkill.trim()) return;
    const trimmed = newSkill.trim();
    if (!editForm.skills.includes(trimmed)) {
      setEditForm({
        ...editForm,
        skills: [...editForm.skills, trimmed],
      });
    }
    setNewSkill("");
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    if (!editForm) return;
    setEditForm({
      ...editForm,
      skills: editForm.skills.filter((s) => s !== skillToRemove),
    });
  };

  const handleAddProject = () => {
    if (!editForm) return;
    setEditForm({
      ...editForm,
      projects: [
        ...editForm.projects,
        {
          name: "New Initiative",
          description: "Description of the verified work or product.",
          tags: ["Web", "Open Source"],
          link: "",
        },
      ],
    });
  };

  const handleRemoveProject = (idx: number) => {
    if (!editForm) return;
    setEditForm({
      ...editForm,
      projects: editForm.projects.filter((_, i) => i !== idx),
    });
  };

  const handleAddJourney = () => {
    if (!editForm) return;
    setEditForm({
      ...editForm,
      journey: [
        ...editForm.journey,
        {
          period: "Phase",
          title: "Milestone Title",
          description: "Summary of journey experience and verified learnings.",
        },
      ],
    });
  };

  const handleRemoveJourney = (idx: number) => {
    if (!editForm) return;
    setEditForm({
      ...editForm,
      journey: editForm.journey.filter((_, i) => i !== idx),
    });
  };

  return (
    <div className="admin-panel cms-panel">
      <div className="section-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="eyebrow">Leadership CMS</div>
          <h2>Founders & Executive Biographies</h2>
          <p>
            Manage verified bios, skills, portfolio links, journey milestones, and projects for Ahmed Rafin and Nirob Mia on the About Us page.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onSave()}
          disabled={saving}
          className="button button-primary"
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          {saving ? <Sparkles size={14} className="spin" /> : <Check size={14} />}
          <span>{saving ? "Saving Changes..." : "Publish Leadership"}</span>
        </button>
      </div>

      {message && (
        <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 8, background: "rgba(93, 226, 219, 0.12)", border: "1px solid rgba(93, 226, 219, 0.3)", color: "var(--foreground)", fontSize: "0.88rem" }}>
          {message}
        </div>
      )}

      {/* Editor Modal / Inline form */}
      {editingId && editForm && (
        <div
          style={{
            marginTop: 20,
            marginBottom: 24,
            padding: 24,
            background: "var(--surface)",
            borderRadius: 14,
            border: "1.5px solid var(--accent)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", overflow: "hidden", background: "var(--background)", border: "1px solid var(--border)", position: "relative" }}>
                {editForm.portraitUrl ? (
                  <Image src={editForm.portraitUrl} alt={editForm.name} fill style={{ objectFit: "cover" }} />
                ) : (
                  <User size={24} style={{ margin: 10, opacity: 0.5 }} />
                )}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Edit Profile: {editForm.name}</h3>
                <span style={{ fontSize: "0.78rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                  {editForm.role} • {editForm.location}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={cancelEdit}
                className="button button-secondary"
                style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 12px" }}
              >
                <X size={14} />
                <span>Cancel</span>
              </button>
              <button
                type="button"
                onClick={saveEdit}
                className="button button-primary"
                style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 14px" }}
              >
                <Check size={14} />
                <span>Apply Edits</span>
              </button>
            </div>
          </div>

          {/* Sub tabs inside the editor */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
            <button
              type="button"
              onClick={() => setActiveSubTab("general")}
              className={`button ${activeSubTab === "general" ? "button-primary" : "button-secondary"}`}
              style={{ fontSize: "0.82rem", padding: "6px 14px" }}
            >
              General & Bio
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("journey")}
              className={`button ${activeSubTab === "journey" ? "button-primary" : "button-secondary"}`}
              style={{ fontSize: "0.82rem", padding: "6px 14px", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Award size={13} />
              <span>Journey Milestones ({editForm.journey.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("projects")}
              className={`button ${activeSubTab === "projects" ? "button-primary" : "button-secondary"}`}
              style={{ fontSize: "0.82rem", padding: "6px 14px", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Briefcase size={13} />
              <span>Verified Projects ({editForm.projects.length})</span>
            </button>
          </div>

          {/* General Tab */}
          {activeSubTab === "general" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              <div>
                <label className="field-label">Full Name</label>
                <input
                  type="text"
                  className="field-input"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>

              <div>
                <label className="field-label">Official Role</label>
                <input
                  type="text"
                  className="field-input"
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                />
              </div>

              <div>
                <label className="field-label">Tagline / Specialization</label>
                <input
                  type="text"
                  className="field-input"
                  value={editForm.tagline}
                  onChange={(e) => setEditForm({ ...editForm, tagline: e.target.value })}
                />
              </div>

              <div>
                <label className="field-label">Location</label>
                <input
                  type="text"
                  className="field-input"
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label className="field-label">Portrait Image URL</label>
                <input
                  type="text"
                  className="field-input"
                  value={editForm.portraitUrl}
                  onChange={(e) => setEditForm({ ...editForm, portraitUrl: e.target.value })}
                  placeholder="/images/founders/ahmed-rafin.jpg"
                />
                <span style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 4, display: "block" }}>
                  Verified local asset path in `/public/images/founders/` or secure HTTPS image URL.
                </span>
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label className="field-label">Professional Biography</label>
                <textarea
                  className="field-input"
                  rows={4}
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label className="field-label">Personal Quote / Philosophy</label>
                <textarea
                  className="field-input"
                  rows={2}
                  value={editForm.quote}
                  onChange={(e) => setEditForm({ ...editForm, quote: e.target.value })}
                />
              </div>

              <div>
                <label className="field-label">Verified Portfolio URL</label>
                <input
                  type="url"
                  className="field-input"
                  value={editForm.portfolioUrl}
                  onChange={(e) => setEditForm({ ...editForm, portfolioUrl: e.target.value })}
                />
              </div>

              <div>
                <label className="field-label">GitHub URL</label>
                <input
                  type="url"
                  className="field-input"
                  value={editForm.githubUrl}
                  onChange={(e) => setEditForm({ ...editForm, githubUrl: e.target.value })}
                />
              </div>

              {/* Skills manager */}
              <div style={{ gridColumn: "1 / -1", marginTop: 8 }}>
                <label className="field-label">Skills & Technologies</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                  {editForm.skills.map((s) => (
                    <span
                      key={s}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        background: "var(--surface-muted)",
                        border: "1px solid var(--border)",
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontSize: "0.8rem",
                      }}
                    >
                      {s}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(s)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 0 }}
                        title="Remove skill"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 8, maxWidth: 360 }}>
                  <input
                    type="text"
                    className="field-input"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                    placeholder="Add skill (e.g. Next.js, Python)..."
                    style={{ fontSize: "0.85rem", padding: "6px 10px" }}
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="button button-secondary"
                    style={{ padding: "6px 12px", fontSize: "0.82rem" }}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Journey Tab */}
          {activeSubTab === "journey" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--muted)" }}>
                  Milestones and verified career steps displayed on the founder journey timeline.
                </p>
                <button
                  type="button"
                  onClick={handleAddJourney}
                  className="button button-secondary"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.82rem", padding: "5px 12px" }}
                >
                  <Plus size={13} />
                  <span>Add Milestone</span>
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {editForm.journey.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: 14,
                      background: "var(--surface-muted)",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.78rem", color: "var(--accent)", fontFamily: "var(--font-mono)" }}>
                        Milestone #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveJourney(idx)}
                        style={{ background: "none", border: "none", color: "var(--destructive)", cursor: "pointer", padding: 2 }}
                        title="Delete milestone"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10 }}>
                      <input
                        type="text"
                        className="field-input"
                        value={item.period}
                        onChange={(e) => {
                          const updated = [...editForm.journey];
                          updated[idx].period = e.target.value;
                          setEditForm({ ...editForm, journey: updated });
                        }}
                        placeholder="Phase / Period"
                        style={{ fontSize: "0.85rem" }}
                      />
                      <input
                        type="text"
                        className="field-input"
                        value={item.title}
                        onChange={(e) => {
                          const updated = [...editForm.journey];
                          updated[idx].title = e.target.value;
                          setEditForm({ ...editForm, journey: updated });
                        }}
                        placeholder="Milestone Title"
                        style={{ fontSize: "0.85rem" }}
                      />
                    </div>

                    <textarea
                      className="field-input"
                      rows={2}
                      value={item.description}
                      onChange={(e) => {
                        const updated = [...editForm.journey];
                        updated[idx].description = e.target.value;
                        setEditForm({ ...editForm, journey: updated });
                      }}
                      placeholder="Milestone description..."
                      style={{ fontSize: "0.85rem" }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects Tab */}
          {activeSubTab === "projects" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--muted)" }}>
                  Verified projects and platforms built or co-founded by this leader.
                </p>
                <button
                  type="button"
                  onClick={handleAddProject}
                  className="button button-secondary"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.82rem", padding: "5px 12px" }}
                >
                  <Plus size={13} />
                  <span>Add Project</span>
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {editForm.projects.map((proj, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: 14,
                      background: "var(--surface-muted)",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.78rem", color: "var(--accent)", fontFamily: "var(--font-mono)" }}>
                        Project #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveProject(idx)}
                        style={{ background: "none", border: "none", color: "var(--destructive)", cursor: "pointer", padding: 2 }}
                        title="Delete project"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <input
                        type="text"
                        className="field-input"
                        value={proj.name}
                        onChange={(e) => {
                          const updated = [...editForm.projects];
                          updated[idx].name = e.target.value;
                          setEditForm({ ...editForm, projects: updated });
                        }}
                        placeholder="Project Name"
                        style={{ fontSize: "0.85rem" }}
                      />
                      <input
                        type="url"
                        className="field-input"
                        value={proj.link || ""}
                        onChange={(e) => {
                          const updated = [...editForm.projects];
                          updated[idx].link = e.target.value;
                          setEditForm({ ...editForm, projects: updated });
                        }}
                        placeholder="Project URL (optional)"
                        style={{ fontSize: "0.85rem" }}
                      />
                    </div>

                    <textarea
                      className="field-input"
                      rows={2}
                      value={proj.description}
                      onChange={(e) => {
                        const updated = [...editForm.projects];
                        updated[idx].description = e.target.value;
                        setEditForm({ ...editForm, projects: updated });
                      }}
                      placeholder="Project description..."
                      style={{ fontSize: "0.85rem" }}
                    />

                    <div>
                      <input
                        type="text"
                        className="field-input"
                        value={proj.tags.join(", ")}
                        onChange={(e) => {
                          const updated = [...editForm.projects];
                          updated[idx].tags = e.target.value
                            .split(",")
                            .map((t) => t.trim())
                            .filter(Boolean);
                          setEditForm({ ...editForm, projects: updated });
                        }}
                        placeholder="Tags comma separated (e.g. Next.js, Supabase, AI)"
                        style={{ fontSize: "0.82rem" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Founders List */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 18, marginTop: 14 }}>
        {founders.map((founder, index) => (
          <div
            key={founder.id}
            style={{
              padding: 20,
              background: "var(--surface)",
              borderRadius: 14,
              border: `1px solid ${founder.visible ? "var(--border)" : "var(--border-muted)"}`,
              opacity: founder.visible ? 1 : 0.65,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              boxShadow: "0 4px 18px rgba(0,0,0,0.06)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 12,
                    overflow: "hidden",
                    position: "relative",
                    background: "var(--surface-muted)",
                    border: "1.5px solid var(--border)",
                    flexShrink: 0,
                  }}
                >
                  {founder.portraitUrl ? (
                    <Image
                      src={founder.portraitUrl}
                      alt={founder.name}
                      fill
                      style={{ objectFit: "cover" }}
                    />
                  ) : (
                    <User size={30} style={{ margin: 16, opacity: 0.5 }} />
                  )}
                </div>

                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h3 style={{ margin: 0, fontSize: "1.08rem" }}>{founder.name}</h3>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: founder.visible ? "rgba(93, 226, 219, 0.15)" : "var(--surface-muted)",
                        color: founder.visible ? "var(--accent)" : "var(--muted)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {founder.visible ? "Active" : "Hidden"}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: 2 }}>
                    {founder.role} • {founder.location}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--foreground)", opacity: 0.85, marginTop: 4 }}>
                    {founder.tagline}
                  </div>
                </div>
              </div>

              {/* Order Controls */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <button
                  type="button"
                  onClick={() => moveOrder(index, "up")}
                  disabled={index === 0}
                  className="button button-ghost"
                  style={{ padding: 4, minWidth: "auto", opacity: index === 0 ? 0.3 : 1 }}
                  title="Move Up"
                >
                  <ArrowUp size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => moveOrder(index, "down")}
                  disabled={index === founders.length - 1}
                  className="button button-ghost"
                  style={{ padding: 4, minWidth: "auto", opacity: index === founders.length - 1 ? 0.3 : 1 }}
                  title="Move Down"
                >
                  <ArrowDown size={13} />
                </button>
              </div>
            </div>

            {/* Bio snippet */}
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {founder.bio}
            </p>

            {/* Skills preview */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {founder.skills.slice(0, 6).map((skill) => (
                <span
                  key={skill}
                  style={{
                    fontSize: "0.72rem",
                    padding: "2px 8px",
                    background: "var(--surface-muted)",
                    borderRadius: 999,
                    color: "var(--foreground)",
                    opacity: 0.85,
                  }}
                >
                  {skill}
                </span>
              ))}
              {founder.skills.length > 6 && (
                <span style={{ fontSize: "0.72rem", padding: "2px 6px", color: "var(--muted)" }}>
                  +{founder.skills.length - 6} more
                </span>
              )}
            </div>

            {/* Action Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: "auto" }}>
              <div style={{ display: "flex", gap: 10 }}>
                {founder.portfolioUrl && (
                  <a
                    href={founder.portfolioUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: "0.78rem", color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none" }}
                  >
                    <span>Portfolio</span>
                    <ExternalLink size={11} />
                  </a>
                )}
                {founder.githubUrl && (
                  <a
                    href={founder.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: "0.78rem", color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none" }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                    <span>GitHub</span>
                  </a>
                )}
              </div>

              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => toggleVisibility(founder.id)}
                  className="button button-ghost"
                  style={{ padding: "6px 8px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: 4 }}
                  title={founder.visible ? "Hide profile on About page" : "Show profile on About page"}
                >
                  {founder.visible ? <EyeOff size={13} /> : <Eye size={13} />}
                  <span>{founder.visible ? "Hide" : "Show"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => startEdit(founder)}
                  className="button button-secondary"
                  style={{ padding: "6px 12px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  <Edit2 size={13} />
                  <span>Edit</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
