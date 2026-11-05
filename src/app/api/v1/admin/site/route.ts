import { z } from "zod";
import { requirePermission } from "@/server/auth/permissions";
import { ApiError, toErrorResponse } from "@/server/errors";
import {
  getAnnouncements,
  getFounders,
  getSiteSections,
  getSiteSettings,
  getSiteSocialLinks,
  saveSiteContent,
} from "@/server/site-content";

export const runtime = "nodejs";

const siteSettingKeys = new Set([
  "site_name", "site_description", "hero_title", "hero_subtitle",
  "hero_description", "hero_badge_text", "hero_primary_cta_label",
  "hero_primary_cta_href", "hero_secondary_cta_label",
  "hero_secondary_cta_href", "hero_cta_text", "hero_cta_href",
  "who_we_are", "our_aim", "our_goal", "our_story", "our_vision",
  "our_mission", "our_philosophy", "footer_text", "community_invite_link",
  "contact_email", "contact_phone", "discord_link", "github_link",
  "facebook_link", "instagram_link", "youtube_link",
]);
const siteUrlKeys = new Set([
  "hero_primary_cta_href", "hero_secondary_cta_href", "hero_cta_href",
  "community_invite_link", "discord_link", "github_link", "facebook_link",
  "instagram_link", "youtube_link",
]);

function isSafeHref(value: string) {
  return (
    value === "" ||
    /^https?:\/\//i.test(value) ||
    (value.startsWith("/") && !value.startsWith("//")) ||
    value.startsWith("#")
  );
}

const safeHrefSchema = z.string().max(2048).refine(isSafeHref, "Use an HTTP(S) URL or an application path.");
const sitePayloadSchema = z.object({
  settings: z.record(z.string(), z.string().max(5000)).default({}).superRefine((settings, context) => {
    for (const [key, value] of Object.entries(settings)) {
      if (!siteSettingKeys.has(key)) {
        context.addIssue({ code: "custom", path: [key], message: "Unknown site setting." });
      } else if (siteUrlKeys.has(key) && !isSafeHref(value)) {
        context.addIssue({ code: "custom", path: [key], message: "Use an HTTP(S) URL or an application path." });
      } else if (key === "contact_email" && value && !z.email().safeParse(value).success) {
        context.addIssue({ code: "custom", path: [key], message: "Enter a valid email address." });
      }
    }
  }),
  sections: z.array(z.object({
    slug: z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().max(200),
    description: z.string().max(3000),
    cta_label: z.string().max(120),
    cta_href: safeHrefSchema,
    enabled: z.boolean(),
    sort_order: z.number().int().min(0).max(10000),
    content: z.record(z.string(), z.unknown()).default({}),
  })).max(100).default([]),
  socialLinks: z.array(z.object({
    platform: z.string().trim().min(1).max(60).regex(/^[a-z0-9-]+$/),
    label: z.string().trim().min(1).max(120),
    url: safeHrefSchema,
    enabled: z.boolean(),
    sort_order: z.number().int().min(0).max(10000),
  })).max(100).default([]),
  announcements: z.array(z.object({
    id: z.string().min(1).max(100),
    title: z.string().trim().min(1).max(200),
    content: z.string().max(5000),
    type: z.enum(["news", "event", "challenge", "update"]),
    date: z.string().max(100),
    linkText: z.string().max(120).optional(),
    linkUrl: safeHrefSchema.optional(),
    published: z.boolean(),
  })).max(100).optional(),
  founders: z.array(z.object({
    id: z.string().min(1).max(100),
    name: z.string().trim().min(1).max(120),
    role: z.string().max(120),
    tagline: z.string().max(200),
    location: z.string().max(120),
    portraitUrl: safeHrefSchema,
    bio: z.string().max(5000),
    quote: z.string().max(2000),
    portfolioUrl: safeHrefSchema,
    githubUrl: safeHrefSchema,
    skills: z.array(z.string().max(100)).max(100),
    journey: z.array(z.object({
      period: z.string().max(100),
      title: z.string().max(200),
      description: z.string().max(2000),
    })).max(100),
    projects: z.array(z.object({
      name: z.string().max(160),
      description: z.string().max(2000),
      tags: z.array(z.string().max(100)).max(50),
      link: safeHrefSchema.optional(),
    })).max(100),
    socialLinks: z.array(z.object({
      platform: z.string().max(60),
      label: z.string().max(120),
      url: safeHrefSchema,
    })).max(100).optional(),
    sortOrder: z.number().int().min(0).max(10000),
    visible: z.boolean(),
  })).max(100).optional(),
});

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  try {
    await requirePermission("dashboard.read");
    const [settings, sections, socialLinks, announcements, founders] = await Promise.all([
      getSiteSettings(),
      getSiteSections(),
      getSiteSocialLinks(),
      getAnnouncements(),
      getFounders(),
    ]);
    return Response.json({ data: { settings, sections, socialLinks, announcements, founders }, requestId });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}

export async function PUT(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  try {
    await requirePermission("site.manage");
    const parsed = sitePayloadSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Website content is invalid.", 400);
    }

    await saveSiteContent(parsed.data);
    return Response.json({ data: { saved: true }, requestId });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
