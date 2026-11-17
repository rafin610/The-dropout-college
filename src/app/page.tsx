import type { Metadata } from "next";
import { getOptionalUser } from "@/server/auth/current-user";
import { getViewerProfile } from "@/server/auth/viewer";
import { listPosts } from "@/server/posts/posts";
import { Feed } from "@/components/posts/feed";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Home",
  description: "Recent thoughts from The DropOut College campus.",
};

export default async function HomePage() {
  // Resolve the session once, then let the posts query run while the
  // profile/role details are loading instead of waiting on them in series.
  const user = await getOptionalUser();
  const [viewer, result] = await Promise.all([
    getViewerProfile(),
    listPosts({ page: 1, limit: 10, viewerId: user?.id }),
  ]);

  return (
    <div className="c-page">
      <header className="app-page-head">
        <div>
          <p className="c-kicker">Campus feed</p>
          <h1 className="app-page-title">Recent thoughts</h1>
        </div>
        <span className="app-page-note">Newest first</span>
      </header>

      <Feed
        initialPosts={result.posts}
        initialTotal={result.total}
        initialUnavailable={result.unavailable}
        viewer={viewer}
        viewerRole={viewer?.role ?? "member"}
      />
    </div>
  );
}
