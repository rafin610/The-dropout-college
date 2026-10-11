import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getArticleBySlugOrId, getRelatedArticles } from "@/server/journal/articles";
import { getOptionalUser } from "@/server/auth/current-user";
import { getUserPermissions } from "@/server/auth/permissions";
import { ArticleReaderClient } from "./article-reader";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const user = await getOptionalUser();
  const article = await getArticleBySlugOrId(slug, user);

  if (!article) {
    return {
      title: "Article Not Found | The DropOut Journal",
    };
  }

  const title = article.seoTitle || `${article.title} | The DropOut Journal`;
  const description =
    article.seoDescription ||
    article.excerpt ||
    "An article published on The DropOut Journal.";

  return {
    title,
    description,
    authors: [{ name: article.author.displayName }],
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: article.publishedAt || article.createdAt,
      modifiedTime: article.updatedAt,
      authors: [article.author.displayName],
      images: article.coverImageUrl ? [{ url: article.coverImageUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: article.coverImageUrl ? [article.coverImageUrl] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const user = await getOptionalUser();
  const article = await getArticleBySlugOrId(slug, user);

  if (!article) {
    notFound();
  }

  let canEdit = false;
  if (user) {
    const permissions = await getUserPermissions(user.id);
    const isAdmin = permissions.has("*") || permissions.has("articles.manage");
    const isAuthorModerator =
      (permissions.has("articles.create") || permissions.has("articles.moderate")) &&
      article.authorId === user.id;
    canEdit = isAdmin || isAuthorModerator;
  }

  const related = await getRelatedArticles(article.id, article.categoryId, 3);

  return (
    <ArticleReaderClient
      article={article}
      relatedArticles={related}
      canEdit={canEdit}
    />
  );
}
