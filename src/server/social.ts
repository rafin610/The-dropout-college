import { createSupabaseServerClient } from "@/server/supabase/server";
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
  projectId?: string | null;
  commentId?: string | null;
};

export function throwIfSocialSchemaMissing(error: unknown): void {
  const message = error instanceof Error ? error.message : typeof error === "object" && error !== null && "message" in error ? String((error as { message: unknown }).message) : "";
  const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : "";
  if (code === "PGRST205" || message.includes("schema cache") || message.includes("does not exist")) {
    throw new ApiError("SERVICE_UNAVAILABLE", "Social features are being set up. Run supabase/migrations/0010_social_fixes.sql in the Supabase SQL editor, then try again.", 503);
  }
  throw error;
}
/**
 * Create a social notification through a restricted security-definer RPC.
 *
 * Authenticated clients have no direct INSERT policy on notifications. The RPC
 * derives the actor from auth.uid(), verifies that the follow/upvote/comment
 * evidence actually exists, verifies the recipient owns the referenced
 * resource, and writes a server-controlled message. Never throws: a failed
 * notification must not fail the social action itself.
 */
export async function createNotification(input: NotifyInput) {
  try {
    if (input.recipientId === input.actorId) return;
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("create_social_notification", {
      p_recipient_id: input.recipientId,
      p_type: input.type,
      p_project_id: input.projectId ?? null,
      p_comment_id: input.commentId ?? null,
    });
    if (error) {
      console.warn("[createNotification] RPC failed:", error.message);
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
