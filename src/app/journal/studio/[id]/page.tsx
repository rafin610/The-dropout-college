import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/current-user";
import { getArticleBySlugOrId } from "@/server/journal/articles";
import { getUserPermissions } from "@/server/auth/permissions";
import { JournalEditor } from "@/components/journal/editor/journal-editor";

export const dynamic = "force-dynamic";

export default async function EditArticleStudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let user;
  try {
    user = await getCurrentUser();
  } catch {
    redirect(`/login?next=/journal/studio/${id}`);
  }

  const permissions = await getUserPermissions(user.id);
  const isAdmin = permissions.has("*") || permissions.has("articles.manage");
  const isModerator = permissions.has("articles.create") || permissions.has("articles.moderate");

  if (!isAdmin && !isModerator) {
    redirect("/journal?error=unauthorized");
  }

  const article = await getArticleBySlugOrId(id, user);
  if (!article) {
    notFound();
  }

  if (!isAdmin && article.authorId !== user.id) {
    redirect("/journal?error=unauthorized");
  }

  return <JournalEditor initialArticle={article} isAdmin={isAdmin} />;
}
