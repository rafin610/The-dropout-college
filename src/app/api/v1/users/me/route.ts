import { getCurrentUser } from "@/server/auth/current-user";
import { toErrorResponse, ApiError } from "@/server/errors";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { updateProfileSchema } from "@/server/validation/profile";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withRequestId(request, async () => {
    const user = await getCurrentUser();
    const supabase = await createSupabaseServerClient();
    const profileFields = "id, username, display_name, avatar_url, bio, status, created_at, updated_at, profile_categories(category_id), profile_skills(skill_id, level, years_experience), social_links(platform, url)";
    const result = await supabase.from("profiles").select(profileFields).eq("id", user.id).maybeSingle();

    let data = result.data;
    if (result.error || !data) {
      const { ensureUserProfile } = await import("@/server/auth/current-user");
      await ensureUserProfile(user);
      const retry = await supabase.from("profiles").select(profileFields).eq("id", user.id).maybeSingle();
      data = retry.data;
    }

    if (!data) throw new ApiError("NOT_FOUND", "Profile not found.", 404);
    return Response.json({ data });
  });
}

export async function PATCH(request: Request) {
  return withRequestId(request, async () => {
    const user = await getCurrentUser();
    const payload = updateProfileSchema.safeParse(await request.json());

    if (!payload.success) throw new ApiError("VALIDATION_ERROR", "Profile data is invalid.", 400);

    const { ensureUserProfile } = await import("@/server/auth/current-user");
    await ensureUserProfile(user);

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

    const requestedLinks = new Map<string, string | null>();
    for (const entry of payload.data.socialLinks ?? []) requestedLinks.set(entry.platform, entry.url);
    if (payload.data.facebookUrl !== undefined) requestedLinks.set("facebook", payload.data.facebookUrl);
    if (payload.data.youtubeUrl !== undefined) requestedLinks.set("youtube", payload.data.youtubeUrl);

    for (const [platform, url] of requestedLinks) {
      const mutation = url
        ? supabase.from("social_links").upsert({ profile_id: user.id, platform, url }, { onConflict: "profile_id,platform" })
        : supabase.from("social_links").delete().eq("profile_id", user.id).eq("platform", platform);
      const { error: socialError } = await mutation;
      if (socialError) throw socialError;
    }

    const { data: socialLinks, error: socialError } = await supabase
      .from("social_links")
      .select("platform, url")
      .eq("profile_id", user.id)
      .order("platform");
    if (socialError) throw socialError;

    return Response.json({ data: { ...data, social_links: socialLinks ?? [] } });
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
