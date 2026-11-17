import { requirePermission } from "@/server/auth/permissions";
import { ApiError, toErrorResponse } from "@/server/errors";
import { createSupabaseServerClient } from "@/server/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const permissionDescriptions = [
  { key: "dashboard.read", label: "View staff dashboard" },
  { key: "users.manage", label: "View and manage member accounts" },
  { key: "projects.moderate", label: "Moderate community projects" },
  { key: "articles.create", label: "Create and edit journal drafts" },
  { key: "articles.publish", label: "Publish and unpublish journals" },
  { key: "articles.moderate", label: "Review journal articles" },
  { key: "reports.manage", label: "Manage community reports" },
] as const;

export async function GET() {
  const requestId = crypto.randomUUID();
  try {
    await requirePermission("dashboard.read");
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("admin_roles")
      .select("id, admin_role_permissions(permissions(key))")
      .eq("slug", "moderator")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new ApiError("SERVICE_UNAVAILABLE", "Moderator permissions are not configured.", 503);

    const enabled = new Set<string>();
    for (const assignment of data.admin_role_permissions ?? []) {
      const rawPermission = assignment.permissions;
      const permissions = Array.isArray(rawPermission) ? rawPermission : rawPermission ? [rawPermission] : [];
      for (const permission of permissions as Array<{ key?: string }>) {
        if (permission.key) enabled.add(permission.key);
      }
    }

    return Response.json({
      data: permissionDescriptions.map((permission) => ({
        ...permission,
        enabled: enabled.has(permission.key),
      })),
      requestId,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}

export async function PATCH(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const actor = await requirePermission("roles.manage");
    const supabase = await createSupabaseServerClient();

    const body = (await request.json().catch(() => null)) as { permission?: unknown; enabled?: unknown } | null;
    if (
      !body ||
      typeof body.permission !== "string" ||
      !permissionDescriptions.some((permission) => permission.key === body.permission) ||
      typeof body.enabled !== "boolean"
    ) {
      throw new ApiError("VALIDATION_ERROR", "Choose a supported Moderator permission.", 400);
    }

    const { error } = await supabase.rpc("admin_set_moderator_permission", {
      p_actor_id: actor.id,
      p_permission_key: body.permission,
      p_enabled: body.enabled,
      p_request_id: requestId,
    });
    if (error) {
      if (error.code === "PGRST202") {
        throw new ApiError("SERVICE_UNAVAILABLE", "Apply the staff admin database migration to manage permissions.", 503);
      }
      if (error.code === "42501") throw new ApiError("FORBIDDEN", "Only an administrator can manage Moderator permissions.", 403);
      if (error.code === "22023") throw new ApiError("VALIDATION_ERROR", "That permission cannot be assigned to Moderators.", 400);
      throw error;
    }

    return Response.json({ data: { permission: body.permission, enabled: body.enabled }, requestId });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
