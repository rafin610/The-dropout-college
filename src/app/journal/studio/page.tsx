import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/current-user";
import { checkUserCanWriteArticles } from "@/server/journal/articles";
import { getMemberRole } from "@/server/auth/roles";
import { getCategories } from "@/lib/supabase-data";
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

  const [role, categories] = await Promise.all([
    getMemberRole(user.id),
    getCategories().catch(() => []),
  ]);

  return <JournalEditor initialArticle={null} categories={categories} isAdmin={role === "admin"} />;
}
