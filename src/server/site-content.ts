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
    const { data, error } = await supabase.from("site_settings").select("key, value");
    if (error) {
      return { ...defaultSiteSettings };
    }

    const merged = { ...defaultSiteSettings } as SiteSettingsMap;
    for (const row of data ?? []) {
      const key = row.key as SiteSettingKey;
      if (key in defaultSiteSettings) {
        merged[key] = row.value ?? merged[key];
      }
    }
    return merged;
  } catch {
    return { ...defaultSiteSettings };
  }
}

export async function getSiteSections(): Promise<SiteSection[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("site_sections").select("*").order("sort_order", { ascending: true });
    if (error) {
      return [
        { id: "who-we-are", slug: "who-we-are", title: "Who We Are", description: "Learning-focused people building a positive environment for curiosity, guidance, and personal growth.", cta_label: "Learn more", cta_href: "#who-we-are", enabled: true, sort_order: 1, content: { items: ["Curiosity", "Learning", "Knowledge sharing", "Guidance", "Growth"] } },
        { id: "our-aim", slug: "our-aim", title: "Our Aim", description: "We want to create a supportive culture where people genuinely want to learn and improve together.", cta_label: "Explore the community", cta_href: "/explore", enabled: true, sort_order: 2, content: { items: ["Curiosity", "Beginner support", "Resource sharing", "Collaboration", "Growth"] } },
        { id: "our-goal", slug: "our-goal", title: "Our Goal", description: "We want to build a learning ecosystem where everyone can find guidance, resources, and people to learn and collaborate with.", cta_label: "Join the community", cta_href: "https://discord.gg/3xfu5TMgF", enabled: true, sort_order: 3, content: { items: ["Guidance", "Resources", "Collaboration", "Motivation", "Shared learning"] } },
        { id: "community-values", slug: "community-values", title: "Community Values", description: "The culture of The DropOut College is centered on curiosity, learning, and helping one another grow.", cta_label: "Meet the community", cta_href: "/explore", enabled: true, sort_order: 4, content: { cards: ["Curiosity", "Learning", "Sharing", "Helping", "Collaboration", "Growth"] } },
        { id: "why-join", slug: "why-join", title: "Why Join Us", description: "Because learning is more rewarding when it happens together with thoughtful, motivated people.", cta_label: "Join now", cta_href: "https://discord.gg/3xfu5TMgF", enabled: true, sort_order: 5, content: { cards: ["People to learn with", "People to ask questions", "People to share with", "Supportive culture"] } },
      ];
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title ?? "",
      description: row.description ?? "",
      cta_label: row.cta_label ?? "",
      cta_href: row.cta_href ?? "",
      enabled: row.enabled ?? true,
      sort_order: row.sort_order ?? 0,
      content: typeof row.content === "object" && row.content ? row.content : {},
    }));
  } catch {
    return [
      { id: "who-we-are", slug: "who-we-are", title: "Who We Are", description: "Learning-focused people building a positive environment for curiosity, guidance, and personal growth.", cta_label: "Learn more", cta_href: "#who-we-are", enabled: true, sort_order: 1, content: { items: ["Curiosity", "Learning", "Knowledge sharing", "Guidance", "Growth"] } },
      { id: "our-aim", slug: "our-aim", title: "Our Aim", description: "We want to create a supportive culture where people genuinely want to learn and improve together.", cta_label: "Explore the community", cta_href: "/explore", enabled: true, sort_order: 2, content: { items: ["Curiosity", "Beginner support", "Resource sharing", "Collaboration", "Growth"] } },
      { id: "our-goal", slug: "our-goal", title: "Our Goal", description: "We want to build a learning ecosystem where everyone can find guidance, resources, and people to learn and collaborate with.", cta_label: "Join the community", cta_href: "https://discord.gg/3xfu5TMgF", enabled: true, sort_order: 3, content: { items: ["Guidance", "Resources", "Collaboration", "Motivation", "Shared learning"] } },
      { id: "community-values", slug: "community-values", title: "Community Values", description: "The culture of The DropOut College is centered on curiosity, learning, and helping one another grow.", cta_label: "Meet the community", cta_href: "/explore", enabled: true, sort_order: 4, content: { cards: ["Curiosity", "Learning", "Sharing", "Helping", "Collaboration", "Growth"] } },
      { id: "why-join", slug: "why-join", title: "Why Join Us", description: "Because learning is more rewarding when it happens together with thoughtful, motivated people.", cta_label: "Join now", cta_href: "https://discord.gg/3xfu5TMgF", enabled: true, sort_order: 5, content: { cards: ["People to learn with", "People to ask questions", "People to share with", "Supportive culture"] } },
    ];
  }
}

export async function getSiteSocialLinks(): Promise<SocialLink[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("site_social_links").select("*").eq("enabled", true).order("sort_order", { ascending: true });
    if (error) {
      return [
        { id: "discord", platform: "discord", label: "Discord", url: "https://discord.gg/3xfu5TMgF", enabled: true, sort_order: 1 },
        { id: "github", platform: "github", label: "GitHub", url: "", enabled: true, sort_order: 2 },
        { id: "instagram", platform: "instagram", label: "Instagram", url: "", enabled: true, sort_order: 3 },
        { id: "facebook", platform: "facebook", label: "Facebook", url: "", enabled: true, sort_order: 4 },
        { id: "youtube", platform: "youtube", label: "YouTube", url: "", enabled: true, sort_order: 5 },
      ];
    }

    return (data ?? []).filter((item) => item.enabled).map((item) => ({
      id: item.id,
      platform: item.platform,
      label: item.label,
      url: item.url ?? "",
      enabled: item.enabled ?? true,
      sort_order: item.sort_order ?? 0,
    }));
  } catch {
    return [
      { id: "discord", platform: "discord", label: "Discord", url: "https://discord.gg/3xfu5TMgF", enabled: true, sort_order: 1 },
      { id: "github", platform: "github", label: "GitHub", url: "", enabled: true, sort_order: 2 },
      { id: "instagram", platform: "instagram", label: "Instagram", url: "", enabled: true, sort_order: 3 },
      { id: "facebook", platform: "facebook", label: "Facebook", url: "", enabled: true, sort_order: 4 },
      { id: "youtube", platform: "youtube", label: "YouTube", url: "", enabled: true, sort_order: 5 },
    ];
  }
}

export async function upsertSiteSetting(key: SiteSettingKey, value: string) {
  const supabase = await createSupabaseServerClient();
  const payload = { key, value: value ?? "", updated_at: new Date().toISOString() };
  const { error } = await supabase.from("site_settings").upsert(payload, { onConflict: "key" });
  if (error) throw error;
}

export async function upsertSiteSection(section: Partial<SiteSection> & { slug: string }) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("site_sections").upsert({
    id: section.id,
    slug: section.slug,
    title: section.title ?? "",
    description: section.description ?? "",
    cta_label: section.cta_label ?? "",
    cta_href: section.cta_href ?? "",
    enabled: section.enabled ?? true,
    sort_order: section.sort_order ?? 0,
    content: section.content ?? {},
    updated_at: new Date().toISOString(),
  }, { onConflict: "slug" });
  if (error) throw error;
}

export async function upsertSiteSocialLink(link: Partial<SocialLink> & { platform: string; label: string; url: string }) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("site_social_links").upsert({
    id: link.id,
    platform: link.platform,
    label: link.label,
    url: link.url ?? "",
    enabled: link.enabled ?? true,
    sort_order: link.sort_order ?? 0,
    updated_at: new Date().toISOString(),
  }, { onConflict: "platform" });
  if (error) throw error;
}
