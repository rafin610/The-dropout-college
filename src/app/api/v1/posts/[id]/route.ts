import { getCurrentUser, getOptionalUser } from "@/server/auth/current-user";
import { toErrorResponse, ApiError } from "@/server/errors";
import { deletePost, getPostById } from "@/server/posts/posts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readId(context: { params: Promise<{ id: string }> }) {
  return context.params.then((params) => params.id);
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const id = await readId(context);
    if (!UUID.test(id)) throw new ApiError("NOT_FOUND", "Post not found.", 404);
    const user = await getOptionalUser();
    const result = await getPostById(id, user?.id);
    if (result.unavailable) {
      throw new ApiError("SERVICE_UNAVAILABLE", "The Campus feed is not set up yet.", 503);
    }
    if (!result.post) throw new ApiError("NOT_FOUND", "Post not found.", 404);
    return Response.json({ data: result.post, requestId });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const id = await readId(context);
    if (!UUID.test(id)) throw new ApiError("NOT_FOUND", "Post not found.", 404);
    const user = await getCurrentUser();
    await deletePost(id, user.id);
    return new Response(null, { status: 204, headers: { "x-request-id": requestId } });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
