import { getCurrentUser } from "@/server/auth/current-user";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { ApiError } from "@/server/errors";

export type MemberRole = "member" | "moderator" | "admin";

export function normalizeMemberRole(roles: readonly string[] | null | undefined): MemberRole {
  if (!roles) return "member";
  if (roles.includes("admin") || roles.includes("super_admin")) return "admin";
  if (roles.includes("moderator")) return "moderator";
  return "member";
}

export function isStaffRole(role: MemberRole | null | undefined): boolean {
  return role === "admin" || role === "moderator";
}

export function roleLabel(role: MemberRole | string | null | undefined): string {
  const clean = (role || "member").replaceAll("_", " ");
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export async function getMemberRole(userId: string): Promise<MemberRole> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("profile_id", userId);

  if (error) return "member";
  return normalizeMemberRole((data ?? []).map((row) => String(row.role)));
}

export async function requireStaff(): Promise<{ id: string; role: MemberRole }> {
  const user = await getCurrentUser();
  const role = await getMemberRole(user.id);
  if (!isStaffRole(role)) {
    throw new ApiError("FORBIDDEN", "Staff access is required.", 403);
  }
  return { id: user.id, role };
}
