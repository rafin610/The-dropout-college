import { createSupabaseServerClient, createSupabaseAdminClient } from "@/server/supabase/server";
import { ApiError } from "@/server/errors";
import { isActiveAccountStatus } from "@/server/auth/account-status";
import type { User } from "@supabase/supabase-js";

function isMissingAccountTable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    Boolean(error.message?.includes("does not exist"))
  );
}

/**
 * Read the account status without trusting client-provided state.
 *
 * A missing public.users row is treated as "not provisioned yet" so first
 * sign-in can finish provisioning. A real database failure is surfaced rather
 * than silently granting access.
 */
export async function getAccountStatus(userId: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("users")
    .select("account_status")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingAccountTable(error)) return null;
    throw new ApiError(
      "SERVICE_UNAVAILABLE",
      "Your account status could not be verified. Please try again.",
      503,
    );
  }

  return data?.account_status ?? null;
}

export async function isUserActive(userId: string): Promise<boolean> {
  const status = await getAccountStatus(userId);
  return status === null || isActiveAccountStatus(status);
}

export async function getCurrentUser(): Promise<User> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    throw new ApiError("UNAUTHENTICATED", "You must be signed in.", 401);
  }

  const status = await getAccountStatus(data.user.id);
  if (status !== null && !isActiveAccountStatus(status)) {
    throw new ApiError(
      "UNAUTHENTICATED",
      "This account is not active. Contact an administrator if you believe this is a mistake.",
      401,
    );
  }

  return data.user;
}

export async function getOptionalUser(): Promise<User | null> {
  try {
    return await getCurrentUser();
  } catch {
    // Suspended/deleted users and database failures are treated as anonymous
    // on public pages. Never grant draft or staff access from a stale session.
    return null;
  }
}

export async function ensureUserProfile(user: User) {
  try {
    // Prefer the admin client so provisioning is not constrained by RLS.
    const adminClient = createSupabaseAdminClient();
    const supabase = adminClient ?? (await createSupabaseServerClient());

    // 1. Create the account row only when it is genuinely missing. An upsert
    // here would reset account_status to "active" on every sign-in and undo
    // an administrator's suspension.
    const { data: existingUser, error: userLookupError } = await supabase
      .from("users")
      .select("id, account_status")
      .eq("id", user.id)
      .maybeSingle();

    if (userLookupError && !isMissingAccountTable(userLookupError)) {
      console.warn(
        "[ensureUserProfile] Failed to read public.users:",
        userLookupError.message,
      );
    }

    if (!existingUser) {
      const { error: insertError } = await supabase.from("users").insert({
        id: user.id,
        email: user.email ?? `${user.id}@community.local`,
        onboarding_completed: false,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (insertError && insertError.code !== "23505") {
        console.warn(
          "[ensureUserProfile] Failed to create public.users:",
          insertError.message,
        );
      }
    }

    // Never write account_status from an ordinary sign-in path. Only the
    // administrator workflow may change it.
    await supabase
      .from("users")
      .update({
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (existingUser && !isActiveAccountStatus(existingUser.account_status)) {
      return;
    }

    // 2. Check if profile already exists
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, avatar_url, display_name")
      .eq("id", user.id)
      .maybeSingle();

    const googleAvatar =
      (user.user_metadata?.avatar_url as string | undefined) ||
      (user.user_metadata?.picture as string | undefined) ||
      null;

    if (!existingProfile) {
      const emailPrefix = (user.email?.split("@")[0] || "member")
        .replace(/[^a-zA-Z0-9_]/g, "_")
        .toLowerCase();
      const randomSuffix = user.id.slice(0, 4);
      const username = `${emailPrefix}_${randomSuffix}`;
      const displayName =
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        user.email?.split("@")[0] ||
        "Community Member";

      const { error: profileError } = await supabase.from("profiles").insert({
        id: user.id,
        username,
        display_name: displayName,
        avatar_url: googleAvatar,
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
      });

      if (profileError && profileError.code !== "23505") {
        console.error(
          "[ensureUserProfile] Failed to create public.profiles:",
          profileError.message,
        );
      }
    } else {
      // Existing profile: update activity and fill a missing avatar without
      // overwriting custom data or status.
      const updates: Record<string, unknown> = {
        last_active_at: new Date().toISOString(),
      };
      if (!existingProfile.avatar_url && googleAvatar) {
        updates.avatar_url = googleAvatar;
      }
      await supabase.from("profiles").update(updates).eq("id", user.id);
    }
  } catch (err) {
    console.error("[ensureUserProfile] Exception:", err);
  }
}
