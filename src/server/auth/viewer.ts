import { cache } from "react";
import { getOptionalUser } from "@/server/auth/current-user";
import { getMemberRole, type MemberRole } from "@/server/auth/roles";
import { createSupabaseServerClient } from "@/server/supabase/server";

export interface ViewerProfile {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  role: MemberRole;
}

export const getViewerProfile = cache(async (): Promise<ViewerProfile | null> => {
  const user = await getOptionalUser();
  if (!user) return null;

  try {
    const supabase = await createSupabaseServerClient();
    const [{ data: profile }, role] = await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, username, avatar_url")
        .eq("id", user.id)
        .maybeSingle(),
      getMemberRole(user.id),
    ]);

    return {
      id: user.id,
      displayName:
        profile?.display_name ||
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        "Member",
      username: profile?.username || "",
      avatarUrl: profile?.avatar_url || null,
      role,
    };
  } catch {
    return {
      id: user.id,
      displayName:
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        "Member",
      username: "",
      avatarUrl: null,
      role: "member",
    };
  }
});
