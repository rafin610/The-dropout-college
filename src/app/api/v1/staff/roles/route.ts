import { getUserPermissions } from "@/server/auth/permissions";
import { toErrorResponse, ApiError } from "@/server/errors";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { normalizeMemberRole } from "@/server/auth/roles";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const body = (await request.json().catch(() => null)) as {
      userId?: unknown;
      role?: unknown;
      status?: unknown;
    } | null;
    if (!body || typeof body.userId !== "string" || !body.userId) {
      throw new ApiError("VALIDATION_ERROR", "Choose a member.", 400);
    }
    const hasRole = body.role !== undefined;
    const hasStatus = body.status !== undefined;
    if (
      (!hasRole && !hasStatus) ||
      (hasRole && !["member", "moderator", "admin"].includes(String(body.role))) ||
      (hasStatus && !["active", "suspended", "deleted"].includes(String(body.status)))
    ) {
      throw new ApiError("VALIDATION_ERROR", "Choose a valid member role or account status.", 400);
    }

    const supabase = await createSupabaseServerClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      throw new ApiError("UNAUTHENTICATED", "You must be signed in.", 401);
    }
    const permissions = await getUserPermissions(authData.user.id);
    if (hasRole && !permissions.has("*") && !permissions.has("roles.manage")) {
      throw new ApiError("FORBIDDEN", "You do not have permission to change member roles.", 403);
    }
    if (hasStatus && !permissions.has("*") && !permissions.has("users.manage")) {
      throw new ApiError("FORBIDDEN", "You do not have permission to change member account status.", 403);
    }

    const { data, error } = await supabase.rpc("staff_admin_update_member", {
      p_user_id: body.userId,
      p_status: hasStatus ? body.status : null,
      p_role: hasRole ? body.role : null,
      p_request_id: requestId,
    });

    if (error) {
      if (error.code === "PGRST202" || error.code === "42883") {
        throw new ApiError("SERVICE_UNAVAILABLE", "Apply the member administration database migration before making changes.", 503);
      }
      if (error.code === "42501") throw new ApiError("FORBIDDEN", "You cannot make that member change.", 403);
      if (error.code === "22023") throw new ApiError("VALIDATION_ERROR", "That member change is invalid.", 400);
      if (error.code === "P0002") {
        throw new ApiError("NOT_FOUND", "Member not found.", 404);
      }
      if (error.code === "23514") throw new ApiError("CONFLICT", "At least one active administrator must remain.", 409);
      throw error;
    }

    const result = data as {
      id?: string;
      displayName?: string;
      username?: string;
      status?: string;
      accountStatus?: string;
      createdAt?: string;
      roles?: string[];
    } | null;
    return Response.json({
      data: {
        id: result?.id ?? body.userId,
        displayName: result?.displayName ?? "",
        username: result?.username ?? "",
        status: result?.status ?? (hasStatus ? body.status : "active"),
        accountStatus: result?.accountStatus,
        createdAt: result?.createdAt,
        role: normalizeMemberRole(result?.roles),
      },
      requestId,
    });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}

export async function GET() {
  return toErrorResponse(new ApiError("NOT_FOUND", "Not found.", 404), crypto.randomUUID());
}
