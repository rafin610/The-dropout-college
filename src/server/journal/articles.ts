import { createSupabaseServerClient } from "@/server/supabase/server";
import { ApiError } from "@/server/errors";
import { getUserPermissions } from "@/server/auth/permissions";
import { getMemberRole, isStaffRole } from "@/server/auth/roles";
import type { User } from "@supabase/supabase-js";
import type { JournalArticle, ArticleAuthor, SaveArticleInput } from "./types";
import { calculateReadingTime, slugify } from "./validation";
import { getSafeCoverImageUrl, normalizeArticleContent } from "./content";
import {
  deleteArticleWithDependencies,
  type DeletionClient,
} from "./delete-article";

interface ArticleRow {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  content: Record<string, unknown>;
  author_id: string;
  category_id: string | null;
  tags: string[] | null;
  status: "draft" | "published" | "archived";
  reading_time_minutes: number | null;
  featured: boolean | null;
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  categories?: { id?: string; name?: string; slug?: string; color?: string | null } | Array<{ id?: string; name?: string; slug?: string; color?: string | null }> | null;
  author?: {
    id: string;
    display_name: string;
    username: string;
    avatar_url: string | null;
    bio?: string | null;
    user_roles?: Array<{ role?: string }> | { role?: string } | null;
  } | Array<{
    id: string;
    display_name: string;
    username: string;
    avatar_url: string | null;
    bio?: string | null;
    user_roles?: Array<{ role?: string }> | { role?: string } | null;
  }> | null;
}

function mapArticleRow(row: ArticleRow): JournalArticle {
  const category = Array.isArray(row.categories) ? row.categories[0] : row.categories;
  const rawAuthor = Array.isArray(row.author) ? row.author[0] : row.author;
  const rawRoles = rawAuthor?.user_roles;
  const roles = Array.isArray(rawRoles)
    ? rawRoles.map((r) => r.role).filter(Boolean)
    : rawRoles?.role
      ? [rawRoles.role]
      : [];

  const author: ArticleAuthor = {
    id: rawAuthor?.id || row.author_id,
    displayName: rawAuthor?.display_name || "Journal Contributor",
    username: rawAuthor?.username || "author",
    avatarUrl: rawAuthor?.avatar_url || null,
    role: (roles[0] as string) || "member",
    bio: rawAuthor?.bio || null,
  };

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    coverImageUrl: getSafeCoverImageUrl(row.cover_image_url),
    content: normalizeArticleContent(row.content || { type: "doc", content: [] }),
    authorId: row.author_id,
    categoryId: row.category_id,
    categoryName: category?.name || null,
    categoryColor: category?.color || "#4F5E33",
    tags: Array.isArray(row.tags) ? row.tags : [],
    status: row.status || "draft",
    readingTimeMinutes: row.reading_time_minutes || calculateReadingTime(row.content),
    featured: Boolean(row.featured),
    publishedAt: row.published_at,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author,
  };
}

const ARTICLE_SELECT = `
  id, title, slug, excerpt, cover_image_url, content, author_id, category_id, tags,
  status, reading_time_minutes, featured, published_at, seo_title, seo_description,
  created_at, updated_at, deleted_at,
  categories(id, name, slug, color),
  author:profiles!articles_author_id_fkey(id, display_name, username, avatar_url, bio, user_roles(role))
`;

function isMissingTable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    Boolean(error.message?.includes("does not exist"))
  );
}

export async function checkUserCanWriteArticles(userId: string): Promise<boolean> {
  const role = await getMemberRole(userId);
  return isStaffRole(role);
}

export async function getPublishedArticles({
  categorySlug,
  query,
  authorId,
  limit = 20,
  page = 1,
}: {
  categorySlug?: string;
  query?: string;
  authorId?: string;
  limit?: number;
  page?: number;
}): Promise<{ articles: JournalArticle[]; total: number }> {
  const supabase = await createSupabaseServerClient();

  try {
    let request = supabase
      .from("articles")
      .select(ARTICLE_SELECT, { count: "exact" })
      .eq("status", "published")
      .is("deleted_at", null)
      .order("featured", { ascending: false })
      .order("published_at", { ascending: false });

    if (authorId) {
      request = request.eq("author_id", authorId);
    }

    if (query?.trim()) {
      const search = `%${query.trim()}%`;
      request = request.or(`title.ilike.${search},excerpt.ilike.${search}`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, count, error } = await request.range(from, to);

    if (error) {
      if (!isMissingTable(error)) {
        console.error("[journal] published articles query failed:", error.message);
      }
      return { articles: [], total: 0 };
    }

    let articles = ((data ?? []) as unknown as ArticleRow[]).map(mapArticleRow);
    if (categorySlug && categorySlug !== "all") {
      articles = articles.filter(
        (article) =>
          article.categoryName?.toLowerCase() === categorySlug.toLowerCase() ||
          article.tags.some((tag) => tag.toLowerCase() === categorySlug.toLowerCase()),
      );
    }

    return { articles, total: count ?? articles.length };
  } catch (error) {
    console.error("[journal] published articles unavailable:", error);
    return { articles: [], total: 0 };
  }
}

export async function getArticleBySlugOrId(
  slugOrId: string,
  user?: User | null,
): Promise<JournalArticle | null> {
  const supabase = await createSupabaseServerClient();
  return getArticleBySlugOrIdWithClient(supabase, slugOrId, user);
}

export async function getArticleBySlugOrIdWithClient(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  slugOrId: string,
  user?: User | null,
  permissionsForUser: (userId: string) => Promise<Set<string>> = getUserPermissions,
): Promise<JournalArticle | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);

  try {
    let request = supabase
      .from("articles")
      .select(ARTICLE_SELECT)
      .is("deleted_at", null);

    request = isUuid
      ? request.or(`id.eq.${slugOrId},slug.eq.${slugOrId}`)
      : request.eq("slug", slugOrId);

    const { data, error } = await request.maybeSingle();

    if (error) {
      if (!isMissingTable(error)) {
        console.error("[journal] article lookup failed:", error.message);
      }
      return null;
    }
    if (!data) return null;

    const article = mapArticleRow(data as unknown as ArticleRow);
    if (article.status !== "published") {
      if (!user) return null;

      const permissions = await permissionsForUser(user.id);
      const isAuthor = article.authorId === user.id;
      const isStaff =
        permissions.has("*") ||
        permissions.has("articles.manage") ||
        permissions.has("articles.moderate");

      if (!isAuthor && !isStaff) return null;
    }

    return article;
  } catch (error) {
    console.error("[journal] article lookup unavailable:", error);
    return null;
  }
}

export async function getRelatedArticles(
  currentId: string,
  categoryId?: string | null,
  limit = 3,
): Promise<JournalArticle[]> {
  const supabase = await createSupabaseServerClient();
  try {
    let request = supabase
      .from("articles")
      .select(ARTICLE_SELECT)
      .eq("status", "published")
      .neq("id", currentId)
      .is("deleted_at", null)
      .limit(limit);

    if (categoryId) {
      request = request.eq("category_id", categoryId);
    }

    const { data, error } = await request;
    if (error) return [];
    return ((data ?? []) as unknown as ArticleRow[]).map(mapArticleRow);
  } catch {
    return [];
  }
}

export async function getStaffArticles(user: User): Promise<JournalArticle[]> {
  const role = await getMemberRole(user.id);
  if (!isStaffRole(role)) {
    throw new ApiError("FORBIDDEN", "Staff permission required to view article studio.", 403);
  }

  const supabase = await createSupabaseServerClient();
  try {
    let request = supabase
      .from("articles")
      .select(ARTICLE_SELECT)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });

    if (role !== "admin") {
      request = request.eq("author_id", user.id);
    }

    const { data, error } = await request;
    if (error) {
      if (!isMissingTable(error)) {
        console.error("[journal] staff articles query failed:", error.message);
      }
      return [];
    }
    return ((data ?? []) as unknown as ArticleRow[]).map(mapArticleRow);
  } catch (error) {
    console.error("[journal] staff articles unavailable:", error);
    return [];
  }
}

export async function saveArticle(input: SaveArticleInput, user: User): Promise<JournalArticle> {
  const role = await getMemberRole(user.id);

  if (!isStaffRole(role)) {
    throw new ApiError("FORBIDDEN", "Only Admins and Moderators can write and edit articles.", 403);
  }

  if (input.featured === true && role !== "admin") {
    throw new ApiError("FORBIDDEN", "Only Admins can feature articles.", 403);
  }

  const supabase = await createSupabaseServerClient();
  const generatedSlug = input.slug?.trim() ? slugify(input.slug) : slugify(input.title);
  if (!generatedSlug) {
    throw new ApiError("VALIDATION_ERROR", "A valid slug could not be generated.", 400);
  }

  const content = normalizeArticleContent(input.content);
  const coverImageUrl = getSafeCoverImageUrl(input.coverImageUrl);
  if (input.coverImageUrl && !coverImageUrl) {
    throw new ApiError("VALIDATION_ERROR", "Cover image URL must use http(s) or a relative path.", 400);
  }

  const readingTime = calculateReadingTime(content);
  const isPublishing = input.status === "published";

  if (input.id) {
    const existing = await getArticleBySlugOrId(input.id, user);
    if (!existing) {
      throw new ApiError("NOT_FOUND", "Article not found for update.", 404);
    }

    if (role !== "admin" && existing.authorId !== user.id) {
      throw new ApiError("FORBIDDEN", "You can only update your own articles.", 403);
    }

    if (
      input.featured !== undefined &&
      input.featured !== existing.featured &&
      role !== "admin"
    ) {
      throw new ApiError("FORBIDDEN", "You do not have permission to feature articles.", 403);
    }

    const updates: Record<string, unknown> = {
      title: input.title,
      slug: generatedSlug,
      excerpt: input.excerpt || null,
      cover_image_url: coverImageUrl,
      content,
      category_id: input.categoryId || null,
      tags: input.tags || [],
      status: input.status || existing.status,
      reading_time_minutes: readingTime,
      featured: input.featured !== undefined ? input.featured : existing.featured,
      seo_title: input.seoTitle || null,
      seo_description: input.seoDescription || null,
      updated_at: new Date().toISOString(),
    };
    if (isPublishing && !existing.publishedAt) {
      updates.published_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("articles")
      .update(updates)
      .eq("id", input.id)
      .is("deleted_at", null)
      .select(ARTICLE_SELECT)
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new ApiError("CONFLICT", "An article with this slug already exists.", 409);
      }
      throw new ApiError("INTERNAL_ERROR", "The article could not be saved.", 500);
    }
    if (!data) throw new ApiError("INTERNAL_ERROR", "The article could not be saved.", 500);
    return mapArticleRow(data as unknown as ArticleRow);
  }

  const newRow: Record<string, unknown> = {
    title: input.title,
    slug: generatedSlug,
    excerpt: input.excerpt || null,
    cover_image_url: coverImageUrl,
    content,
    author_id: user.id,
    category_id: input.categoryId || null,
    tags: input.tags || [],
    status: input.status || "draft",
    reading_time_minutes: readingTime,
    featured: input.featured || false,
    published_at: isPublishing ? new Date().toISOString() : null,
    seo_title: input.seoTitle || null,
    seo_description: input.seoDescription || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("articles")
    .insert(newRow)
    .select(ARTICLE_SELECT)
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new ApiError("CONFLICT", "An article with this slug already exists. Please choose a different slug.", 409);
    }
    if (isMissingTable(error)) {
      throw new ApiError("SERVICE_UNAVAILABLE", "The journal is not set up yet.", 503);
    }
    throw new ApiError("INTERNAL_ERROR", "The article could not be saved.", 500);
  }
  if (!data) throw new ApiError("INTERNAL_ERROR", "The article could not be saved.", 500);
  return mapArticleRow(data as unknown as ArticleRow);
}

export async function deleteArticle(id: string, user: User): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const outcome = await deleteArticleWithDependencies(id, user, {
    getPermissions: getUserPermissions,
    getExistingArticle: (articleId, identity) =>
      getArticleBySlugOrId(articleId, identity as User),
    getClient: async () => supabase as unknown as DeletionClient,
    log: (message, meta) => {
      console.warn(message, meta);
    },
  });

  if (outcome.article.coverImageUrl) {
    try {
      const url = new URL(outcome.article.coverImageUrl);
      const match = url.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
      if (match) {
        await supabase.storage.from(match[1]).remove([decodeURIComponent(match[2])]);
      }
    } catch {
      // The article is already deleted. Orphaned media must not fail the request.
    }
  }
}
