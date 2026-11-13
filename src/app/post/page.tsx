import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, PenLine } from "lucide-react";
import { getViewerProfile } from "@/server/auth/viewer";
import { PostComposer } from "@/components/posts/post-composer";
import { Avatar } from "@/components/avatar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New post",
  description: "Share a short thought with The DropOut College.",
};

export default async function NewPostPage() {
  const viewer = await getViewerProfile();

  if (!viewer) {
    return (
      <div className="c-page-narrow">
        <div className="c-empty c-auth-empty">
          <div className="c-empty-icon">
            <PenLine size={20} />
          </div>
          <h1>The campus is members-only</h1>
          <p>Sign in with Google to share a thought, Love a post, or join a conversation.</p>
          <Link href="/login?next=%2Fpost" className="c-button c-button-primary">
            Sign in to post
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="c-page c-compose-page">
      <Link href="/" className="c-back">
        <ArrowLeft size={15} />
        <span>Cancel</span>
      </Link>

      <header className="app-page-head c-compose-head">
        <div>
          <p className="c-kicker">New post</p>
          <h1 className="app-page-title">Say it plainly.</h1>
        </div>
        <span className="app-page-note">300 characters</span>
      </header>

      <PostComposer viewer={viewer} />

      <div className="c-detail-note c-compose-note">
        <Avatar src={null} name="Tip" size={24} />
        <p>
          Posts are public and can be deleted at any time. Keep the tone thoughtful — moderators can
          remove content that breaks the community’s calm.
        </p>
      </div>
    </div>
  );
}
