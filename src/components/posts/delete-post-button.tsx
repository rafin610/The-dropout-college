"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeletePostButton({
  postId,
  onDeleted,
  compact = false,
}: {
  postId: string;
  onDeleted?: () => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (busy) return;
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/v1/posts/${postId}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.message || "The post could not be deleted.");
      }
      onDeleted?.();
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "The post could not be deleted.");
    } finally {
      setBusy(false);
    }
  }

  if (compact) {
    return (
      <button
        type="button"
        className="c-icon-btn"
        onClick={remove}
        disabled={busy}
        aria-label="Delete post"
        title="Delete post"
      >
        <Trash2 size={15} />
      </button>
    );
  }

  return (
    <button type="button" className="c-action-btn" onClick={remove} disabled={busy}>
      <Trash2 size={15} />
      <span>{busy ? "Deleting…" : "Delete"}</span>
    </button>
  );
}
