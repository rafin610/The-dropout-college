import { cache } from "react";
import { getCurrentUser, getAccountStatus } from "@/server/auth/current-user";
import { isActiveAccountStatus } from "@/server/auth/account-status";
import { ApiError } from "@/server/errors";
import { createSupabaseServerClient } from "@/server/supabase/server";

export const getUserPermissions = cache(async (userId: string): Promise<Set<string>> => {
  const permissions = new Set<string>();

  // Defence in depth: a suspended account must not inherit staff permissions
  // even if a stale session or a caller bypasses getCurrentUser().
  try {
    const status = await getAccountStatus(userId);
    if (status !== null && !isActiveAccountStatus(status)) return permissions;
  } catch {
    return permissions;
  }

  const supabase = await createSupabaseServerClient();

  // 1. Check user_roles table
  try {
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("profile_id", userId);

    if (userRoles === null) {
      return permissions;
    }

    const roles = userRoles.map((r) => r.role);
    if (roles.includes("super_admin")) {
      permissions.add("*");
      permissions.add("dashboard.read");
      permissions.add("users.manage");
      permissions.add("categories.manage");
      permissions.add("projects.moderate");
      permissions.add("events.manage");
      permissions.add("badges.manage");
      permissions.add("reports.manage");
      permissions.add("discord.manage");
      permissions.add("roles.manage");
      permissions.add("audit_logs.read");
      permissions.add("site.manage");
      return permissions;
    }

    const configuredRoles = roles.filter((role) => role === "admin" || role === "moderator");
    if (configuredRoles.length) {
      const { data: roleDefinitions, error: definitionsError } = await supabase
        .from("admin_roles")
        .select("slug, admin_role_permissions(permissions(key))")
        .in("slug", configuredRoles);
      if (definitionsError) throw definitionsError;

      for (const roleDefinition of roleDefinitions ?? []) {
        const rawPermissions = roleDefinition.admin_role_permissions;
        const assignments = Array.isArray(rawPermissions)
          ? rawPermissions
          : rawPermissions
            ? [rawPermissions]
            : [];
        for (const assignment of assignments as Array<Record<string, unknown>>) {
          const rawPermission = assignment.permissions;
          const permission = Array.isArray(rawPermission) ? rawPermission[0] : rawPermission;
          if (permission && typeof permission === "object" && "key" in permission && typeof permission.key === "string") {
            permissions.add(permission.key);
          }
        }
      }
    }

    if (roles.includes("event_organizer")) {
      permissions.add("dashboard.read");
      permissions.add("events.manage");
    }
  } catch {
    // Non-fatal if table check fails
  }

  // 2. Check user_admin_roles table
  try {
    const { data, error } = await supabase
      .from("user_admin_roles")
      .select("admin_roles(slug, admin_role_permissions(permissions(key)))")
      .eq("user_id", userId);

    if (!error && data) {
      for (const entry of data as Array<Record<string, unknown>>) {
        const rawRole = entry.admin_roles;
        const rolesList = Array.isArray(rawRole) ? rawRole : rawRole ? [rawRole] : [];
        for (const r of rolesList as Array<Record<string, unknown>>) {
          if (r.slug === "super_admin") {
            permissions.add("*");
            permissions.add("dashboard.read");
            permissions.add("users.manage");
            permissions.add("categories.manage");
            permissions.add("projects.moderate");
            permissions.add("events.manage");
            permissions.add("badges.manage");
            permissions.add("reports.manage");
            permissions.add("discord.manage");
            permissions.add("roles.manage");
            permissions.add("audit_logs.read");
            permissions.add("site.manage");
            return permissions;
          }

          const rawPerms = r.admin_role_permissions;
          const permsList = Array.isArray(rawPerms) ? rawPerms : rawPerms ? [rawPerms] : [];
          for (const p of permsList as Array<Record<string, unknown>>) {
            const rawP = p.permissions;
            const pObj = Array.isArray(rawP) ? rawP[0] : rawP;
            if (pObj && typeof pObj === "object" && "key" in pObj && typeof pObj.key === "string") {
              permissions.add(pObj.key);
            }
          }
        }
      }
    }
  } catch {
    // Continue
  }

  return permissions;
});

export async function hasPermission(permission: string): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    const permissions = await getUserPermissions(user.id);
    return permissions.has("*") || permissions.has(permission);
  } catch {
    return false;
  }
}

export async function requirePermission(permission: string) {
  const user = await getCurrentUser();
  const permissions = await getUserPermissions(user.id);

  if (!permissions.has("*") && !permissions.has(permission)) {
    throw new ApiError("FORBIDDEN", "You do not have permission to perform this action.", 403);
  }

  return user;
}
