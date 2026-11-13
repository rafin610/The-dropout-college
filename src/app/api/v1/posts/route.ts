import { getCurrentUser, getOptionalUser } from "@/server/auth/current-user";
import { toErrorResponse, ApiError } from "@/server/errors";
import { createPost, listPosts } from "@/server/posts/posts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
    const limit = Math.min(20, Math.max(1, Number(searchParams.get("limit") || "10") || 10));
    const authorId = searchParams.get("author")?.trim() || undefined;
    const user = await getOptionalUser();

    const result = await listPosts({ page, limit, viewerId: user?.id, authorId });
    return Response.json({ data: result.posts, total: result.total, page, limit, unavailable: result.unavailable, requestId });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    const user = await getCurrentUser();
    const body = (await request.json().catch(() => null)) as { content?: unknown; imageUrl?: unknown } | null;
    if (!body || typeof body.content !== "string") {
      throw new ApiError("VALIDATION_ERROR", "Write something before posting.", 400);
    }
    if (body.imageUrl !== undefined && body.imageUrl !== null && typeof body.imageUrl !== "string") {
      throw new ApiError("VALIDATION_ERROR", "The image URL is invalid.", 400);
    }

    const post = await createPost({
      content: body.content,
      imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : null,
      authorId: user.id,
    });

    return Response.json({ data: post, requestId }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
