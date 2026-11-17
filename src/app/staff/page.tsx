import { redirect } from "next/navigation";
import { getViewerProfile } from "@/server/auth/viewer";
import { isStaffRole } from "@/server/auth/roles";
import { getCurrentUser } from "@/server/auth/current-user";
import { getUserPermissions } from "@/server/auth/permissions";
import { getStaffArticles } from "@/server/journal/articles";
import { StaffClient } from "./staff-client";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const viewer = await getViewerProfile();
  if (!viewer) redirect("/login?next=%2Fstaff");
  if (!isStaffRole(viewer.role)) redirect("/journal?error=unauthorized");

  const user = await getCurrentUser();
  const permissions = await getUserPermissions(user.id);
  const articles = await getStaffArticles(user);

  return (
    <StaffClient
      canManageMembers={permissions.has("*") || permissions.has("users.manage")}
      canManageRoles={permissions.has("*") || permissions.has("roles.manage")}
      canManageJournals={permissions.has("*") || permissions.has("articles.create") || permissions.has("articles.manage")}
      canPublishJournals={permissions.has("*") || permissions.has("articles.publish") || permissions.has("articles.manage")}
      canDeleteJournals={permissions.has("*") || permissions.has("articles.delete") || permissions.has("articles.manage")}
      canAdminister={viewer.role === "admin"}
      isSuperAdmin={permissions.has("*")}
      viewerId={viewer.id}
      articles={articles}
    />
  );
}
