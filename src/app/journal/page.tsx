import type { Metadata } from "next";
import { getPublishedArticles, checkUserCanWriteArticles } from "@/server/journal/articles";
import { getCategories } from "@/lib/supabase-data";
import { getOptionalUser } from "@/server/auth/current-user";
import { JournalClient } from "./journal-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The DropOut Journal | Independent Editorial & Learning Platform",
  description:
    "An editorial publication and knowledge platform covering technology, programming, mathematics, AI, science, and independent learning.",
  openGraph: {
    title: "The DropOut Journal | The DropOut College",
    description:
      "Essays, technical insights, mathematical derivations, and independent learning publications.",
    type: "website",
  },
};

export default async function JournalHomePage() {
  const [articlesData, categories, user] = await Promise.all([
    getPublishedArticles({ limit: 30 }),
    getCategories(),
    getOptionalUser(),
  ]);

  let canWrite = false;
  if (user) {
    canWrite = await checkUserCanWriteArticles(user.id);
  }

  return (
    <JournalClient
      initialArticles={articlesData.articles}
      categories={categories}
      canWrite={canWrite}
    />
  );
}
