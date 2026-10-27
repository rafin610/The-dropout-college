import { ApiError } from "@/server/errors";
import type { JournalArticle } from "./types";

const ARTICLE_TABLES = ["articles", "projects"] as const;
type ArticleTable = (typeof ARTICLE_TABLES)[number];

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface DeletionResponse {
  data?: Array<{ id?: string }> | null;
  count?: number | null;
  error?: { message?: string; code?: string } | null;
}

export interface DeletionQuery extends PromiseLike<DeletionResponse> {
  eq(column: string, value: string): DeletionQuery;
  is(column: string, value: null): DeletionQuery;
  select(columns: string): PromiseLike<DeletionResponse>;
}

export interface DeletionTable {
  update(values: Record<string, unknown>): DeletionQuery;
  select(
    columns: string,
    options?: { count?: "exact"; head?: boolean },
  ): DeletionQuery;
}

export interface DeletionClient {
  from(table: string): DeletionTable;
}

export interface UserIdentity {
  id: string;
}

export interface DeleteArticleDependencies {
  getPermissions(userId: string): Promise<Set<string>>;
  getExistingArticle(
    id: string,
    user: UserIdentity,
  ): Promise<JournalArticle | null>;
  getClient(): Promise<DeletionClient>;
  now?: () => Date;
  log?: (message: string, meta?: Record<string, unknown>) => void;
}

export interface DeleteArticleOutcome {
  article: JournalArticle;
  articlesDeleted: number;
  projectsDeleted: number;
  alreadyDeleted: boolean;
}

export function isValidArticleId(id: string): boolean {
  return UUID_PATTERN.test(id);
}

export function canDeleteArticle(
  article: Pick<JournalArticle, "authorId">,
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

  return permissions.has("articles.create") && article.authorId === userId;
}

async function countActiveRows(
  client: DeletionClient,
  table: ArticleTable,
  id: string,
): Promise<number> {
  const { count, error } = await client
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("id", id)
    .is("deleted_at", null);

  if (error || typeof count !== "number") {
    throw new ApiError(
      "INTERNAL_ERROR",
      `Could not verify the article deletion in ${table}.`,
      500,
    );
  }

  return count;
}

async function softDeleteRows(
  client: DeletionClient,
  table: ArticleTable,
  id: string,
  deletedAt: string,
): Promise<{ affected: number; error: string | null }> {
  try {
    const { data, error } = await client
      .from(table)
      .update({ deleted_at: deletedAt })
      .eq("id", id)
      .is("deleted_at", null)
      .select("id");

    if (error) {
      return { affected: 0, error: error.message || "Unknown database error." };
    }

    return { affected: Array.isArray(data) ? data.length : 0, error: null };
  } catch (error) {
    return {
      affected: 0,
      error: error instanceof Error ? error.message : "Unknown database error.",
    };
  }
}

async function rollbackSoftDelete(
  client: DeletionClient,
  table: ArticleTable,
  id: string,
  deletedAt: string,
): Promise<void> {
  try {
    await client
      .from(table)
      .update({ deleted_at: null })
      .eq("id", id)
      .eq("deleted_at", deletedAt)
      .select("id");
  } catch {
    // The final verification error is the honest result. A failed rollback is
    // logged by the caller if it needs more detail.
  }
}

/**
 * Core deletion flow with injectable dependencies so authorization, row-count
 * verification, mirror cleanup, and failure handling can be tested without a
 * live Supabase instance.
 */
export async function deleteArticleWithDependencies(
  id: string,
  user: UserIdentity,
  dependencies: DeleteArticleDependencies,
): Promise<DeleteArticleOutcome> {
  if (!isValidArticleId(id)) {
    throw new ApiError("VALIDATION_ERROR", "Invalid article ID.", 400);
  }

  const permissions = await dependencies.getPermissions(user.id);
  const article = await dependencies.getExistingArticle(id, user);

  if (!article) {
    throw new ApiError("NOT_FOUND", "Article not found.", 404);
  }

  if (!canDeleteArticle(article, user.id, permissions)) {
    throw new ApiError(
      "FORBIDDEN",
      "You do not have permission to delete this article.",
      403,
    );
  }

  const client = await dependencies.getClient();
  const logger = dependencies.log ?? (() => undefined);

  const activeBefore: Record<ArticleTable, number> = {
    articles: await countActiveRows(client, "articles", id),
    projects: await countActiveRows(client, "projects", id),
  };

  if (activeBefore.articles === 0 && activeBefore.projects === 0) {
    return {
      article,
      articlesDeleted: 0,
      projectsDeleted: 0,
      alreadyDeleted: true,
    };
  }

  const deletedAt = (dependencies.now?.() ?? new Date()).toISOString();
  const results: Record<ArticleTable, { affected: number; error: string | null }> = {
    articles: { affected: 0, error: null },
    projects: { affected: 0, error: null },
  };
  const changedTables: ArticleTable[] = [];

  for (const table of ARTICLE_TABLES) {
    if (activeBefore[table] === 0) continue;

    results[table] = await softDeleteRows(client, table, id, deletedAt);
    if (results[table].error) {
      logger("[deleteArticle] table soft-delete failed", {
        table,
        error: results[table].error,
      });
    } else if (results[table].affected > 0) {
      changedTables.push(table);
    }
  }

  let remaining: Record<ArticleTable, number>;
  try {
    remaining = {
      articles: await countActiveRows(client, "articles", id),
      projects: await countActiveRows(client, "projects", id),
    };
  } catch (error) {
    for (const table of changedTables) {
      await rollbackSoftDelete(client, table, id, deletedAt);
    }
    throw error;
  }

  if (remaining.articles > 0 || remaining.projects > 0) {
    for (const table of changedTables) {
      await rollbackSoftDelete(client, table, id, deletedAt);
    }

    const failedTables = ARTICLE_TABLES.filter((table) => remaining[table] > 0);
    logger("[deleteArticle] deletion could not be confirmed", {
      failedTables,
      results,
      remaining,
    });

    throw new ApiError(
      "INTERNAL_ERROR",
      "The article could not be removed from every data source. Please try again, or make sure the service role key is configured.",
      500,
    );
  }

  return {
    article,
    articlesDeleted: results.articles.affected,
    projectsDeleted: results.projects.affected,
    alreadyDeleted: false,
  };
}
