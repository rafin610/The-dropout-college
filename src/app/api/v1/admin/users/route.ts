import { getUserPermissions, requirePermission } from "@/server/auth/permissions";
import {
  canManageMember,
  isAssignableRole,
  isMemberStatus,
  type AssignableRole,
  type MemberStatus,
} from "@/server/admin/member-policy";
import { ApiError, toErrorResponse } from "@/server/errors";
import { createSupabaseAdminClient } from "@/server/supabase/server";

export const runtime = "nodejs";

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
    if (status !== undefined && !isMemberStatus(status)) {
      throw new ApiError("VALIDATION_ERROR", "The member update is invalid.", 400);
    }
    if (role !== undefined && !isAssignableRole(role)) {
      throw new ApiError("VALIDATION_ERROR", "That role cannot be assigned.", 400);
    }
    if (status === undefined && role === undefined) {
      throw new ApiError("VALIDATION_ERROR", "Choose a status or role to update.", 400);
    }

    const normalizedStatus = status as MemberStatus | undefined;
    const normalizedRole = role as AssignableRole | undefined;

    const actorPermissions = await getUserPermissions(actor.id);
    if (normalizedRole !== undefined && !actorPermissions.has("*") && !actorPermissions.has("roles.manage")) {
      throw new ApiError("FORBIDDEN", "You do not have permission to change member roles.", 403);
    }

    const supabase = getAdminClient();
    const { data: target, error: targetError } = await supabase
      .from("profiles")
      .select("id, display_name, username, status, created_at, user_roles(role), user_admin_roles(admin_roles(slug)), users(email, account_status)")
      .eq("id", userId)
      .maybeSingle();
    if (targetError) throw targetError;
    if (!target) throw new ApiError("NOT_FOUND", "Member not found.", 404);

    const targetRoles = [
      ...(Array.isArray(target.user_roles) ? target.user_roles : target.user_roles ? [target.user_roles] : [])
        .map((entry: { role?: string | null }) => entry.role)
        .filter((value): value is string => Boolean(value)),
      ...(Array.isArray(target.user_admin_roles) ? target.user_admin_roles : target.user_admin_roles ? [target.user_admin_roles] : [])
        .flatMap((entry: { admin_roles?: { slug?: string | null } | Array<{ slug?: string | null }> | null }) => {
          const role = entry?.admin_roles;
          const list = Array.isArray(role) ? role : role ? [role] : [];
          return list.map((item) => item?.slug).filter((value): value is string => Boolean(value));
        }),
    ];

    const policy = canManageMember(
      { id: actor.id, isSuperAdmin: actorPermissions.has("*") },
      { id: target.id, roles: targetRoles },
    );
    if (!policy.allowed) {
      throw new ApiError("FORBIDDEN", policy.message ?? "You cannot change this member.", 403);
    }

    // The RPC updates users, profiles, roles, and the audit log in one
    // transaction. It also re-checks the hierarchy and the last-super-admin
    // invariant while holding a lock, so concurrent requests cannot race past
    // those checks.
    const { data: updatedData, error: updateError } = await supabase.rpc("admin_update_member", {
      p_actor_id: actor.id,
      p_user_id: userId,
      p_status: normalizedStatus ?? null,
      p_role: normalizedRole ?? null,
      p_request_id: requestId,
    });

    if (updateError) {
      if (
        updateError.code === "PGRST202" ||
        updateError.message?.includes("admin_update_member")
      ) {
        throw new ApiError(
          "SERVICE_UNAVAILABLE",
          "Member management is not ready. Apply supabase/migrations/0013_security_hardening.sql first.",
          503,
        );
      }
      if (updateError.code === "42501") {
        throw new ApiError("FORBIDDEN", "You cannot change this member.", 403);
      }
      if (updateError.code === "P0002") {
        throw new ApiError("NOT_FOUND", "Member not found.", 404);
      }
      if (updateError.code === "23514") {
        throw new ApiError(
          "CONFLICT",
          "At least one active super admin must remain.",
          409,
        );
      }
      if (updateError.code === "22023") {
        throw new ApiError("VALIDATION_ERROR", "The member update is invalid.", 400);
      }
      throw updateError;
    }

    // Supabase Auth's ban prevents refresh tokens from minting new access
    // tokens. The application-level account check covers the remaining
    // lifetime of an already-issued access token.
    if (normalizedStatus !== undefined) {
      const banDuration = normalizedStatus === "active" ? "none" : "876000h";
      const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
        ban_duration: banDuration,
      });
      if (authError) {
        console.warn(
          "[admin/users] Could not update the auth ban state:",
          authError.message,
        );
      }
    }

    const updated = (updatedData ?? {}) as Record<string, unknown>;
    const rowUser = Array.isArray(target.users) ? target.users[0] : target.users;
    return Response.json({
      data: {
        id: updated.id ?? target.id,
        displayName: updated.displayName ?? target.display_name,
        username: updated.username ?? target.username,
        email: updated.email ?? rowUser?.email ?? "",
        status: updated.status ?? normalizedStatus ?? target.status,
        accountStatus: updated.accountStatus ?? normalizedStatus ?? rowUser?.account_status ?? "active",
        createdAt: updated.createdAt ?? target.created_at,
        roles: Array.isArray(updated.roles)
          ? updated.roles
          : [normalizedRole ?? getSingleRole(targetRoles.map((role) => ({ role })))],
      },
      requestId,
    });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
