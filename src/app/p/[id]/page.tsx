import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { getViewerProfile } from "@/server/auth/viewer";
import { getPostById, listComments } from "@/server/posts/posts";
import { PostDetail } from "./post-detail";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const viewer = await getViewerProfile();
  const result = await getPostById(id, viewer?.id);
  if (!result.post) return { title: "Post not found" };

  const description = result.post.content.slice(0, 180);
  return {
    title: `${result.post.author.displayName} on Campus`,
    description,
    openGraph: {
      title: `${result.post.author.displayName} on The DropOut College`,
      description,
      type: "article",
      images: result.post.imageUrl ? [{ url: result.post.imageUrl }] : undefined,
    },
    twitter: {
      card: result.post.imageUrl ? "summary_large_image" : "summary",
      title: `${result.post.author.displayName} on The DropOut College`,
      description,
      images: result.post.imageUrl ? [result.post.imageUrl] : undefined,
    },
  };
}

export default async function PostPage({ params }: PageProps) {
  const { id } = await params;
  const viewer = await getViewerProfile();
  const result = await getPostById(id, viewer?.id);

  if (result.unavailable) {
    return (
      <div className="c-page-narrow">
        <div className="c-empty">
          <div className="c-empty-icon"><MessageCircle size={20} /></div>
          <h1>The feed is being prepared</h1>
          <p>Apply the latest database migration to switch posts on.</p>
          <Link href="/" className="c-button">Back home</Link>
        </div>
      </div>
    );
  }

  if (!result.post) notFound();

  const comments = await listComments(result.post.id);

  return (
    <PostDetail
      initialPost={result.post}
      initialComments={comments}
      viewer={viewer}
    />
  );
}
