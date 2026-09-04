import { requirePermission } from "@/server/auth/permissions";
import { toErrorResponse } from "@/server/errors";
import { createSupabaseServerClient } from "@/server/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    await requirePermission("dashboard.read");
    const supabase = await createSupabaseServerClient();
    const [users, projects, teams, events, reports] = await Promise.all([
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase.from("projects").select("id", { count: "exact", head: true }).is("deleted_at", null),
      supabase.from("teams").select("id", { count: "exact", head: true }),
      supabase.from("events").select("id", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("moderation_reports").select("id", { count: "exact", head: true }).in("status", ["open", "in_review"]),
    ]);
    const failure = [users, projects, teams, events, reports].find((result) => result.error);
    if (failure?.error) throw failure.error;
    return Response.json({ data: { users: users.count ?? 0, projects: projects.count ?? 0, teams: teams.count ?? 0, events: events.count ?? 0, openReports: reports.count ?? 0 }, requestId });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}