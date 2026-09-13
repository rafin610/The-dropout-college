import { requirePermission } from "@/server/auth/permissions";
import { toErrorResponse } from "@/server/errors";
import { getSiteSections, getSiteSettings, getSiteSocialLinks, upsertSiteSection, upsertSiteSocialLink } from "@/server/site-content";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  try {
    await requirePermission("dashboard.read");
    const [settings, sections, socialLinks] = await Promise.all([getSiteSettings(), getSiteSections(), getSiteSocialLinks()]);
    return Response.json({ data: { settings, sections, socialLinks }, requestId });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}

export async function PUT(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  try {
    await requirePermission("dashboard.read");
    const payload = await request.json();
    const settings = (payload?.settings ?? {}) as Record<string, string>;
    const sections = (payload?.sections ?? []) as Array<Record<string, unknown>>;
    const socialLinks = (payload?.socialLinks ?? []) as Array<Record<string, unknown>>;

    const { upsertSiteSettingsBulk } = await import("@/server/site-content");
    await upsertSiteSettingsBulk(settings);

    await Promise.all(
      sections.map((section) =>
        upsertSiteSection({
          id: typeof section.id === "string" ? section.id : undefined,
          slug: String(section.slug || ""),
          title: String(section.title || ""),
          description: String(section.description || ""),
          cta_label: String(section.cta_label || ""),
          cta_href: String(section.cta_href || ""),
          enabled: Boolean(section.enabled ?? true),
          sort_order: Number(section.sort_order ?? 0),
          content: (typeof section.content === "object" && section.content !== null ? section.content : {}) as Record<string, unknown>,
        }),
      ),
    );

    await Promise.all(
      socialLinks.map((link) =>
        upsertSiteSocialLink({
          id: typeof link.id === "string" ? link.id : undefined,
          platform: String(link.platform || ""),
          label: String(link.label || ""),
          url: String(link.url || ""),
          enabled: Boolean(link.enabled ?? true),
          sort_order: Number(link.sort_order ?? 0),
        }),
      ),
    );

    return Response.json({ data: { saved: true }, requestId });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
