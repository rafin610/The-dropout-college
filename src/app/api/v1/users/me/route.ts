import { getCurrentUser } from "@/server/auth/current-user";
import { toErrorResponse, ApiError } from "@/server/errors";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { updateProfileSchema } from "@/server/validation/profile";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withRequestId(request, async () => {
    const user = await getCurrentUser();
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("profiles").select("*, profile_categories(*), profile_skills(*), social_links(*)").eq("id", user.id).single();

    if (error) throw new ApiError("NOT_FOUND", "Profile not found.", 404);
    return Response.json({ data });
  });
}

export async function PATCH(request: Request) {
  return withRequestId(request, async () => {
    const user = await getCurrentUser();
    const payload = updateProfileSchema.safeParse(await request.json());

    if (!payload.success) throw new ApiError("VALIDATION_ERROR", "Profile data is invalid.", 400);

    const updates = {
      ...(payload.data.username !== undefined && { username: payload.data.username }),
      ...(payload.data.displayName !== undefined && { display_name: payload.data.displayName }),
      ...(payload.data.avatarUrl !== undefined && { avatar_url: payload.data.avatarUrl }),
      ...(payload.data.bio !== undefined && { bio: payload.data.bio }),
      updated_at: new Date().toISOString(),
    };
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("profiles").update(updates).eq("id", user.id).select().single();

    if (error) {
      if (error.code === "23505") throw new ApiError("CONFLICT", "That username is already in use.", 409);
      throw error;
    }

    return Response.json({ data });
  });
}

async function withRequestId(request: Request, handler: () => Promise<Response>) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    const response = await handler();
    response.headers.set("x-request-id", requestId);
    return response;
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}