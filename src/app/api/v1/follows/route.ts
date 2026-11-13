import { z } from "zod";
import { getCurrentUser, getOptionalUser } from "@/server/auth/current-user";
import { ApiError, toErrorResponse } from "@/server/errors";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { createNotification, throwIfSocialSchemaMissing } from "@/server/social";

export const runtime = "nodejs";

const uuidSchema = z.string().uuid();
const followSchema = z.object({ followingId: uuidSchema });

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

function privateJson(data: unknown, requestId: string) {
  return Response.json(
    { data, requestId },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

async function getCounts(supabase: SupabaseClient, userId: string) {
  const [followers, following] = await Promise.all([
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", userId),
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", userId),
  ]);
  if (followers.error) throw followers.error;
  if (following.error) throw following.error;
  return {
    followersCount: followers.count ?? 0,
    followingCount: following.count ?? 0,
  };
}

function respond(error: unknown, requestId: string) {
  try {
    throwIfSocialSchemaMissing(error);
  } catch (mapped) {
    if (mapped instanceof ApiError) return toErrorResponse(mapped, requestId);
    const code =
      typeof mapped === "object" && mapped !== null && "code" in mapped
        ? String(mapped.code)
        : "";
    if (code === "42501") {
      return toErrorResponse(
        new ApiError("FORBIDDEN", "This follow action is not permitted.", 403),
        requestId,
      );
    }
    if (code === "23503") {
      return toErrorResponse(new ApiError("NOT_FOUND", "That member could not be found.", 404), requestId);
    }
    return toErrorResponse(mapped, requestId);
  }
  return toErrorResponse(error, requestId);
}

/** GET /api/v1/follows?userId=xxx -> counts and two profile previews per direction. */
export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    if (!userId || !uuidSchema.safeParse(userId).success) {
      throw new ApiError("VALIDATION_ERROR", "A valid userId is required.", 400);
    }

    const supabase = await createSupabaseServerClient();
    const view = url.searchParams.get("view") ?? "summary";

    if (view === "list") {
      const relationship = url.searchParams.get("relationship");
      if (relationship !== "followers" && relationship !== "following") {
        throw new ApiError("VALIDATION_ERROR", "A valid relationship is required.", 400);
      }

      const parsedPage = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
      const parsedLimit = Number.parseInt(url.searchParams.get("limit") ?? "30", 10);
      const page = Number.isFinite(parsedPage) ? Math.min(1_000_000, Math.max(1, parsedPage)) : 1;
      const limit = Number.isFinite(parsedLimit) ? Math.min(50, Math.max(1, parsedLimit)) : 30;
      const search = (url.searchParams.get("search") ?? "")
        .trim()
        .slice(0, 80)
        .replace(/[,%()\\*]/g, "");
      const isFollowers = relationship === "followers";
      const relation = isFollowers
        ? "follower_id, profiles!follows_follower_id_fkey!inner(id, display_name, username, avatar_url)"
        : "following_id, profiles!follows_following_id_fkey!inner(id, display_name, username, avatar_url)";
      let query = supabase
        .from("follows")
        .select(relation, { count: "exact" })
        .eq(isFollowers ? "following_id" : "follower_id", userId);

      if (search) {
        query = query.or(
          `display_name.ilike.%${search}%,username.ilike.%${search}%`,
          { foreignTable: "profiles" },
        );
      }

      const from = (page - 1) * limit;
      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, from + limit - 1);
      if (error) throw error;

      return privateJson(
        {
          members: data ?? [],
          total: count ?? 0,
          page,
          limit,
          hasMore: from + (data?.length ?? 0) < (count ?? 0),
        },
        requestId,
      );
    }

    if (view !== "summary") {
      throw new ApiError("VALIDATION_ERROR", "A valid follow view is required.", 400);
    }

    const [viewer, followers, following] = await Promise.all([
      getOptionalUser(),
      supabase
        .from("follows")
        .select(
          "follower_id, profiles!follows_follower_id_fkey(id, display_name, username, avatar_url)",
          { count: "exact" },
        )
        .eq("following_id", userId)
        .order("created_at", { ascending: false })
        .limit(2),
      supabase
        .from("follows")
        .select(
          "following_id, profiles!follows_following_id_fkey(id, display_name, username, avatar_url)",
          { count: "exact" },
        )
        .eq("follower_id", userId)
        .order("created_at", { ascending: false })
        .limit(2),
    ]);
    if (followers.error) throw followers.error;
    if (following.error) throw following.error;

    let isFollowing = false;
    if (viewer && viewer.id !== userId) {
      const { data, error } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", viewer.id)
        .eq("following_id", userId)
        .maybeSingle();
      if (error) throw error;
      isFollowing = Boolean(data);
    }

    return privateJson(
      {
        followersCount: followers.count ?? 0,
        followingCount: following.count ?? 0,
        followers: followers.data ?? [],
        following: following.data ?? [],
        isFollowing,
      },
      requestId,
    );
  } catch (error) {
    if (error instanceof ApiError) return toErrorResponse(error, requestId);
    return respond(error, requestId);
  }
}

/** POST: follow a user. RLS enforces active-account and relationship permissions. */
export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    const user = await getCurrentUser();
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError("VALIDATION_ERROR", "A valid followingId is required.", 400);
    }
    const parsed = followSchema.safeParse(body);
    if (!parsed.success) throw new ApiError("VALIDATION_ERROR", "A valid followingId is required.", 400);
    if (parsed.data.followingId === user.id) {
      throw new ApiError("VALIDATION_ERROR", "You cannot follow yourself.", 400);
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("follows")
      .insert({ follower_id: user.id, following_id: parsed.data.followingId });
    const isNewRelationship = !error;
    if (error && error.code !== "23505") throw error;

    if (isNewRelationship) {
      await createNotification({
        recipientId: parsed.data.followingId,
        actorId: user.id,
        type: "FOLLOW",
      });
    }

    return Response.json(
      { data: { isFollowing: true, ...(await getCounts(supabase, parsed.data.followingId)) }, requestId },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ApiError) return toErrorResponse(error, requestId);
    return respond(error, requestId);
  }
}

/** DELETE /api/v1/follows?followingId=xxx -> unfollow the current member. */
export async function DELETE(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    const user = await getCurrentUser();
    const followingId = new URL(request.url).searchParams.get("followingId");
    if (!followingId || !uuidSchema.safeParse(followingId).success) {
      throw new ApiError("VALIDATION_ERROR", "A valid followingId is required.", 400);
    }
    if (followingId === user.id) {
      throw new ApiError("VALIDATION_ERROR", "You cannot follow yourself.", 400);
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", followingId);
    if (error) throw error;

    return Response.json(
      { data: { isFollowing: false, ...(await getCounts(supabase, followingId)) }, requestId },
    );
  } catch (error) {
    if (error instanceof ApiError) return toErrorResponse(error, requestId);
    return respond(error, requestId);
  }
}
