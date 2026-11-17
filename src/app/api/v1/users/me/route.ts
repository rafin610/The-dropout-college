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

    if (payload.data.categoryIds !== undefined) {
      const { error: categoryDeleteError } = await supabase
        .from("profile_categories")
        .delete()
        .eq("profile_id", user.id);
      if (categoryDeleteError) throw categoryDeleteError;

      if (payload.data.categoryIds.length > 0) {
        const { error: categoryInsertError } = await supabase
          .from("profile_categories")
          .insert(payload.data.categoryIds.map((category_id) => ({ profile_id: user.id, category_id })));
        if (categoryInsertError) throw categoryInsertError;
      }
    }

    if (payload.data.skillIds !== undefined) {
      const uniqueSkillIds = [...new Set(payload.data.skillIds)];
      const { data: validSkills, error: skillValidationError } = await supabase
        .from("skills")
        .select("id")
        .in("id", uniqueSkillIds)
        .eq("is_active", true);
      if (skillValidationError) throw skillValidationError;
      if ((validSkills ?? []).length !== uniqueSkillIds.length) {
        throw new ApiError("VALIDATION_ERROR", "One or more selected skills are unavailable.", 400);
      }

      const { error: skillDeleteError } = await supabase.from("profile_skills").delete().eq("profile_id", user.id);
      if (skillDeleteError) throw skillDeleteError;

      if (uniqueSkillIds.length > 0) {
        const { error: skillInsertError } = await supabase
          .from("profile_skills")
          .insert(uniqueSkillIds.map((skill_id) => ({ profile_id: user.id, skill_id })));
        if (skillInsertError) throw skillInsertError;
      }
    }

    const { data: socialLinks, error: socialError } = await supabase
      .from("social_links")
      .select("platform, url")
      .eq("profile_id", user.id)
      .order("platform");
    if (socialError) throw socialError;

    const { data: categories, error: categoryError } = await supabase
      .from("profile_categories")
      .select("category_id, categories(id, name)")
      .eq("profile_id", user.id);
    if (categoryError) throw categoryError;

    const { data: skills, error: skillError } = await supabase
      .from("profile_skills")
      .select("skill_id, skills(id, name)")
      .eq("profile_id", user.id);
    if (skillError) throw skillError;

    return Response.json({ data: { ...data, social_links: socialLinks ?? [], profile_categories: categories ?? [], profile_skills: skills ?? [] } });
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
