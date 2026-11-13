import { redirect } from "next/navigation";
import { getViewerProfile } from "@/server/auth/viewer";
import { isStaffRole, normalizeMemberRole } from "@/server/auth/roles";
import { getCurrentUser } from "@/server/auth/current-user";
import { getStaffArticles } from "@/server/journal/articles";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { StaffClient } from "./staff-client";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const viewer = await getViewerProfile();
  if (!viewer) redirect("/login?next=%2Fstaff");
  if (!isStaffRole(viewer.role)) redirect("/journal?error=unauthorized");

  const user = await getCurrentUser();
  const articles = await getStaffArticles(user);

  let members: Array<{ id: string; displayName: string; username: string; role: "member" | "moderator" | "admin" }> = [];
  if (viewer.role === "admin") {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, username, user_roles(role)")
      .eq("status", "active")
      .order("display_name")
      .limit(200);

    members = (data ?? []).map((profile) => {
      const rawRoles = Array.isArray(profile.user_roles) ? profile.user_roles : profile.user_roles ? [profile.user_roles] : [];
      return {
        id: profile.id,
        displayName: profile.display_name,
        username: profile.username,
        role: normalizeMemberRole(rawRoles.map((entry: { role?: string | null }) => String(entry?.role ?? "")).filter(Boolean)),
      };
    });
  }

  return (
    <div className="c-page">
      <section className="c-hero">
        <p className="c-kicker">Staff</p>
        <h1 className="c-title" style={{ fontSize: 34 }}>Keep the campus calm.</h1>
        <p className="c-subtitle">
          Publish the Journal, keep drafts private, and help members find the right role.
        </p>
      </section>

      <StaffClient
        canManageRoles={viewer.role === "admin"}
        viewerId={viewer.id}
        articles={articles}
        initialMembers={members}
      />
    </div>
  );
}
