import { getCurrentUser, getOptionalUser } from "@/server/auth/current-user";
import { toErrorResponse } from "@/server/errors";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { createNotification, throwIfSocialSchemaMissing } from "@/server/social";

export const runtime = "nodejs";

async function idFrom(context: { params: Promise<{ id: string }> }) {
  return (await context.params).id;
}

/** GET: upvote count + whether the current user upvoted. Public. */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    const projectId = await idFrom(context);
    const supabase = await createSupabaseServerClient();
    const user = await getOptionalUser();
    const { count } = await supabase.from("project_upvotes").select("id", { count: "exact", head: true }).eq("project_id", projectId);
    let upvoted = false;
    if (user) {
      const { data } = await supabase.from("project_upvotes").select("id").eq("project_id", projectId).eq("user_id", user.id).maybeSingle();
      upvoted = Boolean(data);
    }
    return Response.json({ data: { count: count ?? 0, upvoted }, requestId });
  } catch (error) {
    try {
      throwIfSocialSchemaMissing(error);
    } catch (mapped) {
      return toErrorResponse(mapped, requestId);
    }
    return toErrorResponse(error, requestId);
  }
}

/** POST: toggle upvote for the authenticated user. Unique (project_id, user_id). */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    const user = await getCurrentUser();
    const projectId = await idFrom(context);
    const supabase = await createSupabaseServerClient();

    const { data: existing } = await supabase
      .from("project_upvotes")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    let upvoted: boolean;
    if (existing) {
      const { error } = await supabase.from("project_upvotes").delete().eq("project_id", projectId).eq("user_id", user.id);
      if (error) throw error;
      upvoted = false;
    } else {
      const { error } = await supabase.from("project_upvotes").insert({ project_id: projectId, user_id: user.id });
      if (error) {
        // Unique violation => already upvoted (race); treat as success.
        if (error.code !== "23505") throw error;
      }
      upvoted = true;
      // Notify the project owner (best-effort, never blocks).
      try {
        const { data: project } = await supabase.from("projects").select("id, owner_id, name").eq("id", projectId).single();
        const { data: actor } = await supabase.from("profiles").select("display_name").eq("id", user.id).single();
        if (project && project.owner_id !== user.id) {
          await createNotification({
            recipientId: project.owner_id,
            actorId: user.id,
            type: "UPVOTE",
            title: "New upvote",
            body: `${actor?.display_name ?? "A user"} upvoted your project “${project.name}”`,
            projectId,
          });
        }
      } catch {
        // Ignore notification errors.
      }
    }

    const { count } = await supabase.from("project_upvotes").select("id", { count: "exact", head: true }).eq("project_id", projectId);
    return Response.json({ data: { count: count ?? 0, upvoted }, requestId });
  } catch (error) {
    try {
      throwIfSocialSchemaMissing(error);
    } catch (mapped) {
      return toErrorResponse(mapped, requestId);
    }
    return toErrorResponse(error, requestId);
  }
}
