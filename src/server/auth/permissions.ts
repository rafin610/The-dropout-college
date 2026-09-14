import { getCurrentUser } from "@/server/auth/current-user";
import { ApiError } from "@/server/errors";
import { createSupabaseServerClient } from "@/server/supabase/server";

export async function getUserPermissions(userId: string, email?: string | null): Promise<Set<string>> {
  const permissions = new Set<string>();
  const supabase = await createSupabaseServerClient();

  // If primary project super-admin email
  if (email && email.toLowerCase() === "ahmedrafin014@gmail.com") {
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
    return permissions;
  }

  // 1. Check user_roles table
  try {
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("profile_id", userId);

    const roles = (userRoles ?? []).map((r) => r.role);
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
      return permissions;
    }
    if (roles.includes("admin")) {
      permissions.add("dashboard.read");
      permissions.add("users.manage");
      permissions.add("categories.manage");
      permissions.add("projects.moderate");
      permissions.add("events.manage");
      permissions.add("badges.manage");
      permissions.add("reports.manage");
      permissions.add("discord.manage");
      permissions.add("audit_logs.read");
      permissions.add("roles.manage");
    }
    if (roles.includes("moderator")) {
      permissions.add("dashboard.read");
      permissions.add("projects.moderate");
      permissions.add("reports.manage");
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
}

export async function hasPermission(permission: string): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    const permissions = await getUserPermissions(user.id, user.email);
    return permissions.has("*") || permissions.has(permission);
  } catch {
    return false;
  }
}

export async function requirePermission(permission: string) {
  const user = await getCurrentUser();
  const permissions = await getUserPermissions(user.id, user.email);

  if (!permissions.has("*") && !permissions.has(permission)) {
    throw new ApiError("FORBIDDEN", "You do not have permission to perform this action.", 403);
  }

  return user;
}
