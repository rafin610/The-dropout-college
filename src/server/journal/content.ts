import {
  isSafeTextAlign,
  sanitizeCoverImageUrl,
  sanitizeHref,
  sanitizeMediaUrl,
} from "@/lib/journal/urls";

type JsonRecord = Record<string, unknown>;

const MAX_NODES = 20_000;
const MAX_DEPTH = 80;
const MAX_TEXT_LENGTH = 2_000_000;
const MAX_ATTRIBUTE_DEPTH = 6;
const MAX_ATTRIBUTE_ARRAY_LENGTH = 100;
const UNSAFE_NODE_TYPES = new Set([
  "audio",
  "button",
  "embed",
  "form",
  "html",
  "iframe",
  "input",
  "math",
  "object",
  "script",
  "select",
  "source",
  "style",
  "svg",
  "textarea",
  "video",
]);
const ALLOWED_NODE_TYPES = new Set([
  "blockquote",
  "bulletList",
  "callout",
  "codeBlock",
  "details",
  "doc",
  "equation",
  "hardBreak",
  "heading",
  "horizontalRule",
  "image",
  "imageBlock",
  "inlineEquation",
  "listItem",
  "orderedList",
  "paragraph",
  "table",
  "tableCell",
  "tableHeader",
  "tableRow",
  "text",
  "videoEmbed",
]);
const ALLOWED_MARK_TYPES = new Set([
  "bold",
  "code",
  "italic",
  "link",
  "strike",
  "underline",
]);
const CALLOUT_VARIANTS = new Set([
  "info",
  "important",
  "tip",
  "warning",
  "success",
  "definition",
  "example",
]);
const URL_ATTRIBUTES = new Set([
  "cover",
  "coverimageurl",
  "href",
  "poster",
  "src",
  "url",
]);
const SAFE_LANGUAGES = /^[a-z0-9+#._-]{0,40}$/i;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function emptyDoc(): JsonRecord {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

function cloneAttributeValue(value: unknown, depth = 0): unknown {
  if (depth > MAX_ATTRIBUTE_DEPTH) return null;
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ATTRIBUTE_ARRAY_LENGTH)
      .map((entry) => cloneAttributeValue(entry, depth + 1));
  }
  if (isRecord(value)) {
    const cloned: JsonRecord = {};
    for (const [key, entry] of Object.entries(value)) {
      if (key === "__proto__" || key === "prototype" || key === "constructor") continue;
      cloned[key] = cloneAttributeValue(entry, depth + 1);
    }
    return cloned;
  }
  return null;
}

function sanitizeAttributes(type: string, attrs: JsonRecord): JsonRecord {
  const sanitized: JsonRecord = {};

  for (const [rawKey, value] of Object.entries(attrs)) {
    if (!/^[a-z0-9_-]+$/i.test(rawKey)) continue;
    const key = rawKey;
    const lowerKey = rawKey.toLowerCase();

    if (lowerKey.startsWith("on") || lowerKey === "style") continue;
    if (lowerKey === "href") {
      const href = sanitizeHref(value);
      if (href) sanitized[key] = href;
      continue;
    }
    if (URL_ATTRIBUTES.has(lowerKey)) {
      const url = sanitizeMediaUrl(value);
      if (url) sanitized[key] = url;
      continue;
    }
    if (lowerKey === "textalign") {
      if (isSafeTextAlign(value)) sanitized[key] = value;
      continue;
    }
    if (lowerKey === "level" && type === "heading") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) sanitized[key] = Math.min(3, Math.max(1, Math.round(parsed)));
      continue;
    }
    if (lowerKey === "variant" && type === "callout") {
      sanitized[key] = typeof value === "string" && CALLOUT_VARIANTS.has(value) ? value : "info";
      continue;
    }
    if (lowerKey === "language") {
      sanitized[key] = typeof value === "string" && SAFE_LANGUAGES.test(value) ? value : null;
      continue;
    }
    if (lowerKey === "colspan" || lowerKey === "rowspan") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) sanitized[key] = Math.min(100, Math.max(1, Math.round(parsed)));
      continue;
    }
    if (lowerKey === "colwidth") {
      if (Array.isArray(value)) {
        sanitized[key] = value
          .filter((entry): entry is number => typeof entry === "number" && Number.isFinite(entry) && entry > 0)
          .slice(0, 20);
      } else {
        sanitized[key] = null;
      }
      continue;
    }
    if (lowerKey === "displaymode" || lowerKey === "linenumbers") {
      sanitized[key] = Boolean(value);
      continue;
    }

    const cloned = cloneAttributeValue(value);
    if (cloned !== null) sanitized[key] = cloned;
  }

  return sanitized;
}

function sanitizeMarks(value: unknown): JsonRecord[] {
  if (!Array.isArray(value)) return [];
  const marks: JsonRecord[] = [];

  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.type !== "string" || !entry.type.trim()) continue;
    const markType = entry.type.trim();
    if (!ALLOWED_MARK_TYPES.has(markType)) continue;
    const mark: JsonRecord = { type: markType };

    if (markType === "link") {
      const href = isRecord(entry.attrs) ? sanitizeHref(entry.attrs.href) : null;
      if (!href) continue;
      mark.attrs = { href };
    } else if (isRecord(entry.attrs)) {
      const attrs = sanitizeAttributes(markType, entry.attrs);
      if (Object.keys(attrs).length > 0) mark.attrs = attrs;
    }

    marks.push(mark);
  }

  return marks;
}

interface SanitizeState {
  nodes: number;
  textLength: number;
}

function sanitizeNode(
  value: unknown,
  depth: number,
  state: SanitizeState,
): JsonRecord | null {
  if (!isRecord(value)) return null;
  if (depth > MAX_DEPTH || state.nodes >= MAX_NODES) return null;
  state.nodes += 1;

  const type = typeof value.type === "string" ? value.type.trim() : "";
  if (!type || UNSAFE_NODE_TYPES.has(type.toLowerCase())) return null;
  if (!ALLOWED_NODE_TYPES.has(type)) return null;

  const node: JsonRecord = { type };

  if (isRecord(value.attrs)) {
    const attrs = sanitizeAttributes(type, value.attrs);
    if (Object.keys(attrs).length > 0) node.attrs = attrs;
  }

  if (typeof value.text === "string") {
    if (!value.text) return null;
    const remaining = MAX_TEXT_LENGTH - state.textLength;
    if (remaining <= 0) return null;
    const text = value.text.slice(0, remaining);
    state.textLength += text.length;
    node.text = text;
    if (Array.isArray(value.marks)) {
      const marks = sanitizeMarks(value.marks);
      if (marks.length > 0) node.marks = marks;
    }
    return node;
  }

  if (Array.isArray(value.content)) {
    const content = value.content
      .map((child) => sanitizeNode(child, depth + 1, state))
      .filter((child): child is JsonRecord => child !== null);
    if (content.length > 0) node.content = content;
  }

  if (type === "image" || type === "imageBlock" || type === "videoEmbed") {
    const attrs = isRecord(node.attrs) ? node.attrs : null;
    if (!attrs || typeof attrs.src !== "string") return null;
  }

  return node;
}

/**
 * Converts legacy plain text into a structured TipTap document. This is only
 * used when stored content is a string; it never interprets the string as HTML.
 */
export function plainTextToArticleDoc(text: string): JsonRecord {
  const normalized = text.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return emptyDoc();

  const paragraphs = normalized.split(/\n{2,}/).map((paragraph) => {
    const lines = paragraph.split("\n").map((line) => line.trimEnd());
    const content: JsonRecord[] = [];

    lines.forEach((line, index) => {
      if (index > 0) content.push({ type: "hardBreak" });
      if (line) content.push({ type: "text", text: line });
    });

    return content.length > 0
      ? { type: "paragraph", content }
      : { type: "paragraph" };
  });

  return { type: "doc", content: paragraphs };
}

function isInlineNode(node: JsonRecord): boolean {
  return node.type === "text" || node.type === "hardBreak" || node.type === "inlineEquation";
}

/**
 * Normalizes persisted article content before it is rendered or saved.
 *
 * This keeps existing structured content compatible while ensuring every
 * link/media URL is safe and node/attribute values stay within JSON limits.
 */
export function normalizeArticleContent(input: unknown): JsonRecord {
  if (typeof input === "string") return plainTextToArticleDoc(input);
  if (Array.isArray(input)) {
    const state: SanitizeState = { nodes: 0, textLength: 0 };
    const content = input
      .map((node) => sanitizeNode(node, 0, state))
      .filter((node): node is JsonRecord => node !== null);
    return { type: "doc", content: content.length > 0 ? content : [{ type: "paragraph" }] };
  }
  if (!isRecord(input)) return emptyDoc();

  if (input.type !== "doc") {
    const state: SanitizeState = { nodes: 0, textLength: 0 };
    const node = sanitizeNode(input, 0, state);
    if (!node) return emptyDoc();
    const content = isInlineNode(node)
      ? [{ type: "paragraph", content: [node] }]
      : [node];
    return { type: "doc", content };
  }

  const state: SanitizeState = { nodes: 0, textLength: 0 };
  const rawContent = Array.isArray(input.content) ? input.content : [];
  const content = rawContent
    .map((node) => sanitizeNode(node, 0, state))
    .filter((node): node is JsonRecord => node !== null)
    .map((node) => (isInlineNode(node) ? { type: "paragraph", content: [node] } : node));

  return { type: "doc", content: content.length > 0 ? content : [{ type: "paragraph" }] };
}

export function getSafeCoverImageUrl(value: unknown): string | null {
  return sanitizeCoverImageUrl(value);
}
