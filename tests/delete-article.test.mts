import assert from "node:assert/strict";
import test from "node:test";

import { deleteArticleModule, errors } from "./helpers/modules";
import type {
  DeleteArticleDependencies,
  DeletionClient,
  DeletionQuery,
  DeletionResponse,
  DeletionTable,
} from "../src/server/journal/delete-article";
import type { JournalArticle } from "../src/server/journal/types";

type TableName = "articles" | "projects";

interface FakeRow {
  id: string;
  deleted_at: string | null;
}

interface Filter {
  column: string;
  value: unknown;
}

class FakeDatabase {
  readonly rows: Record<TableName, Map<string, FakeRow>> = {
    articles: new Map(),
    projects: new Map(),
  };

  readonly updateCalls: Array<{
    table: TableName;
    id: string;
    values: Record<string, unknown>;
  }> = [];

  readonly blockedUpdates = new Set<TableName>();
  readonly updateErrors = new Set<TableName>();
  readonly selectErrors = new Set<TableName>();
  readonly nullCounts = new Set<TableName>();

  from(table: string): DeletionTable {
    return new FakeTable(this, table as TableName);
  }

  selectRows(
    table: TableName,
    filters: Filter[],
    options?: { count?: "exact"; head?: boolean },
  ): DeletionResponse {
    if (this.selectErrors.has(table)) {
      return { data: null, count: null, error: { message: "select blocked" } };
    }

    const matching = [...this.rows[table].values()].filter((row) =>
      filters.every((filter) => row[filter.column as keyof FakeRow] === filter.value),
    );

    if (options?.count === "exact") {
      return {
        data: null,
        count: this.nullCounts.has(table) ? null : matching.length,
        error: null,
      };
    }

    return { data: matching, count: matching.length, error: null };
  }

  updateRows(
    table: TableName,
    filters: Filter[],
    values: Record<string, unknown>,
  ): DeletionResponse {
    if (this.updateErrors.has(table)) {
      return { data: null, count: null, error: { message: "update blocked" } };
    }
    if (this.blockedUpdates.has(table)) {
      return { data: [], count: 0, error: null };
    }

    const matching = [...this.rows[table].values()].filter((row) =>
      filters.every((filter) => row[filter.column as keyof FakeRow] === filter.value),
    );

    for (const row of matching) {
      if (typeof values.deleted_at !== "undefined") {
        row.deleted_at = values.deleted_at as string | null;
      }
      this.updateCalls.push({ table, id: row.id, values });
    }

    return {
      data: matching.map((row) => ({ id: row.id })),
      count: matching.length,
      error: null,
    };
  }
}

class FakeTable implements DeletionTable {
  constructor(
    private readonly db: FakeDatabase,
    private readonly table: TableName,
  ) {}

  update(values: Record<string, unknown>): DeletionQuery {
    return new FakeQuery(this.db, this.table, "update", values);
  }

  select(
    columns: string,
    options?: { count?: "exact"; head?: boolean },
  ): DeletionQuery {
    return new FakeQuery(this.db, this.table, "select", undefined, options, columns);
  }
}

class FakeQuery implements DeletionQuery {
  private readonly filters: Filter[] = [];

  constructor(
    private readonly db: FakeDatabase,
    private readonly table: TableName,
    private readonly mode: "select" | "update",
    private readonly values?: Record<string, unknown>,
    private readonly options?: { count?: "exact"; head?: boolean },
    private readonly columns?: string,
  ) {}

  eq(column: string, value: string): DeletionQuery {
    this.filters.push({ column, value });
    return this;
  }

  is(column: string, value: null): DeletionQuery {
    this.filters.push({ column, value });
    return this;
  }

  select(columns: string): PromiseLike<DeletionResponse> {
    void columns;
    return this;
  }

  then<TResult1 = DeletionResponse, TResult2 = never>(
    onfulfilled?:
      | ((value: DeletionResponse) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private execute(): Promise<DeletionResponse> {
    if (this.mode === "select") {
      return Promise.resolve(
        this.db.selectRows(this.table, this.filters, this.options),
      );
    }

    return Promise.resolve(
      this.db.updateRows(this.table, this.filters, this.values ?? {}),
    );
  }
}

function makeArticle(id: string, authorId: string): JournalArticle {
  return {
    id,
    title: "Test article",
    slug: "test-article",
    excerpt: null,
    coverImageUrl: null,
    content: { type: "doc", content: [{ type: "paragraph" }] },
    authorId,
    categoryId: null,
    categoryName: null,
    categoryColor: null,
    tags: [],
    status: "published",
    readingTimeMinutes: 1,
    featured: false,
    publishedAt: null,
    seoTitle: null,
    seoDescription: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    author: {
      id: authorId,
      displayName: "Author",
      username: "author",
      avatarUrl: null,
      role: "writer",
    },
  };
}

const ARTICLE_ID = "26c883c9-3c09-486a-ba71-259d9a48e0fc";
const USER_ID = "11111111-1111-4111-8111-111111111111";

function setup(options: {
  article?: JournalArticle | null;
  permissions?: Set<string>;
  articlesActive?: number;
  projectsActive?: number;
  userId?: string;
}) {
  const db = new FakeDatabase();
  const article = options.article === undefined ? makeArticle(ARTICLE_ID, USER_ID) : options.article;
  const userId = options.userId ?? USER_ID;

  if (options.articlesActive) {
    db.rows.articles.set(ARTICLE_ID, { id: ARTICLE_ID, deleted_at: null });
  }
  if (options.projectsActive) {
    db.rows.projects.set(ARTICLE_ID, { id: ARTICLE_ID, deleted_at: null });
  }

  let clientCalls = 0;
  const logs: Array<{ message: string; meta?: Record<string, unknown> }> = [];

  const dependencies: DeleteArticleDependencies = {
    getPermissions: async () => options.permissions ?? new Set(["articles.manage"]),
    getExistingArticle: async () => article,
    getClient: async () => {
      clientCalls += 1;
      return db as unknown as DeletionClient;
    },
    now: () => new Date("2026-02-03T04:05:06.000Z"),
    log: (message, meta) => {
      logs.push({ message, meta });
    },
  };

  return {
    db,
    dependencies,
    logs,
    get clientCalls() {
      return clientCalls;
    },
    userId,
  };
}

test("article ID validation and permission checks happen before database work", async () => {
  assert.equal(deleteArticleModule.isValidArticleId(ARTICLE_ID), true);
  assert.equal(deleteArticleModule.isValidArticleId("not-a-uuid"), false);
  assert.equal(
    deleteArticleModule.isValidArticleId("26c883c9-3c09-486a-ba71-259d9a48e0fc' OR 1=1"),
    false,
  );

  const invalid = setup({ articlesActive: 1 });
  await assert.rejects(
    deleteArticleModule.deleteArticleWithDependencies(
      "not-a-uuid",
      { id: invalid.userId },
      invalid.dependencies,
    ),
    (error: unknown) =>
      error instanceof errors.ApiError &&
      error.code === "VALIDATION_ERROR" &&
      error.status === 400,
  );
  assert.equal(invalid.clientCalls, 0);

  const forbidden = setup({
    articlesActive: 1,
    permissions: new Set(),
    article: makeArticle(ARTICLE_ID, "22222222-2222-4222-8222-222222222222"),
  });
  await assert.rejects(
    deleteArticleModule.deleteArticleWithDependencies(
      ARTICLE_ID,
      { id: forbidden.userId },
      forbidden.dependencies,
    ),
    (error: unknown) =>
      error instanceof errors.ApiError &&
      error.code === "FORBIDDEN" &&
      error.status === 403,
  );
  assert.equal(forbidden.clientCalls, 0);
});

test("delete permissions allow managers and article authors only", () => {
  const article = makeArticle(ARTICLE_ID, USER_ID);
  assert.equal(
    deleteArticleModule.canDeleteArticle(article, USER_ID, new Set(["articles.manage"])),
    true,
  );
  assert.equal(
    deleteArticleModule.canDeleteArticle(article, USER_ID, new Set(["*"])),
    true,
  );
  assert.equal(
    deleteArticleModule.canDeleteArticle(article, USER_ID, new Set(["articles.create"])),
    true,
  );
  assert.equal(
    deleteArticleModule.canDeleteArticle(
      article,
      "22222222-2222-4222-8222-222222222222",
      new Set(["articles.create"]),
    ),
    false,
  );
});

test("deletion soft-deletes both the article and its mirrored project", async () => {
  const harness = setup({ articlesActive: 1, projectsActive: 1 });

  const outcome = await deleteArticleModule.deleteArticleWithDependencies(
    ARTICLE_ID,
    { id: harness.userId },
    harness.dependencies,
  );

  assert.equal(outcome.alreadyDeleted, false);
  assert.equal(outcome.articlesDeleted, 1);
  assert.equal(outcome.projectsDeleted, 1);
  assert.equal(harness.db.rows.articles.get(ARTICLE_ID)?.deleted_at, "2026-02-03T04:05:06.000Z");
  assert.equal(harness.db.rows.projects.get(ARTICLE_ID)?.deleted_at, "2026-02-03T04:05:06.000Z");
  assert.equal(harness.db.updateCalls.length, 2);
});

test("project-only rows are deleted without touching a missing article row", async () => {
  const harness = setup({ projectsActive: 1 });

  const outcome = await deleteArticleModule.deleteArticleWithDependencies(
    ARTICLE_ID,
    { id: harness.userId },
    harness.dependencies,
  );

  assert.equal(outcome.articlesDeleted, 0);
  assert.equal(outcome.projectsDeleted, 1);
  assert.equal(harness.db.rows.projects.get(ARTICLE_ID)?.deleted_at, "2026-02-03T04:05:06.000Z");
  assert.equal(harness.db.updateCalls.length, 1);
});

test("RLS-blocked mirror deletion rolls back and reports an honest failure", async () => {
  const harness = setup({ articlesActive: 1, projectsActive: 1 });
  harness.db.blockedUpdates.add("projects");

  await assert.rejects(
    deleteArticleModule.deleteArticleWithDependencies(
      ARTICLE_ID,
      { id: harness.userId },
      harness.dependencies,
    ),
    (error: unknown) =>
      error instanceof errors.ApiError &&
      error.code === "INTERNAL_ERROR" &&
      error.status === 500,
  );

  assert.equal(harness.db.rows.articles.get(ARTICLE_ID)?.deleted_at, null);
  assert.equal(harness.db.rows.projects.get(ARTICLE_ID)?.deleted_at, null);
});

test("database update errors roll back previously changed tables", async () => {
  const harness = setup({ articlesActive: 1, projectsActive: 1 });
  harness.db.updateErrors.add("projects");

  await assert.rejects(
    deleteArticleModule.deleteArticleWithDependencies(
      ARTICLE_ID,
      { id: harness.userId },
      harness.dependencies,
    ),
    (error: unknown) =>
      error instanceof errors.ApiError && error.code === "INTERNAL_ERROR",
  );

  assert.equal(harness.db.rows.articles.get(ARTICLE_ID)?.deleted_at, null);
  assert.equal(harness.db.rows.projects.get(ARTICLE_ID)?.deleted_at, null);
});

test("verification failures and null counts do not report success", async () => {
  const selectFailure = setup({ articlesActive: 1, projectsActive: 1 });
  selectFailure.db.selectErrors.add("projects");

  await assert.rejects(
    deleteArticleModule.deleteArticleWithDependencies(
      ARTICLE_ID,
      { id: selectFailure.userId },
      selectFailure.dependencies,
    ),
    (error: unknown) =>
      error instanceof errors.ApiError && error.code === "INTERNAL_ERROR",
  );
  assert.equal(selectFailure.db.updateCalls.length, 0);

  const nullCount = setup({ articlesActive: 1, projectsActive: 1 });
  nullCount.db.nullCounts.add("articles");

  await assert.rejects(
    deleteArticleModule.deleteArticleWithDependencies(
      ARTICLE_ID,
      { id: nullCount.userId },
      nullCount.dependencies,
    ),
    (error: unknown) =>
      error instanceof errors.ApiError && error.code === "INTERNAL_ERROR",
  );
  assert.equal(nullCount.db.updateCalls.length, 0);
});

test("already-deleted rows return an idempotent alreadyDeleted outcome", async () => {
  const harness = setup({ articlesActive: 0, projectsActive: 0 });

  const outcome = await deleteArticleModule.deleteArticleWithDependencies(
    ARTICLE_ID,
    { id: harness.userId },
    harness.dependencies,
  );

  assert.equal(outcome.alreadyDeleted, true);
  assert.equal(outcome.articlesDeleted, 0);
  assert.equal(outcome.projectsDeleted, 0);
  assert.equal(harness.db.updateCalls.length, 0);
});
