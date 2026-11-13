import type { Metadata } from "next";
import { getViewerProfile } from "@/server/auth/viewer";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { getMemberDirectoryPage } from "@/server/members/directory";
import { MembersDirectory } from "@/components/members/members-directory";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Members",
  description: "Find the people learning, making, and thinking in The DropOut College campus.",
};

export default async function MembersPage() {
  const [supabase, viewer] = await Promise.all([
    createSupabaseServerClient(),
    getViewerProfile(),
  ]);
  const directory = await getMemberDirectoryPage(supabase, {
    page: 1,
    viewerId: viewer?.id,
  });

  return (
    <div className="c-page c-page-wide">
      <header className="app-page-head">
        <div>
          <p className="c-kicker">The community</p>
          <h1 className="app-page-title">Members</h1>
        </div>
        <span className="app-page-note">{directory.total.toLocaleString()} on campus</span>
      </header>

      <MembersDirectory
        members={directory.members}
        viewerId={viewer?.id ?? null}
        initialFollowingIds={directory.followingIds}
        initialTotal={directory.total}
      />
    </div>
  );
}
