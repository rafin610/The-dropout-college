import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getViewerProfile } from "@/server/auth/viewer";
import { getMemberRole } from "@/server/auth/roles";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { listPosts } from "@/server/posts/posts";
import { getPublishedArticles } from "@/server/journal/articles";
import { MemberProfile } from "@/components/profile/member-profile";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ username: string }>;
}

async function loadProfile(username: string) {
  const supabase = await createSupabaseServerClient();
  const clean = username.trim().slice(0, 80);
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean);

  if (!isUuid && !/^[a-zA-Z0-9_.-]{1,40}$/.test(clean)) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, created_at")
    .eq(isUuid ? "id" : "username", clean)
    .maybeSingle();

  return data;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await loadProfile(username);
  if (!profile) return { title: "Member not found" };
  return {
    title: `${profile.display_name} (@${profile.username})`,
    description: profile.bio || `${profile.display_name} on The DropOut College.`,
  };
}

export default async function MemberProfilePage({ params }: PageProps) {
  const { username } = await params;
  const profile = await loadProfile(username);
  if (!profile) notFound();

  const viewer = await getViewerProfile();
  const role = await getMemberRole(profile.id);
  const posts = await listPosts({ authorId: profile.id, viewerId: viewer?.id, limit: 10 });
  const journals =
    role === "member"
      ? []
      : (await getPublishedArticles({ limit: 50 })).articles.filter(
          (article) => article.authorId === profile.id,
        );

  return (
    <MemberProfile
      profile={{
        id: profile.id,
        username: profile.username,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url,
        bio: profile.bio,
        role,
        createdAt: profile.created_at,
      }}
      initialPosts={posts.posts}
      journals={journals}
      isOwner={viewer?.id === profile.id}
      viewerId={viewer?.id ?? null}
      viewerRole={viewer?.role ?? "member"}
    />
  );
}
