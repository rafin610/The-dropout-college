import { ApiError, toErrorResponse } from "@/server/errors";
import { isMissingDatabaseObject, requireStaffClient } from "@/server/admin/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    const { user, supabase } = await requireStaffClient("users.manage");
    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
    const pageSize = Number.parseInt(searchParams.get("pageSize") ?? "25", 10);
    const status = searchParams.get("status") || null;
    const role = searchParams.get("role") || null;
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) {
      throw new ApiError("VALIDATION_ERROR", "Choose a valid member page.", 400);
    }
    if (status && !["active", "suspended", "deleted"].includes(status)) {
      throw new ApiError("VALIDATION_ERROR", "Choose a valid account status.", 400);
    }
    if (role && !["member", "moderator", "admin"].includes(role)) {
      throw new ApiError("VALIDATION_ERROR", "Choose a valid member role.", 400);
    }

    const search = (searchParams.get("search") ?? "").trim().slice(0, 80).replace(/[%_\\]/g, "");
    const { data, error } = await supabase.rpc("admin_list_members", {
      p_actor_id: user.id,
      p_page: page,
      p_page_size: pageSize,
      p_search: search,
      p_status: status,
      p_role: role,
    });

    if (error) {
      if (isMissingDatabaseObject(error)) {
        throw new ApiError("SERVICE_UNAVAILABLE", "Apply the staff admin database migration to enable member management.", 503);
      }
      if (error.code === "42501") throw new ApiError("FORBIDDEN", "Member management permission is required.", 403);
      throw error;
    }

    return Response.json({ data, requestId }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
