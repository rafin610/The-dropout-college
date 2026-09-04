import { createSupabaseServerClient } from "@/server/supabase/server";
import { ApiError } from "@/server/errors";

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new ApiError("UNAUTHENTICATED", "You must be signed in.", 401);
  }

  return data.user;
}