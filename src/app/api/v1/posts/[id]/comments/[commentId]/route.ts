import { getCurrentUser } from "@/server/auth/current-user";
import { toErrorResponse, ApiError } from "@/server/errors";
import { deleteComment, updateComment } from "@/server/posts/posts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function readParams(context: { params: Promise<{ id: string; commentId: string }> }) {
  return context.params;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string; commentId: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const { id, commentId } = await readParams(context);
    if (!UUID.test(id) || !UUID.test(commentId)) {
      throw new ApiError("NOT_FOUND", "Comment not found.", 404);
    }
    const user = await getCurrentUser();
    const body = (await request.json().catch(() => null)) as { content?: unknown } | null;
    if (!body || typeof body.content !== "string") {
      throw new ApiError("VALIDATION_ERROR", "Write a comment before saving.", 400);
    }
    const comment = await updateComment({ commentId, postId: id, userId: user.id, content: body.content });
    return Response.json({ data: comment, requestId });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; commentId: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const { id, commentId } = await readParams(context);
    if (!UUID.test(id) || !UUID.test(commentId)) {
      throw new ApiError("NOT_FOUND", "Comment not found.", 404);
    }
    const user = await getCurrentUser();
    await deleteComment({ commentId, postId: id, userId: user.id });
    return new Response(null, { status: 204, headers: { "x-request-id": requestId } });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
