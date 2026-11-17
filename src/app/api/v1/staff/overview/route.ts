import { isMissingDatabaseObject, requireStaffClient } from "@/server/admin/access";
import { ApiError, toErrorResponse } from "@/server/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const requestId = crypto.randomUUID();
  try {
    const { supabase } = await requireStaffClient("dashboard.read");
    const { data, error } = await supabase.rpc("admin_get_staff_overview");
    if (error) {
      if (isMissingDatabaseObject(error)) {
        throw new ApiError("SERVICE_UNAVAILABLE", "Apply the Campus social and staff admin migrations to load community statistics.", 503);
      }
      throw error;
    }

    return Response.json({ data, requestId }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
