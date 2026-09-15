import { getUserPermissions, requirePermission } from "@/server/auth/permissions";
import { ApiError, toErrorResponse } from "@/server/errors";
import { createSupabaseAdminClient } from "@/server/supabase/server";

export const runtime = "nodejs";

const validStatuses = ["active", "suspended", "deleted"] as const;
const assignableRoles = ["member", "mentor", "event_organizer", "moderator", "admin"] as const;

function isValidStatus(value: string): value is (typeof validStatuses)[number] {
  return validStatuses.includes(value as (typeof validStatuses)[number]);
}

function isValidRole(value: string): value is (typeof assignableRoles)[number] {
  return assignableRoles.includes(value as (typeof assignableRoles)[number]);
}

function getAdminClient() {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new ApiError("SERVICE_UNAVAILABLE", "Admin member management is not configured.", 503);
  }
  return supabase;
}

function getSingleRole(roles: Array<{ role?: string | null }> | null | undefined) {
  const role = roles?.map((entry) => entry.role).find(Boolean);
  return role ?? "member";
}

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  try {
    const actor = await requirePermission("users.manage");
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") ?? "").trim();
    const status = searchParams.get("status");
    const role = searchParams.get("role");
    const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "10") || 10));

    const supabase = getAdminClient();
    let query = supabase.from("profiles").select("id, display_name, username, bio, status, created_at, user_roles(role), users(email, account_status)", { count: "exact" });

    if (search) {
      query = query.or(`display_name.ilike.%${search}%,username.ilike.%${search}%,users.email.ilike.%${search}%`);
    }
    if (status) {
      query = query.eq("status", status);
    }
    if (role) {
      query = query.filter("user_roles.role", "in", `(${role})`);
    }

    const { data, error, count } = await query.order("created_at", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
    if (error) throw error;
    const actorPermissions = await getUserPermissions(actor.id);

    return Response.json({
      data: (data ?? []).map((row) => {
        const rowUser = Array.isArray(row.users) ? row.users[0] : row.users;
        const rawRoles = Array.isArray(row.user_roles) ? row.user_roles : row.user_roles ? [row.user_roles] : [];
        const roles = rawRoles.map((entry: { role?: string } | null) => entry?.role).filter(Boolean) as string[];

        return {
          id: row.id,
          displayName: row.display_name,
          username: row.username,
          email: rowUser?.email ?? "",
          status: row.status ?? "active",
          accountStatus: rowUser?.account_status ?? "active",
          createdAt: row.created_at,
          roles: roles.length ? roles : ["member"],
        };
      }),
      pagination: { page, pageSize, total: count ?? 0 },
      capabilities: {
        canManageRoles: actorPermissions.has("*") || actorPermissions.has("roles.manage"),
      },
      requestId,
    });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}

export async function PUT(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  try {
    const actor = await requirePermission("users.manage");
    const payload = await request.json();
    const { userId, status, role } = payload ?? {};
    if (typeof userId !== "string" || !userId) throw new ApiError("VALIDATION_ERROR", "A user ID is required.", 400);
    if (status !== undefined && (typeof status !== "string" || !isValidStatus(status))) {
      throw new ApiError("VALIDATION_ERROR", "The member update is invalid.", 400);
    }
    if (role !== undefined && (typeof role !== "string" || !isValidRole(role))) {
      throw new ApiError("VALIDATION_ERROR", "That role cannot be assigned.", 400);
    }
    if (status === undefined && role === undefined) {
      throw new ApiError("VALIDATION_ERROR", "Choose a status or role to update.", 400);
    }

    const normalizedStatus = status as (typeof validStatuses)[number] | undefined;
    const normalizedRole = role as (typeof assignableRoles)[number] | undefined;

    const actorPermissions = await getUserPermissions(actor.id);
    if (normalizedRole !== undefined && !actorPermissions.has("*") && !actorPermissions.has("roles.manage")) {
      throw new ApiError("FORBIDDEN", "You do not have permission to change member roles.", 403);
    }

    const supabase = getAdminClient();
    const { data: target, error: targetError } = await supabase
      .from("profiles")
      .select("id, display_name, username, status, created_at, user_roles(role), users(email, account_status)")
      .eq("id", userId)
      .maybeSingle();
    if (targetError) throw targetError;
    if (!target) throw new ApiError("NOT_FOUND", "Member not found.", 404);

    const targetRoles = Array.isArray(target.user_roles) ? target.user_roles : target.user_roles ? [target.user_roles] : [];
    if (role !== undefined && targetRoles.some((entry: { role?: string | null }) => entry.role === "super_admin") && !actorPermissions.has("*")) {
      throw new ApiError("FORBIDDEN", "Only a super admin can change another super admin.", 403);
    }

    const updatedAt = new Date().toISOString();
    if (normalizedStatus !== undefined) {
      const [{ error: profileError }, { error: accountError }] = await Promise.all([
        supabase.from("profiles").update({ status: normalizedStatus, updated_at: updatedAt }).eq("id", userId),
        supabase.from("users").update({ account_status: normalizedStatus, updated_at: updatedAt }).eq("id", userId),
      ]);
      if (profileError) throw profileError;
      if (accountError) throw accountError;
    }

    if (normalizedRole !== undefined) {
      const { error: deleteError } = await supabase.from("user_roles").delete().eq("profile_id", userId);
      if (deleteError) throw deleteError;
      const { error: insertError } = await supabase.from("user_roles").insert({ profile_id: userId, role: normalizedRole });
      if (insertError) throw insertError;
    }

    const rowUser = Array.isArray(target.users) ? target.users[0] : target.users;
    return Response.json({
      data: {
        id: target.id,
        displayName: target.display_name,
        username: target.username,
        email: rowUser?.email ?? "",
        status: normalizedStatus ?? target.status,
        accountStatus: normalizedStatus ?? rowUser?.account_status ?? "active",
        createdAt: target.created_at,
        roles: [normalizedRole ?? getSingleRole(targetRoles)],
      },
      requestId,
    });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
