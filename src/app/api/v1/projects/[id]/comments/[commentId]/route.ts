import { z } from "zod";
import { getCurrentUser } from "@/server/auth/current-user";
import { toErrorResponse, ApiError } from "@/server/errors";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { throwIfSocialSchemaMissing } from "@/server/social";

export const runtime = "nodejs";

const editSchema = z.object({ content: z.string().trim().min(1).max(2000) });

type Ctx = { params: Promise<{ id: string; commentId: string }> };

async function isAdmin(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, profileId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("profile_id", profileId).in("role", ["admin", "super_admin"]);
  return (data ?? []).length > 0;
}

/** PATCH: edit own comment. */
export async function PATCH(request: Request, context: Ctx) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    const user = await getCurrentUser();
    const { commentId } = await context.params;
    const parsed = editSchema.safeParse(await request.json());
    if (!parsed.success) throw new ApiError("VALIDATION_ERROR", "Comment must be 1–2000 characters.", 400);
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("project_comments")
      .update({ content: parsed.data.content, updated_at: new Date().toISOString() })
      .eq("id", commentId)
      .eq("user_id", user.id)
      .select("id, content, created_at, updated_at, user_id")
      .single();
    if (error) throw new ApiError("NOT_FOUND", "Comment not found or you do not own it.", 404);
    return Response.json({ data, requestId });
  } catch (error) {
    if (error instanceof ApiError) return toErrorResponse(error, requestId);
    try {
      throwIfSocialSchemaMissing(error);
    } catch (mapped) {
      return toErrorResponse(mapped, requestId);
    }
    return toErrorResponse(error, requestId);
  }
}

/** DELETE: own comment, or any comment if admin/moderator. */
export async function DELETE(request: Request, context: Ctx) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    const user = await getCurrentUser();
    const { commentId } = await context.params;
    const supabase = await createSupabaseServerClient();
    const admin = await isAdmin(supabase, user.id);
    let query = supabase.from("project_comments").delete().eq("id", commentId);
    if (!admin) query = query.eq("user_id", user.id);
    const { error } = await query;
    if (error) throw error;
    return new Response(null, { status: 204, headers: { "x-request-id": requestId } });
  } catch (error) {
    try {
      throwIfSocialSchemaMissing(error);
    } catch (mapped) {
      return toErrorResponse(mapped, requestId);
    }
    return toErrorResponse(error, requestId);
  }
}
