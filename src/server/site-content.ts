import { createSupabaseServerClient } from "@/server/supabase/server";

export {
  defaultAnnouncements,
  defaultFounders,
  defaultHomepageSections,
  defaultSiteSettings,
  type Announcement,
  type FounderProfile,
  type SiteSection,
  type SiteSettingKey,
  type SiteSettingsMap,
  type SocialLink,
} from "@/lib/site-cms-types";

import {
  defaultAnnouncements,
  defaultFounders,
  defaultHomepageSections,
  defaultSiteSettings,
  type Announcement,
  type FounderProfile,
  type SiteSection,
  type SiteSettingKey,
  type SiteSettingsMap,
  type SocialLink,
} from "@/lib/site-cms-types";

export async function getSiteSettings(): Promise<SiteSettingsMap> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("site_settings").select("*").limit(1);
  if (error || !data || data.length === 0) {
    return { ...defaultSiteSettings };
  }

  const row = data[0] as Record<string, unknown>;
  const settings: SiteSettingsMap = { ...defaultSiteSettings };

  for (const [k, v] of Object.entries(row)) {
    if (k in defaultSiteSettings && typeof v === "string" && v) {
      settings[k as SiteSettingKey] = v;
    }
  }
  if (typeof row.footer_description === "string" && row.footer_description) {
    settings.footer_text = row.footer_description;
  }
  return settings;
}

export async function getSiteSections(): Promise<SiteSection[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("site_sections")
    .select("id, key, slug, title, description, cta_label, cta_href, is_enabled, enabled, sort_order, config, content")
    .order("sort_order");
  if (error || !data || data.length === 0) return defaultHomepageSections;

  return data.map((row) => ({
    id: row.id,
    slug: row.slug || row.key,
    title: row.title || "",
    description: row.description || "",
    cta_label: row.cta_label || "",
    cta_href: row.cta_href || "",
    enabled: typeof row.enabled === "boolean" ? row.enabled : typeof row.is_enabled === "boolean" ? row.is_enabled : true,
    sort_order: row.sort_order ?? 0,
    content: (typeof row.content === "object" && row.content !== null ? row.content : typeof row.config === "object" && row.config !== null ? row.config : {}) as Record<string, unknown>,
  }));
}

export async function getSiteSocialLinks(): Promise<SocialLink[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("site_social_links")
    .select("id, platform, label, url, is_active, enabled, sort_order")
    .order("sort_order");
  if (error || !data || data.length === 0) return [];

  return data.map((item) => ({
    id: item.id,
    platform: item.platform,
    label: item.label || (item.platform ? item.platform.charAt(0).toUpperCase() + item.platform.slice(1) : "Link"),
    url: item.url || "",
    enabled: typeof item.enabled === "boolean" ? item.enabled : typeof item.is_active === "boolean" ? item.is_active : true,
    sort_order: item.sort_order ?? 0,
  }));
}

export async function saveSiteContent(input: {
  settings: Record<string, string>;
  sections: SiteSection[];
  socialLinks: SocialLink[];
  announcements?: Announcement[];
  founders?: FounderProfile[];
}) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("save_site_cms", {
    p_settings: input.settings,
    p_sections: input.sections.map(({ slug, title, description, cta_label, cta_href, enabled, sort_order, content }) => ({
      slug,
      title,
      description,
      cta_label,
      cta_href,
      enabled,
      sort_order,
      content: content ?? {},
    })),
    p_social_links: input.socialLinks.map(({ platform, label, url, enabled, sort_order }) => ({
      platform,
      label,
      url,
      enabled,
      sort_order,
    })),
    p_announcements: input.announcements ?? null,
    p_founders: input.founders ?? null,
  });
  if (error) throw error;
}

export async function getAnnouncements(): Promise<Announcement[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("site_sections")
    .select("content, config")
    .or("slug.eq.community-noticeboard,key.eq.community-noticeboard")
    .maybeSingle();
  if (error) throw error;

  const contentObj = (typeof data?.content === "object" && data.content !== null ? data.content : typeof data?.config === "object" && data.config !== null ? data.config : {}) as Record<string, unknown>;
  const announcements = contentObj.announcements;
  return Array.isArray(announcements) && announcements.length > 0
    ? (announcements as Announcement[])
    : defaultAnnouncements;
}

export async function getFounders(): Promise<FounderProfile[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("site_sections")
    .select("content, config")
    .or("slug.eq.founders,key.eq.founders")
    .maybeSingle();
  if (error) throw error;

  const contentObj = (typeof data?.content === "object" && data.content !== null ? data.content : typeof data?.config === "object" && data.config !== null ? data.config : {}) as Record<string, unknown>;
  const founders = contentObj.founders;
  return Array.isArray(founders) && founders.length > 0
    ? (founders as FounderProfile[]).sort((a, b) => a.sortOrder - b.sortOrder)
    : defaultFounders;
}
