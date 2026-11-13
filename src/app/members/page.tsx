import type { Metadata } from "next";
import { normalizeMemberRole } from "@/server/auth/roles";
import { getViewerProfile } from "@/server/auth/viewer";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { MembersDirectory } from "@/components/members/members-directory";
import type { DirectoryMember } from "@/components/members/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Members",
  description: "Find the people learning, making, and thinking in The DropOut College campus.",
};

async function loadMembers(): Promise<DirectoryMember[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url, bio, user_roles(role)")
    .eq("status", "active")
    .order("display_name")
    .limit(500);

  if (error) throw error;

  return (data ?? []).map((profile) => {
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
}

export default async function MembersPage() {
  const [members, viewer] = await Promise.all([loadMembers(), getViewerProfile()]);

  return (
    <div className="c-page c-page-wide">
      <header className="app-page-head">
        <div>
          <p className="c-kicker">The community</p>
          <h1 className="app-page-title">Members</h1>
        </div>
        <span className="app-page-note">{members.length} on campus</span>
      </header>

      <MembersDirectory members={members} viewerId={viewer?.id ?? null} />
    </div>
  );
}
