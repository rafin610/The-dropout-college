import { getCurrentUser } from "@/server/auth/current-user";
import { toErrorResponse, ApiError } from "@/server/errors";
import { toggleLove } from "@/server/posts/posts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const { id } = await context.params;
    if (!UUID.test(id)) throw new ApiError("NOT_FOUND", "Post not found.", 404);
    const user = await getCurrentUser();
    const result = await toggleLove(id, user.id);
    return Response.json({ data: result, requestId });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
