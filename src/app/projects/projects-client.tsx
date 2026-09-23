"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Search, X, LoaderCircle, Upload } from "lucide-react";
import { ProjectCard } from "@/components/cards";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Category, Project } from "@/lib/supabase-data";

const MAX_COVER_BYTES = 5 * 1024 * 1024;
const ALLOWED_COVER_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

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
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id || "");
  const [status, setStatus] = useState<"idea" | "building" | "launched">("idea");
  const [demoUrl, setDemoUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [coverPreview, setCoverPreview] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      const matchesCategory = categoryFilter === "all" || (p.categoryName ?? "").toLowerCase() === categoryFilter.toLowerCase() || p.categoryName === null;
      // When a category filter is set, match by category id via name.
      if (categoryFilter !== "all") {
        const cat = categories.find((c) => c.id === categoryFilter);
        if (cat && (p.categoryName ?? "").toLowerCase() !== cat.name.toLowerCase()) return false;
      } else if (!matchesCategory) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.categoryName ?? "").toLowerCase().includes(q)
      );
    });
  }, [projects, search, categoryFilter, categories]);

  function handleNameChange(val: string) {
    setName(val);
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  }

  function resetForm() {
    setName("");
    setSlug("");
    setDescription("");
    setCategoryId(categories[0]?.id || "");
    setStatus("idea");
    setDemoUrl("");
    setGithubUrl("");
    setCoverUrl("");
    setCoverPreview("");
    setCoverFile(null);
    setEditingId(null);
    setError("");
    setSuccess("");
  }

  function handleFileSelect(file: File | undefined) {
    setError("");
    if (!file) return;
    if (!ALLOWED_COVER_TYPES.includes(file.type)) {
      setError("Cover image must be JPEG, PNG, WebP, or GIF.");
      return;
    }
    if (file.size > MAX_COVER_BYTES) {
      setError("Cover image must be 5MB or smaller.");
      return;
    }
    setCoverFile(file);
    const url = URL.createObjectURL(file);
    setCoverPreview(url);
  }

  async function uploadCover(): Promise<string | null> {
    if (!coverFile || !userId) return coverUrl || null;
    setUploading(true);
    setError("");
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("Storage is not available.");
      const ext = coverFile.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("project-covers").upload(path, coverFile, {
        contentType: coverFile.type,
        upsert: false,
      });
      if (uploadError) throw new Error(uploadError.message);
      const { data } = supabase.storage.from("project-covers").getPublicUrl(path);
      setCoverUrl(data.publicUrl);
      return data.publicUrl;
    } catch (err) {
      // Do NOT lose form data on upload failure.
      setError(err instanceof Error ? `Image upload failed: ${err.message}. Your text is preserved — fix the image and retry.` : "Image upload failed. Your text is preserved.");
      return null;
    } finally {
      setUploading(false);
    }
  }

  function statusToDb(value: "idea" | "building" | "launched"): string {
    return value === "building" ? "in_progress" : value === "launched" ? "launched" : "idea";
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
    if (demoUrl.trim() && !/^https?:\/\//i.test(demoUrl.trim())) {
      setError("Demo URL must start with http:// or https://");
      return;
    }
    if (githubUrl.trim() && !/^https?:\/\//i.test(githubUrl.trim())) {
      setError("GitHub URL must start with http:// or https://");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      let finalCover = coverUrl || null;
      if (coverFile) {
        const uploaded = await uploadCover();
        if (coverFile && !uploaded && !coverUrl) {
          setLoading(false);
          return; // Keep form data; error already shown.
        }
        finalCover = uploaded ?? coverUrl ?? null;
      }

      const res = await fetch(editingId ? `/api/v1/projects/${editingId}` : "/api/v1/projects", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          description: description.trim(),
          categoryId: categoryId || null,
          status: statusToDb(status),
          visibility: "public",
          coverImageUrl: finalCover,
          demoUrl: demoUrl.trim() || null,
          githubUrl: githubUrl.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to create project");
      }

      const newProj = data.data;
      const cat = categories.find((c) => c.id === categoryId);
      const statusLabel = status === "building" ? "Building" : status === "launched" ? "Launched" : "Idea";
      const newCard: Project = {
        id: newProj.id,
        ownerId: userId ?? undefined,
        name: newProj.name,
        description: newProj.description,
        status: statusLabel,
        color: cat?.color || "var(--accent)",
        team: ["YOU"],
        metric: "1 contributor",
        technologies: [],
        coverImageUrl: newProj.cover_image_url ?? finalCover,
        categoryName: cat?.name ?? null,
        upvoteCount: 0,
        commentCount: 0,
        demoUrl: newProj.demo_url ?? demoUrl.trim() ?? null,
        githubUrl: newProj.github_url ?? githubUrl.trim() ?? null,
      };

      setProjects((prev) => editingId ? prev.map((project) => project.id === editingId ? { ...project, name: newCard.name, description: newCard.description, status: newCard.status, color: newCard.color, coverImageUrl: newCard.coverImageUrl ?? project.coverImageUrl, demoUrl: newCard.demoUrl, githubUrl: newCard.githubUrl } : project) : [newCard, ...prev]);
      setSuccess(editingId ? "Project updated successfully!" : "Project created successfully!");
      const keepCoverPreview = coverPreview;
      resetFormKeepPreview(keepCoverPreview);
      setTimeout(() => {
        setModalOpen(false);
        setSuccess("");
        resetForm();
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setLoading(false);
    }
  }

  function resetFormKeepPreview(_preview: string) {
    // Clear file state but keep inputs cleared; preview cleanup happens on close.
  }

  function startEditing(project: Project) {
    setEditingId(project.id);
    setName(project.name);
    setSlug(project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    setDescription(project.description);
    const s = (project.status || "").toLowerCase();
    setStatus(s.includes("launch") ? "launched" : s.includes("build") || s.includes("active") || s === "in_progress" ? "building" : "idea");
    setDemoUrl(project.demoUrl ?? "");
    setGithubUrl(project.githubUrl ?? "");
    setCoverUrl(project.coverImageUrl ?? "");
    setCoverPreview(project.coverImageUrl ?? "");
    setCoverFile(null);
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  async function deleteProject(id: string) {
    const response = await fetch(`/api/v1/projects/${id}`, { method: "DELETE" });
    if (response.ok) setProjects((current) => current.filter((project) => project.id !== id));
    else setError("The project could not be deleted.");
  }

  function openModal() {
    resetForm();
    setModalOpen(true);
  }

  return (
    <>
      <div className="toolbar">
        <div className="input-wrap">
          <Search size={15} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects by title, description, category..."
            aria-label="Search projects"
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
        <button className="button button-primary" type="button" onClick={openModal}>
          <Plus size={15} /> Submit a project
        </button>
      </div>

      {categories.length > 0 && (
        <div className="filter-row" style={{ marginBottom: 16 }} role="group" aria-label="Filter by category">
          <button type="button" className={`filter${categoryFilter === "all" ? " active" : ""}`} onClick={() => setCategoryFilter("all")}>All</button>
          {categories.map((c) => (
            <button key={c.id} type="button" className={`filter${categoryFilter === c.id ? " active" : ""}`} onClick={() => setCategoryFilter(categoryFilter === c.id ? "all" : c.id)}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div style={{ marginBottom: 16, color: "var(--muted)", fontSize: 12 }}>
        Showing {filteredProjects.length} {filteredProjects.length === 1 ? "project" : "projects"}
      </div>

      {filteredProjects.length ? (
        <div className="project-grid">
          {filteredProjects.map((project) => (
            <div key={project.id}>
              <ProjectCard project={project} userId={userId} />
              {userId && project.ownerId === userId && <div className="inline-actions" style={{ marginTop: 8 }}><button type="button" onClick={() => startEditing(project)}>Edit</button><button type="button" className="danger" onClick={() => void deleteProject(project.id)}>Delete</button></div>}
            </div>
          ))}
        </div>
      ) : (
        <div className="panel" style={{ textAlign: "center", padding: "40px 20px" }}>
          <p className="muted-text" style={{ fontSize: 14, margin: "0 0 12px" }}>
            {search || categoryFilter !== "all" ? "No projects match your search." : "No projects yet."}
          </p>
          {search || categoryFilter !== "all" ? (
            <button onClick={() => { setSearch(""); setCategoryFilter("all"); }} className="button button-ghost" style={{ fontSize: 11 }}>
              Clear search
            </button>
          ) : (
            <button onClick={openModal} className="button button-primary" style={{ fontSize: 11 }}>
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
            background: "var(--overlay)",
            backdropFilter: "blur(8px)",
            zIndex: 100,
            display: "grid",
            placeItems: "center",
            padding: 20,
          }}
          onClick={(e) => { if (e.target === e.currentTarget && !loading && !uploading) { setModalOpen(false); resetForm(); } }}
        >
          <div
            style={{
              width: "min(580px, 94vw)",
              background: "var(--popover)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: 28,
              boxShadow: "var(--shadow-lg)",
              position: "relative",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <button
              onClick={() => { setModalOpen(false); resetForm(); }}
              disabled={loading || uploading}
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
                {error && <p style={{ color: "var(--coral)", fontSize: 12, margin: 0 }} role="alert">{error}</p>}
                {success && <p style={{ color: "var(--lime)", fontSize: 12, margin: 0 }} role="status">{success}</p>}

                <div className="field">
                  <label>Project title *</label>
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
                  <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
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

                <div className="field">
                  <label>Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value as "idea" | "building" | "launched")}>
                    <option value="idea">Idea</option>
                    <option value="building">Building</option>
                    <option value="launched">Launched</option>
                  </select>
                </div>

                <div className="field">
                  <label>Project cover image</label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    style={{ display: "none" }}
                    onChange={(e) => handleFileSelect(e.target.files?.[0])}
                  />
                  {(coverPreview || coverUrl) && (
                    <div className="image-preview" style={{ marginBottom: 8 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={coverPreview || coverUrl} alt="Cover preview" />
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" className="button button-ghost" style={{ fontSize: 11 }} onClick={() => fileRef.current?.click()} disabled={uploading || loading}>
                      <Upload size={13} /> {coverPreview || coverUrl ? "Change image" : "Upload cover"}
                    </button>
                    {(coverPreview || coverUrl) && (
                      <button type="button" className="button button-ghost" style={{ fontSize: 11 }} onClick={() => { setCoverPreview(""); setCoverUrl(""); setCoverFile(null); }} disabled={uploading || loading}>
                        Remove
                      </button>
                    )}
                  </div>
                  <span className="muted-text">JPEG, PNG, WebP or GIF · max 5MB. Preview shown before submission.</span>
                  {uploading && <span className="muted-text"><LoaderCircle size={12} className="spin" /> Uploading image…</span>}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="field">
                    <label>Project / demo URL (optional)</label>
                    <input value={demoUrl} onChange={(e) => setDemoUrl(e.target.value)} placeholder="https://…" inputMode="url" />
                  </div>
                  <div className="field">
                    <label>GitHub URL (optional)</label>
                    <input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="https://github.com/…" inputMode="url" />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                  <button type="button" onClick={() => { setModalOpen(false); resetForm(); }} className="button button-ghost" disabled={loading || uploading}>
                    Cancel
                  </button>
                  <button type="submit" className="button button-primary" disabled={loading || uploading}>
                    {loading || uploading ? <LoaderCircle size={14} className="spin" /> : <Plus size={14} />}
                    {uploading ? "Uploading…" : loading ? "Submitting…" : "Submit Project"}
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
