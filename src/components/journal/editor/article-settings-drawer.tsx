"use client";

import { useEffect, useState, useRef } from "react";
import { X, ImageIcon, Loader2, Sparkles, RefreshCw } from "lucide-react";
import { slugify } from "@/server/journal/validation";
import type { Category } from "@/lib/supabase-data";

interface ArticleSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  slug: string;
  onSlugChange: (slug: string) => void;
  excerpt: string;
  onExcerptChange: (excerpt: string) => void;
  categoryId: string;
  onCategoryChange: (catId: string) => void;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  coverImageUrl: string;
  onCoverImageChange: (url: string) => void;
  featured: boolean;
  onFeaturedChange: (featured: boolean) => void;
  seoTitle: string;
  onSeoTitleChange: (seoTitle: string) => void;
  seoDescription: string;
  onSeoDescriptionChange: (seoDescription: string) => void;
  isAdmin?: boolean;
}

export function ArticleSettingsDrawer({
  isOpen,
  onClose,
  title,
  slug,
  onSlugChange,
  excerpt,
  onExcerptChange,
  categoryId,
  onCategoryChange,
  tags,
  onTagsChange,
  coverImageUrl,
  onCoverImageChange,
  featured,
  onFeaturedChange,
  seoTitle,
  onSeoTitleChange,
  seoDescription,
  onSeoDescriptionChange,
  isAdmin = false,
}: ArticleSettingsDrawerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/v1/categories")
      .then((res) => res.json())
      .then((json) => {
        if (json?.data) setCategories(json.data);
      })
      .catch(() => {});
  }, []);

  if (!isOpen) return null;

  function autoGenerateSlug() {
    if (title) {
      onSlugChange(slugify(title));
    }
  }

  function handleAddTag(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = tagInput.trim().replace(/^#/, "");
      if (val && !tags.includes(val) && tags.length < 10) {
        onTagsChange([...tags, val]);
        setTagInput("");
      }
    }
  }

  function handleRemoveTag(tagToRemove: string) {
    onTagsChange(tags.filter((t) => t !== tagToRemove));
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    setUploadError("");
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setUploadError("Cover must be JPEG, PNG, WebP, or GIF.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/v1/journal/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to upload cover.");
      }

      onCoverImageChange(json.data.url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed.";
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="journal-drawer-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <aside className="journal-drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="journal-drawer-header">
          <div className="journal-drawer-title">
            <Sparkles size={16} className="text-accent" />
            <span>Article Settings</span>
          </div>
          <button type="button" className="journal-drawer-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="journal-drawer-body">
          {/* URL Slug */}
          <div className="journal-form-group">
            <div className="journal-label-with-action">
              <label className="journal-form-label">URL Slug</label>
              <button
                type="button"
                className="journal-text-btn"
                onClick={autoGenerateSlug}
                title="Generate from title"
              >
                <RefreshCw size={12} /> Auto-generate
              </button>
            </div>
            <div className="journal-slug-input-wrapper">
              <span className="journal-slug-prefix">/journal/</span>
              <input
                type="text"
                className="journal-input"
                value={slug}
                onChange={(e) => onSlugChange(slugify(e.target.value))}
                placeholder="my-article-slug"
              />
            </div>
          </div>

          {/* Excerpt */}
          <div className="journal-form-group">
            <label className="journal-form-label">Summary / Excerpt</label>
            <textarea
              className="journal-input"
              value={excerpt}
              onChange={(e) => onExcerptChange(e.target.value)}
              placeholder="A compelling 1-2 sentence overview shown in the article index and meta description."
              rows={3}
              maxLength={400}
            />
            <small className="journal-form-hint">{excerpt.length}/400 characters</small>
          </div>

          {/* Category */}
          <div className="journal-form-group">
            <label className="journal-form-label">Category</label>
            <select
              className="journal-input"
              value={categoryId}
              onChange={(e) => onCategoryChange(e.target.value)}
            >
              <option value="">Select a category...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div className="journal-form-group">
            <label className="journal-form-label">Tags (press Enter to add)</label>
            <div className="journal-tags-container">
              {tags.map((t) => (
                <span key={t} className="journal-tag-pill">
                  #{t}
                  <button type="button" onClick={() => handleRemoveTag(t)}>
                    <X size={12} />
                  </button>
                </span>
              ))}
              {tags.length < 10 && (
                <input
                  type="text"
                  className="journal-tag-input"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder={tags.length === 0 ? "Add tags e.g. AI, Math..." : "+ tag"}
                />
              )}
            </div>
          </div>

          {/* Cover Image */}
          <div className="journal-form-group">
            <label className="journal-form-label">Cover Image</label>
            <div className="journal-cover-upload" onClick={() => fileInputRef.current?.click()}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
              {uploading ? (
                <div className="journal-cover-loading">
                  <Loader2 size={20} className="spin" />
                  <span>Uploading cover...</span>
                </div>
              ) : coverImageUrl ? (
                <div className="journal-cover-preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverImageUrl} alt="Cover" />
                  <span className="journal-cover-overlay">Click to change cover</span>
                </div>
              ) : (
                <div className="journal-cover-placeholder">
                  <ImageIcon size={24} className="text-muted" />
                  <span>Upload cover image (recommended 1200x630)</span>
                </div>
              )}
            </div>
            {uploadError && <p className="journal-form-error">{uploadError}</p>}
            {coverImageUrl && (
              <button
                type="button"
                className="journal-text-btn journal-text-coral"
                onClick={() => onCoverImageChange("")}
              >
                Remove cover image
              </button>
            )}
          </div>

          {/* Featured (Admin only) */}
          {isAdmin && (
            <div className="journal-form-row">
              <label className="journal-checkbox-label">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => onFeaturedChange(e.target.checked)}
                />
                <span>Feature on journal masthead</span>
              </label>
            </div>
          )}

          {/* SEO Metadata */}
          <div className="journal-settings-section">
            <h4 className="journal-settings-subtitle">SEO & Social Sharing</h4>
            <div className="journal-form-group">
              <label className="journal-form-label">Meta Title</label>
              <input
                type="text"
                className="journal-input"
                value={seoTitle}
                onChange={(e) => onSeoTitleChange(e.target.value)}
                placeholder={title || "Article meta title"}
                maxLength={80}
              />
            </div>
            <div className="journal-form-group">
              <label className="journal-form-label">Meta Description</label>
              <textarea
                className="journal-input"
                value={seoDescription}
                onChange={(e) => onSeoDescriptionChange(e.target.value)}
                placeholder={excerpt || "Search engine description"}
                rows={2}
                maxLength={160}
              />
            </div>
          </div>
        </div>

        <div className="journal-drawer-footer">
          <button type="button" className="button button-primary w-full" onClick={onClose}>
            Done
          </button>
        </div>
      </aside>
    </div>
  );
}
