import { getCurrentUser } from "@/server/auth/current-user";
import { getMemberRole } from "@/server/auth/roles";
import { toErrorResponse, ApiError } from "@/server/errors";
import { createSupabaseServerClient } from "@/server/supabase/server";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const actor = await getCurrentUser();
    const actorRole = await getMemberRole(actor.id);
    if (actorRole !== "admin") {
      throw new ApiError("FORBIDDEN", "Only an administrator can change roles.", 403);
    }

    const body = (await request.json().catch(() => null)) as { userId?: unknown; role?: unknown } | null;
    if (!body || typeof body.userId !== "string" || !body.userId) {
      throw new ApiError("VALIDATION_ERROR", "Choose a member.", 400);
    }
    if (body.role !== "member" && body.role !== "moderator") {
      throw new ApiError("VALIDATION_ERROR", "Choose the Member or Moderator role.", 400);
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("set_member_role", {
      p_user_id: body.userId,
      p_role: body.role,
    });

    if (error) {
      if (error.code === "PGRST202") {
        throw new ApiError("SERVICE_UNAVAILABLE", "Role management is not set up yet.", 503);
      }
      if (error.code === "42501") {
        throw new ApiError("FORBIDDEN", "You cannot change this member's role.", 403);
      }
      if (error.code === "22023") {
        throw new ApiError("VALIDATION_ERROR", "That role cannot be assigned.", 400);
      }
      if (error.code === "P0002") {
        throw new ApiError("NOT_FOUND", "Member not found.", 404);
      }
      throw error;
    }

    return Response.json({ data: { userId: body.userId, role: body.role }, requestId });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}

export async function GET() {
  return toErrorResponse(new ApiError("NOT_FOUND", "Not found.", 404), crypto.randomUUID());
}
