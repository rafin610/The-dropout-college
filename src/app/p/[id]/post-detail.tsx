"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PostCard } from "@/components/posts/post-card";
import { CommentSection } from "@/components/posts/comment-section";
import type { Post, PostComment } from "@/server/posts/posts";
import type { MemberRole } from "@/server/auth/roles";

export function PostDetail({
  initialPost,
  initialComments,
  viewer,
}: {
  initialPost: Post;
  initialComments: PostComment[];
  viewer: { id: string; displayName: string; avatarUrl: string | null; role: MemberRole } | null;
}) {
  const router = useRouter();
  const [post, setPost] = useState(initialPost);

  return (
    <div className="c-page">
      <Link href="/" className="c-back">
        <ArrowLeft size={15} />
        <span>Back to the feed</span>
      </Link>

      <PostCard
        post={post}
        viewerId={viewer?.id ?? null}
        viewerRole={viewer?.role ?? "member"}
        onChange={setPost}
        onDeleted={() => {
          router.push("/");
          router.refresh();
        }}
        detail
      />

      <CommentSection
        postId={post.id}
        initialComments={initialComments}
        viewer={viewer}
        onCountChange={(count) => setPost((current) => ({ ...current, commentCount: count }))}
      />
    </div>
  );
}
