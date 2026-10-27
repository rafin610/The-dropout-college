import assert from "node:assert/strict";
import test from "node:test";

import { articles, errors } from "./helpers/modules";
import { collectNodes, textOf, type JsonNode } from "./helpers/json";
import type { User } from "@supabase/supabase-js";

type TableName = "articles" | "projects";

interface RawRow {
  id: string;
  slug: string;
  deleted_at: string | null;
  [key: string]: unknown;
}

class FakeReadQuery {
  private filters: Array<(row: RawRow) => boolean> = [];

  constructor(
    private readonly rows: RawRow[],
    private readonly selection: string,
  ) {}

  select(selection: string) {
    void this.selection;
    return new FakeReadQuery(this.rows, selection);
  }

  is(column: string, value: null) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  not(column: string, operator: string, value: null) {
    assert.equal(operator, "is");
    this.filters.push((row) => row[column] !== value);
    return this;
  }

  eq(column: string, value: string) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  or(expression: string) {
    const clauses = expression.split(",").map((clause) => {
      const [column, operator, ...rest] = clause.split(".");
      assert.equal(operator, "eq");
      return { column, value: rest.join(".") };
    });

    this.filters.push((row) =>
      clauses.some((clause) => row[clause.column] === clause.value),
    );
    return this;
  }

  async maybeSingle(): Promise<{ data: RawRow | null; error: null }> {
    const match = this.rows.find((row) => this.filters.every((filter) => filter(row)));
    return { data: match ?? null, error: null };
  }
}

class FakeReadClient {
  readonly rows: Record<TableName, RawRow[]>;

  constructor(rows: Record<TableName, RawRow[]>) {
    this.rows = rows;
  }

  from(table: string) {
    return {
      select: (selection: string) =>
        new FakeReadQuery(this.rows[table as TableName] ?? [], selection),
    };
  }
}

const ARTICLE_ID = "26c883c9-3c09-486a-ba71-259d9a48e0fc";
const AUTHOR_ID = "11111111-1111-4111-8111-111111111111";

function articleRow(overrides: Partial<RawRow> = {}): RawRow {
  return {
    id: ARTICLE_ID,
    title: "Database article",
    slug: "database-article",
    excerpt: "Excerpt",
    cover_image_url: null,
    content: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Database body" }],
        },
      ],
    },
    author_id: AUTHOR_ID,
    category_id: null,
    tags: [],
    status: "published",
    reading_time_minutes: null,
    featured: false,
    published_at: "2026-01-01T00:00:00.000Z",
    seo_title: null,
    seo_description: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    deleted_at: null,
    categories: null,
    author: {
      id: AUTHOR_ID,
      display_name: "Author",
      username: "author",
      avatar_url: null,
      bio: null,
      user_roles: [],
    },
    ...overrides,
  };
}

function projectRow(overrides: Partial<RawRow> = {}): RawRow {
  return {
    id: ARTICLE_ID,
    name: "Project fallback",
    slug: "project-fallback",
    description: "Project body",
    cover_image_url: null,
    status: "launched",
    category_id: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
    owner_id: AUTHOR_ID,
    deleted_at: null,
    categories: null,
    owner: {
      id: AUTHOR_ID,
      display_name: "Owner",
      username: "owner",
      avatar_url: null,
      bio: null,
      user_roles: [],
    },
    ...overrides,
  };
}

function client(rows: Partial<Record<TableName, RawRow[]>>) {
  return new FakeReadClient({
    articles: rows.articles ?? [],
    projects: rows.projects ?? [],
  }) as unknown as Parameters<typeof articles.getArticleBySlugOrIdWithClient>[0];
}

const author = { id: AUTHOR_ID } as User;

test("published article rows are read from the articles table first", async () => {
  const result = await articles.getArticleBySlugOrIdWithClient(
    client({
      articles: [articleRow()],
      projects: [projectRow()],
    }),
    "database-article",
    null,
  );

  assert.ok(result);
  assert.equal(result.title, "Database article");
  assert.equal(textOf(collectNodes(result.content as JsonNode, "paragraph")[0]), "Database body");
});

test("draft articles require an authorized user", async () => {
  const draft = articleRow({ status: "draft" });
  const fake = client({ articles: [draft] });

  await assert.rejects(
    articles.getArticleBySlugOrIdWithClient(fake, "database-article", null),
    (error: unknown) =>
      error instanceof errors.ApiError && error.status === 404,
  );

  const anonymous = { id: "22222222-2222-4222-8222-222222222222" } as User;
  await assert.rejects(
    articles.getArticleBySlugOrIdWithClient(
      fake,
      "database-article",
      anonymous,
      async () => new Set<string>(),
    ),
    (error: unknown) =>
      error instanceof errors.ApiError && error.status === 404,
  );

  const ownDraft = await articles.getArticleBySlugOrIdWithClient(
    fake,
    "database-article",
    author,
    async () => new Set<string>(["articles.create"]),
  );
  assert.equal(ownDraft?.status, "draft");
});

test("a soft-deleted article tombstone blocks project fallback resurrection", async () => {
  const deletedArticle = articleRow({
    deleted_at: "2026-02-01T00:00:00.000Z",
  });

  const result = await articles.getArticleBySlugOrIdWithClient(
    client({
      articles: [deletedArticle],
      projects: [projectRow()],
    }),
    ARTICLE_ID,
    null,
  );

  assert.equal(result, null);
});

test("project fallback remains available when no article row exists", async () => {
  const result = await articles.getArticleBySlugOrIdWithClient(
    client({ projects: [projectRow()] }),
    "project-fallback",
    null,
  );

  assert.ok(result);
  assert.equal(result.title, "Project fallback");
  assert.equal(result.slug, "project-fallback");
  assert.equal(result.status, "published");
});

test("a deleted article with no project row resolves to null", async () => {
  const result = await articles.getArticleBySlugOrIdWithClient(
    client({
      articles: [articleRow({ deleted_at: "2026-02-01T00:00:00.000Z" })],
    }),
    ARTICLE_ID,
    null,
  );

  assert.equal(result, null);
});
