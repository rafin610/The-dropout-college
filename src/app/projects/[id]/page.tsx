import { redirect } from "next/navigation";
import { getArticleBySlugOrId } from "@/server/journal/articles";
import { getProjectById } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export default async function ProjectDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const article = await getArticleBySlugOrId(id);
    if (article) {
      redirect(`/journal/${article.slug}`);
    }
  } catch {
    // Continue
  }

  try {
    const project = await getProjectById(id);
    if (project) {
      redirect(`/journal/${project.id}`);
    }
  } catch {
    // Continue
  }

  redirect("/journal");
}
