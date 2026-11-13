import { getCurrentUser } from "@/server/auth/current-user";
import { toErrorResponse, ApiError } from "@/server/errors";
import { createComment, listComments } from "@/server/posts/posts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const { id } = await context.params;
    if (!UUID.test(id)) throw new ApiError("NOT_FOUND", "Post not found.", 404);
    return Response.json({ data: await listComments(id), requestId });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const { id } = await context.params;
    if (!UUID.test(id)) throw new ApiError("NOT_FOUND", "Post not found.", 404);
    const user = await getCurrentUser();
    const body = (await request.json().catch(() => null)) as { content?: unknown } | null;
    if (!body || typeof body.content !== "string") {
      throw new ApiError("VALIDATION_ERROR", "Write a comment before sending.", 400);
    }
    const comment = await createComment({ postId: id, authorId: user.id, content: body.content });
    return Response.json({ data: comment, requestId }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
