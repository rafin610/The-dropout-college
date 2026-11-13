import { ApiError } from "@/server/errors";
import { canDeleteArticle } from "./access";
import type { JournalArticle } from "./types";

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
  alreadyDeleted: boolean;
}

export function isValidArticleId(id: string): boolean {
  return UUID_PATTERN.test(id);
}

export { canDeleteArticle } from "./access";

async function countActiveRows(
  client: DeletionClient,
  id: string,
): Promise<number> {
  const { count, error } = await client
    .from("articles")
    .select("id", { count: "exact", head: true })
    .eq("id", id)
    .is("deleted_at", null);

  if (error || typeof count !== "number") {
    throw new ApiError(
      "INTERNAL_ERROR",
      "Could not verify the article before deleting it.",
      500,
    );
  }

  return count;
}

async function softDeleteArticle(
  client: DeletionClient,
  id: string,
  deletedAt: string,
): Promise<{ affected: number; error: string | null }> {
  try {
    const { data, error } = await client
      .from("articles")
      .update({ deleted_at: deletedAt, updated_at: deletedAt })
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
  id: string,
  deletedAt: string,
): Promise<void> {
  try {
    await client
      .from("articles")
      .update({ deleted_at: null })
      .eq("id", id)
      .eq("deleted_at", deletedAt)
      .select("id");
  } catch {
    // The caller reports the failed verification; rollback is best effort.
  }
}

/**
 * Soft-delete a journal article. The old implementation mirrored deletions into
 * the legacy projects table, which made published articles depend on an
 * unrelated row and caused delete failures. Articles are the only source of
 * truth now.
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

  const activeBefore = await countActiveRows(client, id);
  if (activeBefore === 0) {
    return { article, articlesDeleted: 0, alreadyDeleted: true };
  }

  const deletedAt = (dependencies.now?.() ?? new Date()).toISOString();
  const result = await softDeleteArticle(client, id, deletedAt);

  if (result.error) {
    logger("[deleteArticle] soft-delete failed", { error: result.error });
    throw new ApiError("INTERNAL_ERROR", "The article could not be deleted.", 500);
  }

  const remaining = await countActiveRows(client, id);
  if (remaining > 0) {
    await rollbackSoftDelete(client, id, deletedAt);
    logger("[deleteArticle] deletion could not be confirmed", { remaining });
    throw new ApiError("INTERNAL_ERROR", "The article could not be deleted.", 500);
  }

  return {
    article,
    articlesDeleted: result.affected,
    alreadyDeleted: false,
  };
}
