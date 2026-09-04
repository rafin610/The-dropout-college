import { getCurrentUser } from "@/server/auth/current-user";
import { toErrorResponse } from "@/server/errors";
import { createSupabaseServerClient } from "@/server/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) { const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID(); try { const user = await getCurrentUser(); const supabase = await createSupabaseServerClient(); const { data, error } = await supabase.from("notifications").select("*").eq("profile_id", user.id).order("created_at", { ascending: false }).limit(50); if (error) throw error; return Response.json({ data, requestId }); } catch (error) { return toErrorResponse(error, requestId); } }