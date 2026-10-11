"use client";

import { useState } from "react";
import { X, Video, AlertCircle } from "lucide-react";

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (src: string, title?: string, caption?: string) => void;
}

export function VideoModal({ isOpen, onClose, onInsert }: VideoModalProps) {
  const [src, setSrc] = useState("");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  function handleInsert() {
    setError("");
    const url = src.trim();
    if (!url) {
      setError("Please enter a video URL.");
      return;
    }

    const isValid =
      /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|vimeo\.com|loom\.com)\//.test(url);

    if (!isValid) {
      setError("Only YouTube, Vimeo, and Loom video URLs are supported.");
      return;
    }

    onInsert(url, title.trim() || undefined, caption.trim() || undefined);
    onClose();
  }

  return (
    <div className="journal-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="journal-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="journal-modal-header">
          <div className="journal-modal-title">
            <Video size={18} className="text-accent" />
            <span>Embed Video</span>
          </div>
          <button type="button" className="journal-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="journal-modal-body">
          <div className="journal-form-group">
            <label className="journal-form-label">Video URL</label>
            <input
              type="url"
              className="journal-input"
              value={src}
              onChange={(e) => {
                setSrc(e.target.value);
                setError("");
              }}
              placeholder="e.g. https://www.youtube.com/watch?v=..."
              autoFocus
            />
            <small className="journal-form-hint">
              Supported providers: YouTube, Vimeo, Loom. Content will be embedded securely in a responsive 16:9 frame.
            </small>
            {error && (
              <div className="journal-form-error">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="journal-form-group">
            <label className="journal-form-label">Title (Optional)</label>
            <input
              type="text"
              className="journal-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. MIT OpenCourseWare Lecture 1"
            />
          </div>

          <div className="journal-form-group">
            <label className="journal-form-label">Caption (Optional)</label>
            <input
              type="text"
              className="journal-input"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="e.g. Video courtesy of MIT 6.006"
            />
          </div>
        </div>

        <div className="journal-modal-footer">
          <button type="button" className="button button-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="button button-primary" onClick={handleInsert}>
            Insert Video
          </button>
        </div>
      </div>
    </div>
  );
}
