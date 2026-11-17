import { requirePermission } from "@/server/auth/permissions";
import { createSupabaseServerClient } from "@/server/supabase/server";

export async function requireStaffClient(permission: string) {
  const user = await requirePermission(permission);
  const supabase = await createSupabaseServerClient();
  return { user, supabase };
}

export function isMissingDatabaseObject(error: { code?: string; message?: string } | null) {
  return Boolean(
    error &&
      (error.code === "42P01" ||
        error.code === "PGRST202" ||
        error.code === "PGRST205" ||
        error.message?.includes("does not exist")),
  );
}
