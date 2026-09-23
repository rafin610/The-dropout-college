import { z } from "zod";
import { getCurrentUser, getOptionalUser } from "@/server/auth/current-user";
import { toErrorResponse, ApiError } from "@/server/errors";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { createNotification, throwIfSocialSchemaMissing } from "@/server/social";

export const runtime = "nodejs";

const followSchema = z.object({ followingId: z.string().uuid() });

/** GET /api/v1/follows?userId=xxx -> counts, lists (public, no emails), isFollowing */
export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    if (!userId) throw new ApiError("VALIDATION_ERROR", "userId is required.", 400);
    const supabase = await createSupabaseServerClient();
    const viewer = await getOptionalUser();

    const [followers, following] = await Promise.all([
      supabase
        .from("follows")
        .select("follower_id, created_at, profiles!follows_follower_id_fkey(id, display_name, username, avatar_url, bio)")
        .eq("following_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("follows")
        .select("following_id, created_at, profiles!follows_following_id_fkey(id, display_name, username, avatar_url, bio)")
        .eq("follower_id", userId)
        .order("created_at", { ascending: false }),
    ]);
    // Fallback without profile joins if the FK hint mismatches.
    let followerRows: Array<Record<string, unknown>> = (followers.data ?? []) as Array<Record<string, unknown>>;
    let followingRows: Array<Record<string, unknown>> = (following.data ?? []) as Array<Record<string, unknown>>;
    if (followers.error || following.error) {
      const [fb, fg] = await Promise.all([
        supabase.from("follows").select("follower_id, created_at").eq("following_id", userId).order("created_at", { ascending: false }),
        supabase.from("follows").select("following_id, created_at").eq("follower_id", userId).order("created_at", { ascending: false }),
      ]);
      if (fb.error) throw fb.error;
      if (fg.error) throw fg.error;
      followerRows = (fb.data ?? []).map((r) => ({ ...r, profiles: null }));
      followingRows = (fg.data ?? []).map((r) => ({ ...r, profiles: null }));
    }

    let isFollowing = false;
    if (viewer && viewer.id !== userId) {
      const { data } = await supabase.from("follows").select("id").eq("follower_id", viewer.id).eq("following_id", userId).maybeSingle();
      isFollowing = Boolean(data);
    }

    return Response.json({
      data: {
        followersCount: followerRows?.length ?? 0,
        followingCount: followingRows?.length ?? 0,
        followers: followerRows ?? [],
        following: followingRows ?? [],
        isFollowing,
      },
      requestId,
    });
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

/** POST: follow a user. Body { followingId }. Cannot follow self. Unique. */
export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    const user = await getCurrentUser();
    const parsed = followSchema.safeParse(await request.json());
    if (!parsed.success) throw new ApiError("VALIDATION_ERROR", "followingId is required.", 400);
    if (parsed.data.followingId === user.id) throw new ApiError("VALIDATION_ERROR", "You cannot follow yourself.", 400);
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("follows").insert({ follower_id: user.id, following_id: parsed.data.followingId });
    if (error && error.code !== "23505") throw error;
    try {
      const { data: actor } = await supabase.from("profiles").select("display_name").eq("id", user.id).single();
      await createNotification({
        recipientId: parsed.data.followingId,
        actorId: user.id,
        type: "FOLLOW",
        title: "New follower",
        body: `${actor?.display_name ?? "A user"} started following you`,
      });
    } catch {
      // Ignore notification errors.
    }
    return Response.json({ data: { following: true }, requestId }, { status: 201 });
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

/** DELETE /api/v1/follows?followingId=xxx -> unfollow */
export async function DELETE(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    const user = await getCurrentUser();
    const followingId = new URL(request.url).searchParams.get("followingId");
    if (!followingId) throw new ApiError("VALIDATION_ERROR", "followingId is required.", 400);
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", followingId);
    if (error) throw error;
    return Response.json({ data: { following: false }, requestId });
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
