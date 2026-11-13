"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoveReactionButton({
  postId,
  loved,
  count,
  signedIn,
  onChange,
}: {
  postId: string;
  loved: boolean;
  count: number;
  signedIn: boolean;
  onChange: (next: { loved: boolean; count: number }) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(`/p/${postId}`)}`);
      return;
    }
    if (busy) return;

    const optimistic = { loved: !loved, count: Math.max(0, count + (loved ? -1 : 1)) };
    onChange(optimistic);
    setBusy(true);

    try {
      const response = await fetch(`/api/v1/posts/${postId}/love`, { method: "POST" });
      const payload = (await response.json().catch(() => null)) as
        | { data?: { loved?: boolean; loveCount?: number }; error?: { message?: string } }
        | null;

      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error?.message || "Could not save your reaction.");
      }

      onChange({
        loved: Boolean(payload.data.loved),
        count: Number(payload.data.loveCount ?? optimistic.count),
      });
    } catch {
      onChange({ loved, count });
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={`c-action-btn${loved ? " loved" : ""}`}
      onClick={toggle}
      disabled={busy}
      aria-pressed={loved}
      aria-label={loved ? "Remove your Love" : "Love this post"}
      title={loved ? "Remove Love" : "Love"}
    >
      <Heart size={16} />
      <span>{count > 0 ? count : "Love"}</span>
    </button>
  );
}
