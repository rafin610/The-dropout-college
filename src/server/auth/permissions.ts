import { getCurrentUser } from "@/server/auth/current-user";
import { ApiError } from "@/server/errors";
import { createSupabaseServerClient } from "@/server/supabase/server";

export async function requirePermission(permission: string) {
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("user_admin_roles").select("admin_roles!inner(admin_role_permissions!inner(permissions!inner(key)))").eq("user_id", user.id);

  if (error) throw error;
  const permissions = data.flatMap((entry) => entry.admin_roles as unknown as Array<{ admin_role_permissions: Array<{ permissions: { key: string } }> }>).flatMap((role) => role.admin_role_permissions.map((item) => item.permissions.key));
  if (!permissions.includes(permission)) throw new ApiError("FORBIDDEN", "You do not have permission to perform this action.", 403);
  return user;
}