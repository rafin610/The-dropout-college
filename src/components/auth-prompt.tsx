"use client";

import Link from "next/link";
import { X } from "lucide-react";

/**
 * Lightweight sign-in prompt shown when a logged-out visitor attempts a
 * protected social action (upvote / follow / comment). Explains why login
 * is required and returns the user to the page they were on via `next`.
 */
export function AuthPrompt({
  open,
  action,
  onClose,
  next,
}: {
  open: boolean;
  /** e.g. "upvote", "follow", "comment" */
  action: string;
  onClose: () => void;
  /** Path to return to after login (defaults to current path handled by caller). */
  next?: string;
}) {
  if (!open) return null;
  const nextParam = next ?? (typeof window !== "undefined" ? window.location.pathname + window.location.search : "/");
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sign in required"
      style={{ position: "fixed", inset: 0, background: "var(--overlay)", backdropFilter: "blur(6px)", zIndex: 120, display: "grid", placeItems: "center", padding: 16 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="panel" style={{ maxWidth: 420, width: "100%", position: "relative" }}>
        <button type="button" className="icon-button" aria-label="Close" onClick={onClose} style={{ position: "absolute", top: 12, right: 12 }}>
          <X size={16} />
        </button>
        <div className="eyebrow" style={{ color: "var(--lime)" }}>Members only</div>
        <h2 style={{ fontSize: 22, margin: "10px 0" }}>You need to sign in{action ? ` to ${action}` : ""}.</h2>
        <p className="member-bio" style={{ margin: "0 0 18px" }}>
          The DropOut College is a community of builders. Create a free account with Google to {action || "participate"} and connect with other members.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href={`/login?next=${encodeURIComponent(nextParam)}`} className="button button-primary" onClick={onClose}>
            Continue with Google
          </Link>
          <button type="button" className="button button-ghost" onClick={onClose}>
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
