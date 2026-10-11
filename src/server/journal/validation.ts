import { z } from "zod";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function extractTextFromDoc(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as Record<string, unknown>;
  let text = "";
  if (typeof n.text === "string") {
    text += n.text + " ";
  }
  if (n.attrs && typeof n.attrs === "object") {
    const attrs = n.attrs as Record<string, unknown>;
    if (typeof attrs.latex === "string") text += attrs.latex + " ";
    if (typeof attrs.title === "string") text += attrs.title + " ";
    if (typeof attrs.summary === "string") text += attrs.summary + " ";
  }
  if (Array.isArray(n.content)) {
    for (const child of n.content) {
      text += extractTextFromDoc(child);
    }
  }
  return text;
}

export function calculateReadingTime(docOrText: unknown): number {
  let text = "";
  if (typeof docOrText === "string") {
    text = docOrText;
  } else {
    text = extractTextFromDoc(docOrText);
  }
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  // Average reading speed: 200 words per minute
  return Math.max(1, Math.ceil(words / 200));
}

export const articleSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(3, "Title must be at least 3 characters").max(200, "Title cannot exceed 200 characters"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(120, "Slug cannot exceed 120 characters")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must only contain lowercase alphanumeric characters and hyphens")
    .optional(),
  excerpt: z.string().max(600, "Excerpt cannot exceed 600 characters").optional().nullable(),
  coverImageUrl: z.string().url("Invalid cover image URL").optional().nullable().or(z.literal("")),
  content: z.record(z.string(), z.unknown()).refine((val) => typeof val === "object" && val !== null, "Content must be a structured document"),
  categoryId: z.string().uuid("Invalid category ID").optional().nullable().or(z.literal("")),
  tags: z.array(z.string().min(1).max(30)).max(10).optional().default([]),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  featured: z.boolean().optional().default(false),
  seoTitle: z.string().max(100).optional().nullable(),
  seoDescription: z.string().max(200).optional().nullable(),
});
