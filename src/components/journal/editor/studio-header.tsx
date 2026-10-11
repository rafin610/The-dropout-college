"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Eye,
  Edit3,
  SlidersHorizontal,
  CloudCheck,
  CloudUpload,
  AlertCircle,
  Trash2,
  Send,
  Loader2,
} from "lucide-react";
import type { ArticleStatus } from "@/server/journal/types";

interface StudioHeaderProps {
  status: ArticleStatus;
  saveStatus: "saved" | "saving" | "unsaved" | "error";
  isPreview: boolean;
  onTogglePreview: () => void;
  onOpenSettings: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onDelete?: () => void;
  isSaving: boolean;
  canPublish?: boolean;
  canDelete?: boolean;
}

export function StudioHeader({
  status,
  saveStatus,
  isPreview,
  onTogglePreview,
  onOpenSettings,
  onSaveDraft,
  onPublish,
  onUnpublish,
  onDelete,
  isSaving,
  canPublish = true,
  canDelete = false,
}: StudioHeaderProps) {
  return (
    <header className="journal-studio-header">
      <div className="journal-studio-left">
        <Link href="/journal" className="journal-studio-back">
          <ArrowLeft size={16} />
          <span>Journal</span>
        </Link>

        <div className="journal-studio-status-badge">
          <span className={`status-pill status-${status}`}>{status}</span>
        </div>

        {/* Save Status indicator */}
        <div className="journal-studio-save-indicator" aria-live="polite">
          {saveStatus === "saving" && (
            <span className="save-status-item text-muted">
              <Loader2 size={13} className="spin" />
              <span>Saving…</span>
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="save-status-item text-muted">
              <CloudCheck size={14} className="text-lime" />
              <span>Saved</span>
            </span>
          )}
          {saveStatus === "unsaved" && (
            <span className="save-status-item text-muted">
              <CloudUpload size={14} />
              <span>Unsaved changes</span>
            </span>
          )}
          {saveStatus === "error" && (
            <span className="save-status-item text-coral">
              <AlertCircle size={14} />
              <span>Save error</span>
            </span>
          )}
        </div>
      </div>

      <div className="journal-studio-right">
        {/* Preview / Edit Toggle */}
        <button
          type="button"
          className={`button ${isPreview ? "button-accent" : "button-ghost"}`}
          onClick={onTogglePreview}
          title={isPreview ? "Switch to Edit Mode" : "Preview Published Layout"}
        >
          {isPreview ? (
            <>
              <Edit3 size={15} />
              <span>Editor</span>
            </>
          ) : (
            <>
              <Eye size={15} />
              <span>Preview</span>
            </>
          )}
        </button>

        {/* Settings Drawer Button */}
        <button
          type="button"
          className="button button-ghost"
          onClick={onOpenSettings}
          title="Article Settings & Metadata"
        >
          <SlidersHorizontal size={15} />
          <span>Settings</span>
        </button>

        {/* Save Draft */}
        <button
          type="button"
          className="button button-ghost"
          onClick={onSaveDraft}
          disabled={isSaving}
        >
          Save draft
        </button>

        {/* Publish / Unpublish */}
        {canPublish && (
          status === "published" ? (
            <button
              type="button"
              className="button button-ghost"
              onClick={onUnpublish}
              disabled={isSaving}
            >
              Unpublish
            </button>
          ) : (
            <button
              type="button"
              className="button button-primary"
              onClick={onPublish}
              disabled={isSaving}
            >
              <Send size={14} />
              <span>Publish</span>
            </button>
          )
        )}

        {/* Delete button */}
        {canDelete && onDelete && (
          <button
            type="button"
            className="journal-studio-delete-btn"
            onClick={onDelete}
            title="Delete article"
            aria-label="Delete article"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </header>
  );
}
