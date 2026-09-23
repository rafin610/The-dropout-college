import { z } from "zod";
import { getCurrentUser, getOptionalUser } from "@/server/auth/current-user";
import { toErrorResponse, ApiError } from "@/server/errors";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { createNotification, throwIfSocialSchemaMissing } from "@/server/social";

export const runtime = "nodejs";

const commentSchema = z.object({ content: z.string().trim().min(1).max(2000) });

async function idFrom(context: { params: Promise<{ id: string }> }) {
  return (await context.params).id;
}

/** GET: comments for a project with author profile (public for public projects). */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    const projectId = await idFrom(context);
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("project_comments")
      .select("id, content, created_at, updated_at, user_id, profiles!project_comments_user_id_fkey(id, display_name, username, avatar_url)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });
    if (error) {
      // Fallback without the author join (e.g. FK hint mismatch).
      const retry = await supabase
        .from("project_comments")
        .select("id, content, created_at, updated_at, user_id")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      if (retry.error) throw retry.error;
      return Response.json({ data: retry.data ?? [], requestId });
    }
    return Response.json({ data: data ?? [], requestId });
  } catch (error) {
    try {
      throwIfSocialSchemaMissing(error);
    } catch (mapped) {
      return toErrorResponse(mapped, requestId);
    }
    return toErrorResponse(error, requestId);
  }
}

/** POST: add a comment as the authenticated user. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    const user = await getCurrentUser();
    const projectId = await idFrom(context);
    const parsed = commentSchema.safeParse(await request.json());
    if (!parsed.success) throw new ApiError("VALIDATION_ERROR", "Comment must be 1–2000 characters.", 400);
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("project_comments")
      .insert({ project_id: projectId, user_id: user.id, content: parsed.data.content })
      .select("id, content, created_at, updated_at, user_id")
      .single();
    if (error) throw error;
    try {
      const { data: project } = await supabase.from("projects").select("id, owner_id, name").eq("id", projectId).single();
      const { data: actor } = await supabase.from("profiles").select("display_name").eq("id", user.id).single();
      if (project && project.owner_id !== user.id) {
        await createNotification({
          recipientId: project.owner_id,
          actorId: user.id,
          type: "COMMENT",
          title: "New comment",
          body: `${actor?.display_name ?? "A user"} commented on your project “${project.name}”`,
          projectId,
          commentId: data.id,
        });
      }
    } catch {
      // Ignore notification errors.
    }
    return Response.json({ data, requestId }, { status: 201 });
  } catch (error) {
    // Genuine validation/auth errors pass through; missing-table errors
    // become a clear setup message via the helper.
    if (error instanceof ApiError) return toErrorResponse(error, requestId);
    try {
      throwIfSocialSchemaMissing(error);
    } catch (mapped) {
      return toErrorResponse(mapped, requestId);
    }
    return toErrorResponse(error, requestId);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    await getOptionalUser();
    return Response.json({ data: null, requestId });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
