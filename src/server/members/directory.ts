import { normalizeMemberRole } from "@/server/auth/roles";
import { createSupabaseServerClient } from "@/server/supabase/server";
import type { DirectoryMember } from "@/components/members/types";

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export const MEMBER_DIRECTORY_PAGE_SIZE = 30;

export interface MemberDirectoryPage {
  members: DirectoryMember[];
  followingIds: string[];
  total: number;
  page: number;
  hasMore: boolean;
}

export async function getMemberDirectoryPage(
  supabase: SupabaseClient,
  {
    page,
    search,
    viewerId,
  }: {
    page: number;
    search?: string;
    viewerId?: string | null;
  },
): Promise<MemberDirectoryPage> {
  const cleanSearch = (search ?? "")
    .trim()
    .slice(0, 80)
    .replace(/[,%()\\*]/g, "");
  let request = supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url, bio, user_roles(role)", { count: "exact" })
    .eq("status", "active")
    .order("display_name")
    .order("id");

  if (cleanSearch) {
    const term = `%${cleanSearch}%`;
    request = request.or(
      `display_name.ilike.${term},username.ilike.${term},bio.ilike.${term}`,
    );
  }

  const from = (page - 1) * MEMBER_DIRECTORY_PAGE_SIZE;
  const { data, error, count } = await request.range(from, from + MEMBER_DIRECTORY_PAGE_SIZE - 1);
  if (error) throw error;

  const members: DirectoryMember[] = (data ?? []).map((profile) => {
    const rawRoles = Array.isArray(profile.user_roles)
      ? profile.user_roles
      : profile.user_roles
        ? [profile.user_roles]
        : [];
    return {
      id: profile.id,
      displayName: profile.display_name,
      username: profile.username,
      avatarUrl: profile.avatar_url,
      bio: profile.bio,
      role: normalizeMemberRole(
        rawRoles
          .map((entry: { role?: string | null }) => String(entry?.role ?? ""))
          .filter(Boolean),
      ),
    };
  });

  let followingIds: string[] = [];
  if (viewerId && members.length) {
    const { data: follows, error: followsError } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", viewerId)
      .in("following_id", members.map((member) => member.id));
    if (followsError) throw followsError;
    followingIds = (follows ?? []).map((follow) => follow.following_id);
  }

  const total = count ?? members.length;
  return {
    members,
    followingIds,
    total,
    page,
    hasMore: from + members.length < total,
  };
}
