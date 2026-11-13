import type { JournalArticle } from "./types";

export function canCreateArticles(permissions: Set<string>): boolean {
  return (
    permissions.has("*") ||
    permissions.has("articles.create") ||
    permissions.has("articles.manage") ||
    permissions.has("articles.moderate")
  );
}

export function canPublishArticles(permissions: Set<string>): boolean {
  return (
    permissions.has("*") ||
    permissions.has("articles.publish") ||
    permissions.has("articles.manage") ||
    permissions.has("articles.moderate")
  );
}

export function canFeatureArticles(permissions: Set<string>): boolean {
  return permissions.has("*") || permissions.has("articles.manage");
}

export function canModerateArticles(permissions: Set<string>): boolean {
  return (
    permissions.has("*") ||
    permissions.has("articles.manage") ||
    permissions.has("articles.moderate")
  );
}

export function canDeleteArticle(
  article: Pick<JournalArticle, "authorId" | "status">,
  userId: string,
  permissions: Set<string>,
): boolean {
  if (
    permissions.has("*") ||
    permissions.has("articles.manage") ||
    permissions.has("articles.delete")
  ) {
    return true;
  }

  // Moderators can delete their own articles at any status. Authors with only
  // create permission can still remove their own drafts.
  if (article.authorId === userId) {
    if (permissions.has("articles.moderate")) return true;
    return permissions.has("articles.create") && article.status === "draft";
  }

  return false;
}
