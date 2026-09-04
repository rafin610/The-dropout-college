import { toErrorResponse } from "@/server/errors";
import { createSupabaseServerClient } from "@/server/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("categories").select("id, slug, name, description, icon, color").eq("is_active", true).order("sort_order");
    if (error) throw error;
    return Response.json({ data, requestId });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}