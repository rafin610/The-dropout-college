import { createSupabaseAdminClient, createSupabaseServerClient } from "@/server/supabase/server";
import { ApiError } from "@/server/errors";

export function normalizeProjectStatus(input?: string | null): "idea" | "recruiting" | "in_progress" | "launched" | "archived" {
  if (input === "building") return "in_progress";
  if (input === "idea" || input === "recruiting" || input === "in_progress" || input === "launched" || input === "archived") return input;
  return "idea";
}

export function displayProjectStatus(status?: string | null): string {
  if (status === "in_progress") return "Building";
  if (status === "launched" || status === "Live") return "Launched";
  if (status === "recruiting") return "Recruiting";
  if (status === "archived") return "Archived";
  return "Idea";
}

type NotifyInput = {
  recipientId: string;
  actorId: string;
  type: "UPVOTE" | "COMMENT" | "FOLLOW";
  title: string;
  body: string;
  projectId?: string | null;
  commentId?: string | null;
};

/** Insert a notification via the service-role client so the
 *  "service role only" RLS policy stays intact. Never throws. */
export function throwIfSocialSchemaMissing(error: unknown): void {
  const message = error instanceof Error ? error.message : typeof error === "object" && error !== null && "message" in error ? String((error as { message: unknown }).message) : "";
  const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : "";
  if (code === "PGRST205" || message.includes("schema cache") || message.includes("does not exist")) {
    throw new ApiError("SERVICE_UNAVAILABLE", "Social features are being set up. Run supabase/migrations/0010_social_fixes.sql in the Supabase SQL editor, then try again.", 503);
  }
  throw error;
}
export async function createNotification(input: NotifyInput) {
  try {
    if (input.recipientId === input.actorId) return;
    const admin = createSupabaseAdminClient();
    const fallback = admin ?? (await createSupabaseServerClient());

    // De-duplicate: if there is already an unread notification from the same
    // actor for the same thing (e.g. re-follow, upvote after unvote), refresh
    // it instead of stacking duplicates.
    const dedupe = fallback
      .from("notifications")
      .update({ created_at: new Date().toISOString(), read_at: null })
      .eq("profile_id", input.recipientId)
      .eq("actor_id", input.actorId)
      .eq("type", input.type)
      .is("read_at", null);
    if (input.projectId) dedupe.eq("project_id", input.projectId);
    else dedupe.is("project_id", null);
    if (input.commentId) dedupe.eq("comment_id", input.commentId);
    const { data: existing } = await dedupe.select("id").limit(1);
    if (existing && existing.length > 0) return;

    const { error } = await fallback.from("notifications").insert({
      profile_id: input.recipientId,
      actor_id: input.actorId,
      type: input.type,
      title: input.title,
      body: input.body,
      resource_type: input.projectId ? "project" : input.type === "FOLLOW" ? "profile" : null,
      resource_id: input.projectId ?? (input.type === "FOLLOW" ? input.actorId : null),
      project_id: input.projectId ?? null,
      comment_id: input.commentId ?? null,
    });
    if (error) {
      console.warn("[createNotification] insert failed:", error.message);
    }
  } catch (error) {
    console.warn("[createNotification] failed:", error instanceof Error ? error.message : error);
  }
}

export async function isAdminProfile(profileId: string, supabase: { from: (t: string) => { select: (c: string) => { eq: (col: string, v: string) => { in: (col: string, vs: string[]) => Promise<{ data: Array<{ role: string }> | null }> } } } }): Promise<boolean> {
  try {
    const { data } = await supabase.from("user_roles").select("role").eq("profile_id", profileId).in("role", ["admin", "super_admin"]);
    return (data ?? []).length > 0;
  } catch {
    return false;
  }
}
