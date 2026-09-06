import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ddgklwyjvttjcclanism.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_WF4kNvDBQFyVkbP6Igf_wQ_WA-bYeLN";

  return createBrowserClient(url, key);
}