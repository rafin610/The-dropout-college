import { getCurrentUser } from "@/server/auth/current-user";
import { toErrorResponse, ApiError } from "@/server/errors";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { projectSchema } from "@/server/validation/resources";
import { normalizeProjectStatus } from "@/server/social";

export const runtime = "nodejs";

async function idFrom(context: { params: Promise<{ id: string }> }) { return (await context.params).id; }

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("projects").select("*, categories(name, slug), project_members(profile_id, role), project_links(*), project_technologies(*)").eq("id", await idFrom(context)).single();
    if (error) throw new ApiError("NOT_FOUND", "Project not found.", 404);
    return Response.json({ data, requestId });
  } catch (error) { return toErrorResponse(error, requestId); }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    const user = await getCurrentUser();
    const parsed = projectSchema.partial().safeParse(await request.json());
    if (!parsed.success) throw new ApiError("VALIDATION_ERROR", "Project data is invalid.", 400);
    const value = parsed.data;
    const supabase = await createSupabaseServerClient();
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (value.name !== undefined) patch.name = value.name;
    if (value.slug !== undefined) patch.slug = value.slug;
    if (value.description !== undefined) patch.description = value.description;
    if (value.categoryId !== undefined) patch.category_id = value.categoryId;
    if (value.status !== undefined) patch.status = normalizeProjectStatus(value.status);
    if (value.visibility !== undefined) patch.visibility = value.visibility;
    if (value.coverImageUrl !== undefined) patch.cover_image_url = value.coverImageUrl;
    if (value.demoUrl !== undefined) patch.demo_url = value.demoUrl;
    if (value.githubUrl !== undefined) patch.github_url = value.githubUrl;
    const { data, error } = await supabase.from("projects").update(patch).eq("id", await idFrom(context)).eq("owner_id", user.id).select().single();
    if (error) throw new ApiError(error.code === "PGRST116" ? "NOT_FOUND" : "CONFLICT", "Project could not be updated.", error.code === "PGRST116" ? 404 : 409);
    return Response.json({ data, requestId });
  } catch (error) { return toErrorResponse(error, requestId); }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    const user = await getCurrentUser();
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("projects").update({ deleted_at: new Date().toISOString() }).eq("id", await idFrom(context)).eq("owner_id", user.id);
    if (error) throw error;
    return new Response(null, { status: 204, headers: { "x-request-id": requestId } });
  } catch (error) { return toErrorResponse(error, requestId); }
}
