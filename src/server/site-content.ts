import { createSupabaseServerClient } from "@/server/supabase/server";

export type SiteSettingKey =
  | "site_name"
  | "site_description"
  | "hero_title"
  | "hero_subtitle"
  | "hero_description"
  | "hero_cta_text"
  | "hero_cta_href"
  | "who_we_are"
  | "our_aim"
  | "our_goal"
  | "footer_text"
  | "community_invite_link"
  | "contact_email"
  | "contact_phone"
  | "discord_link"
  | "github_link"
  | "facebook_link"
  | "instagram_link"
  | "youtube_link";

export type SiteSettingsMap = Partial<Record<SiteSettingKey, string>>;

export const defaultSiteSettings: SiteSettingsMap = {
  site_name: "The DropOut College",
  site_description: "A learning-focused community built around curiosity, knowledge sharing, guidance, collaboration, and personal growth.",
  hero_title: "Make your next move together.",
  hero_subtitle: "A home for the relentlessly curious",
  hero_description: "The DropOut College is a learning-focused community where people come together to learn, ask questions, share ideas, and grow with like-minded people.",
  hero_cta_text: "Join The DropOut College",
  hero_cta_href: "https://discord.gg/3xfu5TMgF",
  who_we_are: "We are creating an environment where people can come together, learn new things, ask questions, share knowledge, help each other, and grow together.",
  our_aim: "To build a positive learning culture where curiosity is encouraged, beginners feel supported, useful knowledge is shared, and members grow through guidance and collaboration.",
  our_goal: "To build a large, supportive ecosystem where anyone with the willingness to learn can find guidance, resources, people to learn with, and opportunities to share and collaborate.",
  footer_text: "The DropOut College is a learning community for curious people who want to grow together through guidance, sharing, and collaboration.",
  community_invite_link: "https://discord.gg/3xfu5TMgF",
  contact_email: "hello@thedropoutcollege.com",
  contact_phone: "+1 (000) 000-0000",
  discord_link: "https://discord.gg/3xfu5TMgF",
  github_link: "",
  facebook_link: "",
  instagram_link: "",
  youtube_link: "",
};

export type SiteSection = {
  id: string;
  slug: string;
  title: string;
  description: string;
  cta_label: string;
  cta_href: string;
  enabled: boolean;
  sort_order: number;
  content: Record<string, unknown>;
};

export type SocialLink = {
  id: string;
  platform: string;
  label: string;
  url: string;
  enabled: boolean;
  sort_order: number;
};

export async function getSiteSettings(): Promise<SiteSettingsMap> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("site_settings").select("*").limit(20);
    if (error || !data || data.length === 0) {
      return { ...defaultSiteSettings };
    }

    const merged = { ...defaultSiteSettings } as SiteSettingsMap;

    // Check if table is structured (single row with column names)
    const firstRow = data[0] as Record<string, unknown>;
    if ("site_name" in firstRow || "community_invite_link" in firstRow) {
      if (typeof firstRow.site_name === "string" && firstRow.site_name) merged.site_name = firstRow.site_name;
      if (typeof firstRow.site_description === "string" && firstRow.site_description) merged.site_description = firstRow.site_description;
      if (typeof firstRow.community_invite_link === "string" && firstRow.community_invite_link) {
        merged.community_invite_link = firstRow.community_invite_link;
        merged.discord_link = firstRow.community_invite_link;
        merged.hero_cta_href = firstRow.community_invite_link;
      }
      if (typeof firstRow.contact_email === "string" && firstRow.contact_email) merged.contact_email = firstRow.contact_email;
      if (typeof firstRow.footer_description === "string" && firstRow.footer_description) merged.footer_text = firstRow.footer_description;
      if (typeof firstRow.seo_title === "string" && firstRow.seo_title) merged.hero_title = firstRow.seo_title;
      if (typeof firstRow.seo_description === "string" && firstRow.seo_description) merged.hero_description = firstRow.seo_description;
    }

    // Check if table is key-value format
    for (const row of data as Array<Record<string, unknown>>) {
      if (typeof row.key === "string" && row.key in defaultSiteSettings && typeof row.value === "string") {
        merged[row.key as SiteSettingKey] = row.value;
      }
    }

    return merged;
  } catch {
    return { ...defaultSiteSettings };
  }
}

export async function getSiteSections(): Promise<SiteSection[]> {
  const fallbackSections: SiteSection[] = [
    { id: "who-we-are", slug: "who-we-are", title: "Who We Are", description: "Learning-focused people building a positive environment for curiosity, guidance, and personal growth.", cta_label: "Learn more", cta_href: "#who-we-are", enabled: true, sort_order: 1, content: { items: ["Curiosity", "Learning", "Knowledge sharing", "Guidance", "Growth"] } },
    { id: "our-aim", slug: "our-aim", title: "Our Aim", description: "We want to create a supportive culture where people genuinely want to learn and improve together.", cta_label: "Explore the community", cta_href: "/explore", enabled: true, sort_order: 2, content: { items: ["Curiosity", "Beginner support", "Resource sharing", "Collaboration", "Growth"] } },
    { id: "our-goal", slug: "our-goal", title: "Our Goal", description: "We want to build a learning ecosystem where everyone can find guidance, resources, and people to learn and collaborate with.", cta_label: "Join the community", cta_href: "https://discord.gg/3xfu5TMgF", enabled: true, sort_order: 3, content: { items: ["Guidance", "Resources", "Collaboration", "Motivation", "Shared learning"] } },
    { id: "community-values", slug: "community-values", title: "Community Values", description: "The culture of The DropOut College is centered on curiosity, learning, and helping one another grow.", cta_label: "Meet the community", cta_href: "/explore", enabled: true, sort_order: 4, content: { cards: ["Curiosity", "Learning", "Sharing", "Helping", "Collaboration", "Growth"] } },
    { id: "why-join", slug: "why-join", title: "Why Join Us", description: "Because learning is more rewarding when it happens together with thoughtful, motivated people.", cta_label: "Join now", cta_href: "https://discord.gg/3xfu5TMgF", enabled: true, sort_order: 5, content: { cards: ["People to learn with", "People to ask questions", "People to share with", "Supportive culture"] } },
  ];

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("site_sections").select("*");
    if (error || !data || data.length === 0) {
      return fallbackSections;
    }

    return (data as Array<Record<string, unknown>>).map((row) => {
      const config = (typeof row.config === "object" && row.config !== null ? row.config : typeof row.content === "object" && row.content !== null ? row.content : {}) as Record<string, unknown>;
      const slug = String(row.slug || row.key || row.section_key || row.id || "");
      const title = String(row.title || "");
      const isEnabled = typeof row.is_enabled === "boolean" ? row.is_enabled : typeof row.enabled === "boolean" ? row.enabled : true;
      const sortOrder = Number(row.sort_order ?? row.display_order ?? 0);
      const description = String(row.description || config.description || "");
      const ctaLabel = String(row.cta_label || config.cta_label || "");
      const ctaHref = String(row.cta_href || config.cta_href || "");

      return {
        id: String(row.id || slug),
        slug,
        title,
        description,
        cta_label: ctaLabel,
        cta_href: ctaHref,
        enabled: isEnabled,
        sort_order: sortOrder,
        content: config,
      };
    }).sort((a, b) => a.sort_order - b.sort_order);
  } catch {
    return fallbackSections;
  }
}

export async function getSiteSocialLinks(): Promise<SocialLink[]> {
  const fallbackSocial: SocialLink[] = [
    { id: "discord", platform: "discord", label: "Discord", url: "https://discord.gg/3xfu5TMgF", enabled: true, sort_order: 1 },
    { id: "github", platform: "github", label: "GitHub", url: "", enabled: true, sort_order: 2 },
    { id: "instagram", platform: "instagram", label: "Instagram", url: "", enabled: true, sort_order: 3 },
    { id: "facebook", platform: "facebook", label: "Facebook", url: "", enabled: true, sort_order: 4 },
    { id: "youtube", platform: "youtube", label: "YouTube", url: "", enabled: true, sort_order: 5 },
  ];

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("site_social_links").select("*");
    if (error || !data || data.length === 0) {
      return fallbackSocial;
    }

    return (data as Array<Record<string, unknown>>)
      .map((item) => {
        const platform = String(item.platform || "");
        const label = String(item.label || (platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : "Link"));
        const url = String(item.url || "");
        const enabled = typeof item.is_active === "boolean" ? item.is_active : typeof item.is_visible === "boolean" ? item.is_visible : typeof item.enabled === "boolean" ? item.enabled : true;
        const sortOrder = Number(item.sort_order ?? item.display_order ?? 0);

        return {
          id: String(item.id || platform),
          platform,
          label,
          url,
          enabled,
          sort_order: sortOrder,
        };
      })
      .filter((item) => item.enabled)
      .sort((a, b) => a.sort_order - b.sort_order);
  } catch {
    return fallbackSocial;
  }
}

export async function upsertSiteSettingsBulk(settings: Record<string, string>) {
  const supabase = await createSupabaseServerClient();

  // Try updating the structured row if it exists
  const { data: existingRows } = await supabase.from("site_settings").select("id").limit(1);
  if (existingRows && existingRows.length > 0) {
    const targetId = existingRows[0].id;
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (settings.site_name) updatePayload.site_name = settings.site_name;
    if (settings.site_description) updatePayload.site_description = settings.site_description;
    if (settings.community_invite_link || settings.discord_link) {
      updatePayload.community_invite_link = settings.community_invite_link || settings.discord_link;
    }
    if (settings.contact_email) updatePayload.contact_email = settings.contact_email;
    if (settings.footer_text) updatePayload.footer_description = settings.footer_text;
    if (settings.hero_title) updatePayload.seo_title = settings.hero_title;
    if (settings.hero_description) updatePayload.seo_description = settings.hero_description;

    const { error: updateError } = await supabase.from("site_settings").update(updatePayload).eq("id", targetId);
    if (!updateError) return;
  }

  // Fallback: try key-value updates
  for (const [key, value] of Object.entries(settings)) {
    await supabase.from("site_settings").upsert({ key, value: String(value ?? ""), updated_at: new Date().toISOString() }, { onConflict: "key" });
  }
}

export async function upsertSiteSetting(key: SiteSettingKey, value: string) {
  await upsertSiteSettingsBulk({ [key]: value });
}

export async function upsertSiteSection(section: Partial<SiteSection> & { slug: string }) {
  const supabase = await createSupabaseServerClient();
  const slug = section.slug;

  // Try updating matching key/section_key
  const payload: Record<string, unknown> = {
    title: section.title ?? "",
    is_enabled: section.enabled ?? true,
    sort_order: Number(section.sort_order ?? 0),
    config: section.content ?? {},
    updated_at: new Date().toISOString(),
  };

  if (section.id) {
    const { error } = await supabase.from("site_sections").update(payload).eq("id", section.id);
    if (!error) return;
  }

  // Try update by key
  const { error: keyError } = await supabase.from("site_sections").update(payload).eq("key", slug);
  if (!keyError) return;

  // Fallback to slug upsert
  await supabase.from("site_sections").upsert({
    id: section.id,
    slug,
    ...payload,
  }, { onConflict: "slug" });
}

export async function upsertSiteSocialLink(link: Partial<SocialLink> & { platform: string; label: string; url: string }) {
  const supabase = await createSupabaseServerClient();
  const payload = {
    platform: link.platform,
    url: link.url ?? "",
    is_active: link.enabled ?? true,
    sort_order: Number(link.sort_order ?? 0),
    updated_at: new Date().toISOString(),
  };

  if (link.id) {
    const { error } = await supabase.from("site_social_links").update(payload).eq("id", link.id);
    if (!error) return;
  }

  await supabase.from("site_social_links").upsert(payload, { onConflict: "platform" });
}
