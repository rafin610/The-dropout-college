import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/current-user";
import { checkUserCanWriteArticles } from "@/server/journal/articles";
import { getUserPermissions } from "@/server/auth/permissions";
import { JournalEditor } from "@/components/journal/editor/journal-editor";

export const dynamic = "force-dynamic";

export default async function NewArticleStudioPage() {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    redirect("/login?next=/journal/studio");
  }

  const canWrite = await checkUserCanWriteArticles(user.id);
  if (!canWrite) {
    redirect("/journal?error=unauthorized");
  }

  const permissions = await getUserPermissions(user.id);
  const isAdmin = permissions.has("*") || permissions.has("articles.manage");

  return <JournalEditor initialArticle={null} isAdmin={isAdmin} />;
}
