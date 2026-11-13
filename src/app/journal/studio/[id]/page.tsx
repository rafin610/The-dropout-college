import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/current-user";
import { getArticleBySlugOrId } from "@/server/journal/articles";
import { getMemberRole, isStaffRole } from "@/server/auth/roles";
import { getCategories } from "@/lib/supabase-data";
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

  const [role, categories] = await Promise.all([
    getMemberRole(user.id),
    getCategories().catch(() => []),
  ]);

  if (!isStaffRole(role)) {
    redirect("/journal?error=unauthorized");
  }

  const article = await getArticleBySlugOrId(id, user);
  if (!article) {
    notFound();
  }

  if (role !== "admin" && article.authorId !== user.id) {
    redirect("/journal?error=unauthorized");
  }

  return <JournalEditor initialArticle={article} categories={categories} isAdmin={role === "admin"} />;
}
