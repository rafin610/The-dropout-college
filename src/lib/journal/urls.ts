const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;
const URL_SCHEME = /^([a-z][a-z0-9+.-]*):/i;
const MAX_URL_LENGTH = 2_048;
const MAX_DATA_IMAGE_LENGTH = 8_000_000;

function cleanUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_URL_LENGTH || CONTROL_CHARACTERS.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function normalizeHttpUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.href;
  } catch {
    return null;
  }
}

function isSafeDataImage(value: string): boolean {
  if (value.length > MAX_DATA_IMAGE_LENGTH) return false;
  return /^data:image\/(?:png|jpe?g|gif|webp|avif);base64,[a-z0-9+/=\s]+$/i.test(value);
}

export interface MediaUrlOptions {
  allowDataImage?: boolean;
  allowRelative?: boolean;
}

/**
 * Validates and normalizes a URL used for navigation. Relative URLs are
 * allowed by default so internal links keep working. Dangerous schemes,
 * control characters, and non-web protocols are rejected.
 */
export function sanitizeHref(value: unknown): string | null {
  const raw = cleanUrl(value);
  if (!raw) return null;

  if (raw.startsWith("//") || raw.startsWith("\\\\")) {
    return raw.startsWith("\\\\") ? null : raw;
  }

  const schemeMatch = URL_SCHEME.exec(raw);
  if (!schemeMatch) {
    // A relative URL, fragment, query string, or path. Reject Windows-style
    // paths and values that could be interpreted as a scheme by a browser.
    return raw.startsWith("\\") ? null : raw;
  }

  const scheme = schemeMatch[1].toLowerCase();
  if (scheme === "http" || scheme === "https") {
    return normalizeHttpUrl(raw);
  }
  if (scheme === "mailto" || scheme === "tel") {
    return raw;
  }
  return null;
}

/**
 * Validates and normalizes a URL used by an image, video poster, or other
 * media source. Only web URLs, relative paths, and (optionally) raster data
 * images are allowed. SVG data URLs are intentionally rejected.
 */
export function sanitizeMediaUrl(
  value: unknown,
  { allowDataImage = true, allowRelative = true }: MediaUrlOptions = {},
): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();

  if (raw.toLowerCase().startsWith("data:")) {
    return allowDataImage && isSafeDataImage(raw) ? raw : null;
  }

  const cleaned = cleanUrl(raw);
  if (!cleaned) return null;

  if (cleaned.startsWith("//") || cleaned.startsWith("\\\\")) {
    if (!allowRelative) return null;
    return cleaned.startsWith("\\\\") ? null : cleaned;
  }

  const schemeMatch = URL_SCHEME.exec(cleaned);
  if (!schemeMatch) {
    if (!allowRelative) return null;
    return cleaned.startsWith("\\") ? null : cleaned;
  }

  const scheme = schemeMatch[1].toLowerCase();
  if (scheme !== "http" && scheme !== "https") return null;
  return normalizeHttpUrl(cleaned);
}

/**
 * Cover images are persisted and rendered outside the editor. Keep them to
 * real web URLs or same-origin paths instead of allowing large inline data.
 */
export function sanitizeCoverImageUrl(value: unknown): string | null {
  return sanitizeMediaUrl(value, { allowDataImage: false });
}

export function isSafeTextAlign(value: unknown): value is "left" | "center" | "right" | "justify" {
  return value === "left" || value === "center" || value === "right" || value === "justify";
}
