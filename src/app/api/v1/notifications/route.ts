import { getCurrentUser } from "@/server/auth/current-user";
import { toErrorResponse } from "@/server/errors";
import { createSupabaseServerClient } from "@/server/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    const user = await getCurrentUser();
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return Response.json({ data: data ?? [], requestId });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    const user = await getCurrentUser();
    const supabase = await createSupabaseServerClient();
    const payload = await request.json().catch(() => ({}));
    const id = payload?.id;

    let query = supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("profile_id", user.id);

    if (id) {
      query = query.eq("id", id);
    } else {
      query = query.is("read_at", null);
    }

    const { error } = await query;
    if (error) throw error;

    return Response.json({ data: { success: true }, requestId });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}