import { isMissingDatabaseObject, requireStaffClient } from "@/server/admin/access";
import { ApiError, toErrorResponse } from "@/server/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const { supabase } = await requireStaffClient("users.manage");
    const { id } = await context.params;
    if (!UUID.test(id)) throw new ApiError("NOT_FOUND", "Member not found.", 404);

    const { data, error } = await supabase.rpc("admin_get_member_detail", { p_user_id: id });
    if (error) {
      if (isMissingDatabaseObject(error)) {
        throw new ApiError("SERVICE_UNAVAILABLE", "Apply the staff admin database migration to view member activity.", 503);
      }
      if (error.code === "P0002") throw new ApiError("NOT_FOUND", "Member not found.", 404);
      if (error.code === "42501") throw new ApiError("FORBIDDEN", "Member management permission is required.", 403);
      throw error;
    }

    return Response.json({ data, requestId }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
