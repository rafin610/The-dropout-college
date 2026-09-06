import { requirePermission } from "@/server/auth/permissions";
import { toErrorResponse } from "@/server/errors";
import { defaultSiteSettings, getSiteSections, getSiteSettings, getSiteSocialLinks, upsertSiteSection, upsertSiteSetting, upsertSiteSocialLink, type SiteSettingKey } from "@/server/site-content";

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
    const settings = payload?.settings ?? {};
    const sections = payload?.sections ?? [];
    const socialLinks = payload?.socialLinks ?? [];

    await Promise.all(
      Object.entries(settings).map(([key, value]) => {
        const nextKey = key as string;
        if (!(nextKey in defaultSiteSettings)) return null;
        return upsertSiteSetting(nextKey as SiteSettingKey, String(value ?? ""));
      }),
    );

    await Promise.all(
      sections.map((section: any) =>
        upsertSiteSection({
          id: section.id,
          slug: section.slug,
          title: section.title,
          description: section.description,
          cta_label: section.cta_label,
          cta_href: section.cta_href,
          enabled: section.enabled,
          sort_order: Number(section.sort_order ?? 0),
          content: section.content ?? {},
        }),
      ),
    );

    await Promise.all(
      socialLinks.map((link: any) =>
        upsertSiteSocialLink({
          id: link.id,
          platform: link.platform,
          label: link.label,
          url: link.url ?? "",
          enabled: link.enabled,
          sort_order: Number(link.sort_order ?? 0),
        }),
      ),
    );

    return Response.json({ data: { saved: true }, requestId });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
