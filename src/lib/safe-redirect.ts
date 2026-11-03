export const DEFAULT_REDIRECT_PATH = "/dashboard";

const INVALID_RAW_CHARACTERS = /[\u0000-\u001f\u007f\\]/;
const INVALID_ENCODED_CHARACTERS = /%(?:0[0-9a-f]|1[0-9a-f]|7f|2f|5c)/i;

/**
 * Accept only same-origin, absolute application paths.
 *
 * A leading slash alone is not enough: `new URL("/\\evil.example", origin)`
 * resolves to a different origin, and path normalisation can turn inputs such
 * as `/..//evil.example` into a protocol-relative path. Reject raw and encoded
 * path separators, control characters, and anything that changes origin.
 */
export function safeRedirectPath(
  value: unknown,
  fallback: string = DEFAULT_REDIRECT_PATH,
): string {
  if (typeof value !== "string" || value.length === 0) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (INVALID_RAW_CHARACTERS.test(value)) return fallback;
  if (INVALID_ENCODED_CHARACTERS.test(value)) return fallback;

  try {
    const base = new URL("https://redirect.invalid");
    const parsed = new URL(value, base);

    if (parsed.origin !== base.origin) return fallback;
    if (!parsed.pathname.startsWith("/") || parsed.pathname.startsWith("//")) {
      return fallback;
    }
    if (INVALID_ENCODED_CHARACTERS.test(parsed.pathname)) return fallback;

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
