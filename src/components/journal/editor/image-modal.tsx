"use client";

import { useState, useRef } from "react";
import { X, Upload, ImageIcon, Loader2, AlertCircle } from "lucide-react";

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (url: string, alt?: string, caption?: string) => void;
}

export function ImageModal({ isOpen, onClose, onInsert }: ImageModalProps) {
  const [tab, setTab] = useState<"upload" | "url">("upload");
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"].includes(file.type)) {
      setError("Please select a JPEG, PNG, WebP, GIF, or SVG image.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError("Image must be smaller than 8MB.");
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
        throw new Error(json.error?.message || "Failed to upload image.");
      }

      setUrl(json.data.url);
      if (!alt) setAlt(file.name.replace(/\.[^/.]+$/, ""));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload image.";
      setError(msg);
    } finally {
      setUploading(false);
    }
  }

  function handleInsert() {
    setError("");
    if (!url.trim()) {
      setError("Please provide an image.");
      return;
    }
    onInsert(url.trim(), alt.trim() || undefined, caption.trim() || undefined);
    onClose();
  }

  return (
    <div className="journal-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="journal-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="journal-modal-header">
          <div className="journal-modal-title">
            <ImageIcon size={18} className="text-accent" />
            <span>Insert Image</span>
          </div>
          <button type="button" className="journal-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="journal-modal-body">
          <div className="journal-tab-switch">
            <button
              type="button"
              className={tab === "upload" ? "active" : ""}
              onClick={() => setTab("upload")}
            >
              Upload file
            </button>
            <button
              type="button"
              className={tab === "url" ? "active" : ""}
              onClick={() => setTab("url")}
            >
              Image URL
            </button>
          </div>

          {error && (
            <div className="journal-form-error">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          {tab === "upload" ? (
            <div className="journal-upload-zone" onClick={() => fileInputRef.current?.click()}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
              {uploading ? (
                <div className="journal-upload-loading">
                  <Loader2 size={24} className="spin" />
                  <span>Uploading to journal storage…</span>
                </div>
              ) : url ? (
                <div className="journal-upload-preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="Preview" />
                  <span className="journal-change-photo-badge">Click to replace image</span>
                </div>
              ) : (
                <div className="journal-upload-prompt">
                  <Upload size={28} className="text-muted" />
                  <strong>Click or drag an image here</strong>
                  <span>Supports JPG, PNG, WebP, GIF up to 8MB</span>
                </div>
              )}
            </div>
          ) : (
            <div className="journal-form-group">
              <label className="journal-form-label">Image URL</label>
              <input
                type="url"
                className="journal-input"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError("");
                }}
                placeholder="https://example.com/figure.png"
              />
              {url && (
                <div className="journal-url-preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="Preview" onError={() => setError("Unable to load image from URL.")} />
                </div>
              )}
            </div>
          )}

          <div className="journal-form-group">
            <label className="journal-form-label">Alt text (Accessibility)</label>
            <input
              type="text"
              className="journal-input"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="e.g. Diagram illustrating transformer self-attention weights"
            />
          </div>

          <div className="journal-form-group">
            <label className="journal-form-label">Caption (Optional)</label>
            <input
              type="text"
              className="journal-input"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="e.g. Figure 1: Self-attention computation matrix"
            />
          </div>
        </div>

        <div className="journal-modal-footer">
          <button type="button" className="button button-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={handleInsert}
            disabled={uploading || !url.trim()}
          >
            Insert Image
          </button>
        </div>
      </div>
    </div>
  );
}
