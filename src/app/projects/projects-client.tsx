"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, X, LoaderCircle } from "lucide-react";
import { ProjectCard } from "@/components/cards";
import type { Category, Project } from "@/lib/supabase-data";

export function ProjectsClient({
  initialProjects,
  categories,
  userId,
}: {
  initialProjects: Project[];
  categories: Category[];
  userId: string | null;
}) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id || "");
  const [status, setStatus] = useState<"idea" | "recruiting" | "in_progress" | "launched">("idea");
  const [visibility, setVisibility] = useState<"public" | "members">("public");

  const filteredProjects = useMemo(() => {
    if (!search.trim()) return projects;
    const q = search.toLowerCase();
    return projects.filter((p) =>
      p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    );
  }, [projects, search]);

  function handleNameChange(val: string) {
    setName(val);
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || name.length < 2) {
      setError("Project name must be at least 2 characters.");
      return;
    }
    if (!description.trim() || description.length < 10) {
      setError("Please provide a description of at least 10 characters.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(editingId ? `/api/v1/projects/${editingId}` : "/api/v1/projects", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          description: description.trim(),
          categoryId: categoryId || null,
          status,
          visibility,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to create project");
      }

      const newProj = data.data;
      const cat = categories.find((c) => c.id === categoryId);
      const newCard: Project = {
        id: newProj.id,
        name: newProj.name,
        description: newProj.description,
        status: newProj.status === "launched" ? "Live" : newProj.status === "in_progress" ? "Active" : "Idea",
        color: cat?.color || "#d8ff62",
        team: ["YOU"],
        metric: "1 contributor",
      };

      setProjects((prev) => editingId ? prev.map((project) => project.id === editingId ? { ...project, name: newCard.name, description: newCard.description, status: newCard.status, color: newCard.color } : project) : [newCard, ...prev]);
      setSuccess(editingId ? "Project updated successfully!" : "Project created successfully!");
      setName("");
      setSlug("");
      setDescription("");
      setEditingId(null);
      setTimeout(() => {
        setModalOpen(false);
        setSuccess("");
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setLoading(false);
    }
  }

  function startEditing(project: Project) {
    setEditingId(project.id);
    setName(project.name);
    setSlug(project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    setDescription(project.description);
    setStatus((project.status === "Live" ? "launched" : project.status === "Active" ? "in_progress" : project.status) as "idea" | "recruiting" | "in_progress" | "launched");
    setModalOpen(true);
  }

  async function deleteProject(id: string) {
    const response = await fetch(`/api/v1/projects/${id}`, { method: "DELETE" });
    if (response.ok) setProjects((current) => current.filter((project) => project.id !== id));
    else setError("The project could not be deleted.");
  }

  return (
    <>
      <div className="toolbar">
        <div className="input-wrap">
          <Search size={15} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects by name or description..."
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{ background: "transparent", border: 0, color: "var(--muted)", cursor: "pointer", padding: 0 }}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button
          className="button button-primary"
          type="button"
          onClick={() => {
            setError("");
            setSuccess("");
            setModalOpen(true);
          }}
        >
          <Plus size={15} /> Submit a project
        </button>
      </div>

      <div style={{ marginBottom: 16, color: "var(--muted)", fontSize: 12 }}>
        Showing {filteredProjects.length} {filteredProjects.length === 1 ? "project" : "projects"}
      </div>

      {filteredProjects.length ? (
        <div className="project-grid">
          {filteredProjects.map((project) => (
            <div key={project.id}>
              <ProjectCard project={project} />
              {userId && project.ownerId === userId && <div className="inline-actions" style={{ marginTop: 8 }}><button type="button" onClick={() => startEditing(project)}>Edit</button><button type="button" className="danger" onClick={() => void deleteProject(project.id)}>Delete</button></div>}
            </div>
          ))}
        </div>
      ) : (
        <div className="panel" style={{ textAlign: "center", padding: "40px 20px" }}>
          <p className="muted-text" style={{ fontSize: 14, margin: "0 0 12px" }}>
            {search ? "No projects match your search." : "No projects have been added yet."}
          </p>
          {search ? (
            <button onClick={() => setSearch("")} className="button button-ghost" style={{ fontSize: 11 }}>
              Clear search
            </button>
          ) : (
            <button onClick={() => setModalOpen(true)} className="button button-primary" style={{ fontSize: 11 }}>
              Be the first to submit one
            </button>
          )}
        </div>
      )}

      {/* Submit Project Modal */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10,12,11,0.85)",
            backdropFilter: "blur(8px)",
            zIndex: 100,
            display: "grid",
            placeItems: "center",
            padding: 20,
          }}
          onClick={(e) => { if (e.target === e.currentTarget && !loading) setModalOpen(false); }}
        >
          <div
            style={{
              width: "min(580px, 94vw)",
              background: "rgba(22,26,24,0.98)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: 28,
              boxShadow: "0 24px 60px rgba(0,0,0,0.8)",
              position: "relative",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <button
              onClick={() => setModalOpen(false)}
              disabled={loading}
              style={{ position: "absolute", top: 20, right: 20, background: "transparent", border: 0, color: "var(--muted)", cursor: "pointer" }}
              aria-label="Close modal"
            >
              <X size={20} />
            </button>

            <div className="eyebrow" style={{ color: "var(--lime)" }}>Community Directory</div>
            <h2 style={{ fontSize: 24, margin: "8px 0 20px" }}>{editingId ? "Edit project" : "Submit a project"}</h2>

            {!userId ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <p style={{ color: "var(--muted)", margin: "0 0 16px" }}>You must be signed in to submit a project to the community.</p>
                <Link href="/login?next=/projects" className="button button-primary">
                  Sign in to continue
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
                {error && <p style={{ color: "var(--coral)", fontSize: 12, margin: 0 }}>{error}</p>}
                {success && <p style={{ color: "var(--lime)", fontSize: 12, margin: 0 }}>{success}</p>}

                <div className="field">
                  <label>Project Name *</label>
                  <input
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Mentor Match, Open Studio"
                    required
                  />
                </div>

                <div className="field">
                  <label>Slug</label>
                  <input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="project-slug"
                  />
                </div>

                <div className="field">
                  <label>Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>Description *</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What are you building? What problem does it solve? What kind of help do you need?"
                    rows={4}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="field">
                    <label>Status</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value as "idea" | "recruiting" | "in_progress" | "launched")}>
                      <option value="idea">Idea</option>
                      <option value="recruiting">Recruiting</option>
                      <option value="in_progress">In Progress</option>
                      <option value="launched">Launched</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Visibility</label>
                    <select value={visibility} onChange={(e) => setVisibility(e.target.value as "public" | "members")}>
                      <option value="public">Public</option>
                      <option value="members">Members Only</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="button button-ghost"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="button button-primary"
                    disabled={loading}
                  >
                    {loading ? <LoaderCircle size={14} className="spin" /> : <Plus size={14} />}
                    {loading ? "Submitting..." : "Submit Project"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
