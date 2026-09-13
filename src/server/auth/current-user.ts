import { createSupabaseServerClient } from "@/server/supabase/server";
import { ApiError } from "@/server/errors";
import type { User } from "@supabase/supabase-js";

export async function getCurrentUser(): Promise<User> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    throw new ApiError("UNAUTHENTICATED", "You must be signed in.", 401);
  }

  return data.user;
}

export async function getOptionalUser(): Promise<User | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    return data?.user ?? null;
  } catch {
    return null;
  }
}

export async function ensureUserProfile(user: User) {
  try {
    const supabase = await createSupabaseServerClient();

    // 1. Ensure record in public.users if table exists
    try {
      await supabase.from("users").upsert({
        id: user.id,
        email: user.email ?? `${user.id}@community.local`,
        account_status: "active",
        onboarding_completed: false,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });
    } catch {
      // If table is managed differently or RLS forbids, proceed to profiles
    }

    // 2. Check if profile already exists
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!existingProfile) {
      const emailPrefix = (user.email?.split("@")[0] || "member").replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
      const randomSuffix = user.id.slice(0, 4);
      const username = `${emailPrefix}_${randomSuffix}`;
      const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Community Member";
      const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

      await supabase.from("profiles").upsert({
        id: user.id,
        username,
        display_name: displayName,
        avatar_url: avatarUrl,
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });
    }
  } catch (err) {
    console.error("Failed to ensure user profile:", err);
  }
}