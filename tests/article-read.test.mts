import assert from "node:assert/strict";
import test from "node:test";

import { articles } from "./helpers/modules";
import { collectNodes, textOf, type JsonNode } from "./helpers/json";
import type { User } from "@supabase/supabase-js";

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
  readonly rows: RawRow[];

  constructor(rows: RawRow[]) {
    this.rows = rows;
  }

  from(table: string) {
    assert.equal(table, "articles", "journal reads must not fall back to other tables");
    return {
      select: (selection: string) => new FakeReadQuery(this.rows, selection),
    };
  }
}

const ARTICLE_ID = "26c883c9-3c09-486a-ba71-259d9a48e0fc";
const AUTHOR_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";

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

function client(rows: RawRow[]) {
  return new FakeReadClient(rows) as unknown as Parameters<
    typeof articles.getArticleBySlugOrIdWithClient
  >[0];
}

const author = { id: AUTHOR_ID } as User;

test("published article rows are read from the articles table", async () => {
  const result = await articles.getArticleBySlugOrIdWithClient(
    client([articleRow()]),
    "database-article",
    null,
  );

  assert.ok(result);
  assert.equal(result.title, "Database article");
  assert.equal(textOf(collectNodes(result.content as JsonNode, "paragraph")[0]), "Database body");
});

test("article lookup accepts a UUID as well as a slug", async () => {
  const result = await articles.getArticleBySlugOrIdWithClient(
    client([articleRow()]),
    ARTICLE_ID,
    null,
  );

  assert.ok(result);
  assert.equal(result.id, ARTICLE_ID);
  assert.equal(result.slug, "database-article");
});

test("draft articles require an authorized user", async () => {
  const draft = articleRow({ status: "draft" });
  const fake = client([draft]);

  const guestResult = await articles.getArticleBySlugOrIdWithClient(
    fake,
    "database-article",
    null,
  );
  assert.equal(guestResult, null);

  const anonymous = { id: OTHER_ID } as User;
  const anonymousResult = await articles.getArticleBySlugOrIdWithClient(
    fake,
    "database-article",
    anonymous,
    async () => new Set<string>(),
  );
  assert.equal(anonymousResult, null);

  const ownDraft = await articles.getArticleBySlugOrIdWithClient(
    fake,
    "database-article",
    author,
    async () => new Set<string>(["articles.create"]),
  );
  assert.equal(ownDraft?.status, "draft");
});

test("staff can read drafts authored by other members", async () => {
  const draft = articleRow({ status: "draft" });
  const moderator = { id: OTHER_ID } as User;

  const result = await articles.getArticleBySlugOrIdWithClient(
    client([draft]),
    "database-article",
    moderator,
    async () => new Set<string>(["articles.moderate"]),
  );

  assert.equal(result?.status, "draft");
  assert.equal(result?.authorId, AUTHOR_ID);
});

test("soft-deleted articles resolve to null", async () => {
  const result = await articles.getArticleBySlugOrIdWithClient(
    client([articleRow({ deleted_at: "2026-02-01T00:00:00.000Z" })]),
    ARTICLE_ID,
    null,
  );

  assert.equal(result, null);
});

test("missing articles resolve to null", async () => {
  const result = await articles.getArticleBySlugOrIdWithClient(
    client([]),
    "project-fallback",
    null,
  );

  assert.equal(result, null);
});
