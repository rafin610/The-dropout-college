import { getCurrentUser } from "@/server/auth/current-user";
import { toErrorResponse, ApiError } from "@/server/errors";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { projectSchema } from "@/server/validation/resources";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("projects").select("*, categories(name, slug), project_members(profile_id, role)").is("deleted_at", null).order("created_at", { ascending: false });
    if (error) throw error;
    return Response.json({ data, requestId });
  } catch (error) { return toErrorResponse(error, requestId); }
}

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    const user = await getCurrentUser();
    const parsed = projectSchema.safeParse(await request.json());
    if (!parsed.success) throw new ApiError("VALIDATION_ERROR", "Project data is invalid.", 400);
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("projects").insert({ owner_id: user.id, name: parsed.data.name, slug: parsed.data.slug, description: parsed.data.description, category_id: parsed.data.categoryId, status: parsed.data.status, visibility: parsed.data.visibility }).select().single();
    if (error) throw error;
    return Response.json({ data, requestId }, { status: 201 });
  } catch (error) { return toErrorResponse(error, requestId); }
}