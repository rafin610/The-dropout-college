"use client";

import { ImagePlus, Loader2, Send, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { compressImage, validateImageSize } from "@/lib/compress-image";
import type { Post } from "@/server/posts/posts";

const LIMIT = 300;

export function PostComposer({
  viewer,
  onCreated,
  compact = false,
}: {
  viewer: { id: string; displayName: string; avatarUrl: string | null };
  onCreated?: (post: Post) => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const tooLong = content.length > LIMIT;
  const nearLimit = content.length >= LIMIT - 30;
  const canPublish = content.trim().length > 0 && !tooLong && !publishing;

  function chooseFile(next: File | null) {
    setError("");
    if (!next) {
      setFile(null);
      return;
    }
    const sizeError = validateImageSize(next);
    if (sizeError) {
      setError(sizeError);
      setFile(null);
      return;
    }
    setFile(next);
  }

  async function publish() {
    if (!canPublish) return;
    setError("");
    setPublishing(true);

    try {
      let imageUrl: string | null = null;
      if (file) {
        const sizeError = validateImageSize(file);
        if (sizeError) throw new Error(sizeError);

        const optimized = await compressImage(file);
        const optimizedError = validateImageSize(optimized);
        if (optimizedError) throw new Error(optimizedError);

        const body = new FormData();
        body.append("file", optimized);
        const upload = await fetch("/api/v1/posts/upload", { method: "POST", body });
        const uploaded = (await upload.json().catch(() => null)) as
          | { data?: { url?: string }; error?: { message?: string } }
          | null;
        if (!upload.ok || !uploaded?.data?.url) {
          throw new Error(uploaded?.error?.message || "The photo could not be uploaded.");
        }
        imageUrl = uploaded.data.url;
      }

      const response = await fetch("/api/v1/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), imageUrl }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { data?: Post; error?: { message?: string } }
        | null;

      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error?.message || "Your post could not be published.");
      }

      setContent("");
      setFile(null);
      if (onCreated) {
        onCreated(payload.data);
      } else {
        router.push(`/p/${payload.data.id}`);
      }
      router.refresh();
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Your post could not be published.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <section className={`c-composer${compact ? " c-composer-compact" : ""}`} aria-label="Create a post">
      <div className="c-composer-top">
        <Avatar src={viewer.avatarUrl} name={viewer.displayName} size={compact ? 36 : 40} />
        <div className="c-composer-copy">
          {!compact && (
            <div className="c-composer-heading">
              <p className="c-composer-label">Share a thought</p>
              <p className="c-composer-hint">A short note for the community. One photo if it helps.</p>
            </div>
          )}

          <textarea
            className={`c-textarea${tooLong ? " over-limit" : ""}`}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={compact ? "What are you thinking about?" : "Say it plainly…"}
            aria-label="Post text"
            aria-describedby="post-composer-count"
            rows={compact ? 3 : 5}
            spellCheck
          />

          {preview && (
            <div className="c-image-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Selected post" />
              <button
                type="button"
                className="c-image-remove"
                onClick={() => setFile(null)}
                aria-label="Remove selected image"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {error && <p className="c-error" role="alert">{error}</p>}

          <div className="c-composer-foot">
            <div className="c-actions-row">
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="c-file-input"
                onChange={(event) => {
                  chooseFile(event.target.files?.[0] ?? null);
                  event.target.value = "";
                }}
              />
              <button
                type="button"
                className="c-button c-composer-photo"
                onClick={() => inputRef.current?.click()}
                disabled={publishing}
              >
                <ImagePlus size={15} />
                <span>{file ? "Change photo" : "Add photo"}</span>
              </button>
              <span
                id="post-composer-count"
                className={`c-counter${tooLong ? " warn" : nearLimit ? " near" : ""}`}
                aria-live="polite"
              >
                {content.length}/{LIMIT}
              </span>
            </div>

            <button
              type="button"
              className="c-button c-button-primary c-publish-button"
              onClick={() => void publish()}
              disabled={!canPublish}
            >
              {publishing ? <Loader2 size={15} className="spin" /> : <Send size={15} />}
              <span>{publishing ? "Publishing…" : "Publish"}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
