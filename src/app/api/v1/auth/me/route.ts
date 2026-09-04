import { getCurrentUser } from "@/server/auth/current-user";
import { toErrorResponse } from "@/server/errors";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  try {
    const user = await getCurrentUser();
    return Response.json({ data: { id: user.id, email: user.email, metadata: user.user_metadata }, requestId });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}