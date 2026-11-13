"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

export function ShareButton({ path, title }: { path: string; title?: string }) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleShare() {
    if (busy) return;
    const url = `${window.location.origin}${path}`;
    setBusy(true);
    try {
      if (navigator.share) {
        await navigator.share({ title: title || "The DropOut College", url });
        return;
      }
      await copyText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Native share cancellation is not an error worth reporting.
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className="c-action-btn"
      onClick={handleShare}
      disabled={busy}
      aria-label={copied ? "Post link copied" : "Share post"}
      title={copied ? "Link copied" : "Share post"}
    >
      {copied ? <Check size={16} /> : <Share2 size={16} />}
      <span>{copied ? "Copied" : "Share"}</span>
    </button>
  );
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  document.execCommand("copy");
  document.body.removeChild(field);
}
