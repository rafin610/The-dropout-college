import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/current-user";
import { getViewerProfile } from "@/server/auth/viewer";
import { getMemberRole } from "@/server/auth/roles";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { listPosts } from "@/server/posts/posts";
import { getPublishedArticles } from "@/server/journal/articles";
import { ensureUserProfile } from "@/server/auth/current-user";
import { MemberProfile } from "@/components/profile/member-profile";

export const dynamic = "force-dynamic";

async function loadProfile(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, created_at")
    .eq("id", userId)
    .maybeSingle();
  return data;
}

export default async function MyProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ member?: string }>;
}) {
  const params = await searchParams;

  if (params.member) {
    const member = params.member.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(member);
    const isUsername = /^[a-zA-Z0-9_.-]{1,40}$/.test(member);

    if (isUuid || isUsername) {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq(isUuid ? "id" : "username", member)
        .maybeSingle();
      if (data?.username) redirect(`/profile/${encodeURIComponent(data.username)}`);
    }
  }

  const viewer = await getViewerProfile();
  if (!viewer) {
    return (
      <div className="c-page-narrow">
        <div className="c-empty" style={{ marginTop: 24 }}>
          <h1>Your profile lives here</h1>
          <p>Sign in with Google to view your profile and share posts.</p>
          <Link href="/login?next=%2Fprofile" className="c-button c-button-primary">Sign in</Link>
        </div>
      </div>
    );
  }

  let profile = await loadProfile(viewer.id);
  if (!profile) {
    const user = await getCurrentUser();
    await ensureUserProfile(user);
    profile = await loadProfile(viewer.id);
  }

  if (!profile) {
    return (
      <div className="c-page-narrow">
        <div className="c-empty">
          <h1>Profile unavailable</h1>
          <p>Your account is signed in, but the profile row could not be loaded. Try again in a moment.</p>
        </div>
      </div>
    );
  }

  const role = await getMemberRole(profile.id);
  const posts = await listPosts({ authorId: profile.id, viewerId: viewer.id, limit: 10 });
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
      isOwner
      viewerId={viewer.id}
      viewerRole={viewer.role}
    />
  );
}
