import { getCurrentUser } from "@/server/auth/current-user";
import { toErrorResponse, ApiError } from "@/server/errors";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { projectSchema } from "@/server/validation/resources";

export const runtime = "nodejs";

async function idFrom(context: { params: Promise<{ id: string }> }) { return (await context.params).id; }

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try { const supabase = await createSupabaseServerClient(); const { data, error } = await supabase.from("projects").select("*, categories(name, slug), project_members(profile_id, role), project_links(*), project_technologies(*)").eq("id", await idFrom(context)).single(); if (error) throw new ApiError("NOT_FOUND", "Project not found.", 404); return Response.json({ data, requestId }); } catch (error) { return toErrorResponse(error, requestId); }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try { const user = await getCurrentUser(); const parsed = projectSchema.partial().safeParse(await request.json()); if (!parsed.success) throw new ApiError("VALIDATION_ERROR", "Project data is invalid.", 400); const value = parsed.data; const supabase = await createSupabaseServerClient(); const { data, error } = await supabase.from("projects").update({ ...(value.name !== undefined && { name: value.name }), ...(value.slug !== undefined && { slug: value.slug }), ...(value.description !== undefined && { description: value.description }), ...(value.categoryId !== undefined && { category_id: value.categoryId }), ...(value.status !== undefined && { status: value.status }), ...(value.visibility !== undefined && { visibility: value.visibility }), updated_at: new Date().toISOString() }).eq("id", await idFrom(context)).eq("owner_id", user.id).select().single(); if (error) throw new ApiError(error.code === "PGRST116" ? "NOT_FOUND" : "CONFLICT", "Project could not be updated.", error.code === "PGRST116" ? 404 : 409); return Response.json({ data, requestId }); } catch (error) { return toErrorResponse(error, requestId); }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try { const user = await getCurrentUser(); const supabase = await createSupabaseServerClient(); const { error } = await supabase.from("projects").update({ deleted_at: new Date().toISOString() }).eq("id", await idFrom(context)).eq("owner_id", user.id); if (error) throw error; return new Response(null, { status: 204, headers: { "x-request-id": requestId } }); } catch (error) { return toErrorResponse(error, requestId); }
}