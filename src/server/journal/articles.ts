import { createSupabaseServerClient } from "@/server/supabase/server";
import { ApiError } from "@/server/errors";
import { getUserPermissions } from "@/server/auth/permissions";
import type { User } from "@supabase/supabase-js";
import type { JournalArticle, ArticleAuthor, SaveArticleInput } from "./types";
import { calculateReadingTime, slugify } from "./validation";

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
    role: (roles[0] as string) || "writer",
    bio: rawAuthor?.bio || null,
  };

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    coverImageUrl: row.cover_image_url,
    content: row.content || { type: "doc", content: [] },
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

interface ProjectFallbackRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  cover_image_url?: string | null;
  status: string;
  category_id?: string | null;
  created_at: string;
  updated_at?: string;
  owner_id: string;
  categories?: { id?: string; name?: string; slug?: string; color?: string | null } | Array<{ id?: string; name?: string; slug?: string; color?: string | null }> | null;
  owner?: {
    id?: string;
    display_name?: string;
    username?: string;
    avatar_url?: string | null;
    bio?: string | null;
    user_roles?: Array<{ role?: string }> | null;
  } | Array<{
    id?: string;
    display_name?: string;
    username?: string;
    avatar_url?: string | null;
    bio?: string | null;
    user_roles?: Array<{ role?: string }> | null;
  }> | null;
}

function projectToArticle(p: ProjectFallbackRow): JournalArticle {
  const category = Array.isArray(p.categories) ? p.categories[0] : p.categories;
  const owner = Array.isArray(p.owner) ? p.owner[0] : p.owner;

  // Build a rich structured TipTap doc from the text
  const paragraphs = (p.description || "").split(/\n\n+/).filter(Boolean);
  const docContent = paragraphs.map((para) => ({
    type: "paragraph",
    content: [{ type: "text", text: para }],
  }));

  return {
    id: p.id,
    title: p.name,
    slug: p.slug,
    excerpt: p.description?.slice(0, 260) || null,
    coverImageUrl: p.cover_image_url || null,
    content: {
      type: "doc",
      content: docContent.length > 0 ? docContent : [{ type: "paragraph", content: [{ type: "text", text: p.description || "" }] }],
    },
    authorId: p.owner_id,
    categoryId: p.category_id || null,
    categoryName: category?.name || "Education",
    categoryColor: category?.color || "#4F5E33",
    tags: ["DropOut Journal", "Independent Learning"],
    status: "published",
    readingTimeMinutes: calculateReadingTime(p.description),
    featured: p.slug === "how-to-become-a-philomath",
    publishedAt: p.created_at,
    seoTitle: `${p.name} | The DropOut Journal`,
    seoDescription: p.description?.slice(0, 160) || null,
    createdAt: p.created_at,
    updatedAt: p.updated_at || p.created_at,
    author: {
      id: owner?.id || p.owner_id,
      displayName: owner?.display_name || "The DropOut College Team",
      username: owner?.username || "team",
      avatarUrl: owner?.avatar_url || null,
      role: "admin",
      bio: owner?.bio || "Editorial team at The DropOut College",
    },
  };
}

const ARTICLE_SELECT = `
  id, title, slug, excerpt, cover_image_url, content, author_id, category_id, tags,
  status, reading_time_minutes, featured, published_at, seo_title, seo_description,
  created_at, updated_at, deleted_at,
  categories(id, name, slug, color),
  author:profiles!articles_author_id_fkey(id, display_name, username, avatar_url, bio, user_roles(role))
`;

const PROJECT_FALLBACK_SELECT = `
  id, name, slug, description, cover_image_url, status, category_id, created_at, updated_at, owner_id,
  categories(id, name, slug, color),
  owner:profiles!projects_owner_id_fkey(id, display_name, username, avatar_url, bio, user_roles(role))
`;

export async function checkUserCanWriteArticles(userId: string): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return permissions.has("*") || permissions.has("articles.create") || permissions.has("articles.manage");
}

export async function getPublishedArticles({
  categorySlug,
  query,
  limit = 20,
  page = 1,
}: {
  categorySlug?: string;
  query?: string;
  limit?: number;
  page?: number;
}): Promise<{ articles: JournalArticle[]; total: number }> {
  const supabase = await createSupabaseServerClient();

  try {
    let q = supabase
      .from("articles")
      .select(ARTICLE_SELECT, { count: "exact" })
      .eq("status", "published")
      .is("deleted_at", null)
      .order("featured", { ascending: false })
      .order("published_at", { ascending: false });

    if (query?.trim()) {
      const search = `%${query.trim()}%`;
      q = q.or(`title.ilike.${search},excerpt.ilike.${search}`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    q = q.range(from, to);

    const { data, count, error } = await q;

    if (!error && data) {
      let articles = (data as unknown as ArticleRow[]).map(mapArticleRow);
      if (categorySlug && categorySlug !== "all") {
        articles = articles.filter(
          (a) =>
            a.categoryName?.toLowerCase() === categorySlug.toLowerCase() ||
            a.tags.some((t) => t.toLowerCase() === categorySlug.toLowerCase())
        );
      }
      return { articles, total: count ?? articles.length };
    }
  } catch {
    // Fall back to projects table
  }

  // Graceful fallback to projects table
  try {
    let q = supabase
      .from("projects")
      .select(PROJECT_FALLBACK_SELECT, { count: "exact" })
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (query?.trim()) {
      const search = `%${query.trim()}%`;
      q = q.or(`name.ilike.${search},description.ilike.${search}`);
    }

    const { data, count } = await q;
    let articles = (data || []).map((row) => projectToArticle(row as unknown as ProjectFallbackRow));

    if (categorySlug && categorySlug !== "all") {
      articles = articles.filter(
        (a) => a.categoryName?.toLowerCase() === categorySlug.toLowerCase()
      );
    }

    return { articles, total: count ?? articles.length };
  } catch {
    return { articles: [], total: 0 };
  }
}

export async function getArticleBySlugOrId(
  slugOrId: string,
  user?: User | null
): Promise<JournalArticle | null> {
  const supabase = await createSupabaseServerClient();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);

  // 1. Try querying articles table
  try {
    let q = supabase.from("articles").select(ARTICLE_SELECT).is("deleted_at", null);
    if (isUuid) {
      q = q.or(`id.eq.${slugOrId},slug.eq.${slugOrId}`);
    } else {
      q = q.eq("slug", slugOrId);
    }

    const { data, error } = await q.maybeSingle();

    if (!error && data) {
      const article = mapArticleRow(data as unknown as ArticleRow);

      // If draft or archived, ensure only authorized users can view it
      if (article.status !== "published") {
        if (!user) {
          throw new ApiError("NOT_FOUND", "Article not found.", 404);
        }
        const permissions = await getUserPermissions(user.id);
        const isAuthor = article.authorId === user.id;
        const isStaff = permissions.has("*") || permissions.has("articles.manage") || permissions.has("articles.moderate");

        if (!isAuthor && !isStaff) {
          throw new ApiError("NOT_FOUND", "Article not found.", 404);
        }
      }

      return article;
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
  }

  // 2. Fallback to projects table by slug or id
  try {
    let q = supabase.from("projects").select(PROJECT_FALLBACK_SELECT).is("deleted_at", null);
    if (isUuid) {
      q = q.or(`id.eq.${slugOrId},slug.eq.${slugOrId}`);
    } else {
      q = q.eq("slug", slugOrId);
    }

    const { data, error } = await q.maybeSingle();
    if (!error && data) {
      return projectToArticle(data as unknown as ProjectFallbackRow);
    }
  } catch {
    // Continue
  }

  return null;
}

export async function getRelatedArticles(
  currentId: string,
  categoryId?: string | null,
  limit = 3
): Promise<JournalArticle[]> {
  const supabase = await createSupabaseServerClient();
  try {
    let q = supabase
      .from("articles")
      .select(ARTICLE_SELECT)
      .eq("status", "published")
      .neq("id", currentId)
      .is("deleted_at", null)
      .limit(limit);

    if (categoryId) {
      q = q.eq("category_id", categoryId);
    }

    const { data } = await q;
    if (data && data.length > 0) {
      return (data as unknown as ArticleRow[]).map(mapArticleRow);
    }
  } catch {
    // Fall back to projects
  }

  try {
    const { data } = await supabase
      .from("projects")
      .select(PROJECT_FALLBACK_SELECT)
      .neq("id", currentId)
      .is("deleted_at", null)
      .limit(limit);

    return (data || []).map((r) => projectToArticle(r as unknown as ProjectFallbackRow));
  } catch {
    return [];
  }
}

export async function getStaffArticles(user: User): Promise<JournalArticle[]> {
  const permissions = await getUserPermissions(user.id);
  const isSuperOrAdmin = permissions.has("*") || permissions.has("articles.manage");
  const isModerator = permissions.has("articles.create") || permissions.has("articles.moderate");

  if (!isSuperOrAdmin && !isModerator) {
    throw new ApiError("FORBIDDEN", "Staff permission required to view article studio.", 403);
  }

  const supabase = await createSupabaseServerClient();
  try {
    let q = supabase
      .from("articles")
      .select(ARTICLE_SELECT)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });

    // If moderator without manage permission, only their own articles
    if (!isSuperOrAdmin) {
      q = q.eq("author_id", user.id);
    }

    const { data, error } = await q;
    if (!error && data) {
      return (data as unknown as ArticleRow[]).map(mapArticleRow);
    }
  } catch {
    // Fall back to projects table
  }

  try {
    let q = supabase
      .from("projects")
      .select(PROJECT_FALLBACK_SELECT)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (!isSuperOrAdmin) {
      q = q.eq("owner_id", user.id);
    }

    const { data } = await q;
    return (data || []).map((r) => projectToArticle(r as unknown as ProjectFallbackRow));
  } catch {
    return [];
  }
}

export async function saveArticle(input: SaveArticleInput, user: User): Promise<JournalArticle> {
  const permissions = await getUserPermissions(user.id);
  const isStaff = permissions.has("*") || permissions.has("articles.create") || permissions.has("articles.manage");

  if (!isStaff) {
    throw new ApiError("FORBIDDEN", "Only Admins and Moderators can write and edit articles.", 403);
  }

  const supabase = await createSupabaseServerClient();

  const generatedSlug = input.slug?.trim() ? slugify(input.slug) : slugify(input.title);
  if (!generatedSlug) {
    throw new ApiError("VALIDATION_ERROR", "A valid slug could not be generated.", 400);
  }

  const readingTime = calculateReadingTime(input.content);
  const isPublishing = input.status === "published";

  // Check if updating an existing article
  if (input.id) {
    const existing = await getArticleBySlugOrId(input.id, user);
    if (!existing) {
      throw new ApiError("NOT_FOUND", "Article not found for update.", 404);
    }

    // Check permissions: Admins can update any; Moderators only their own
    const canManageAll = permissions.has("*") || permissions.has("articles.manage");
    if (!canManageAll && existing.authorId !== user.id) {
      throw new ApiError("FORBIDDEN", "You can only update your own articles.", 403);
    }

    // Prepare update payload
    const updates: Record<string, unknown> = {
      title: input.title,
      slug: generatedSlug,
      excerpt: input.excerpt || null,
      cover_image_url: input.coverImageUrl || null,
      content: input.content,
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

    // Try updating articles table
    try {
      const { data, error } = await supabase
        .from("articles")
        .update(updates)
        .eq("id", input.id)
        .select(ARTICLE_SELECT)
        .single();

      if (!error && data) {
        return mapArticleRow(data as unknown as ArticleRow);
      }
      if (error && error.code === "23505") {
        throw new ApiError("CONFLICT", "An article with this slug already exists.", 409);
      }
    } catch (err) {
      if (err instanceof ApiError) throw err;
    }

    // Fallback: update in projects table
    try {
      await supabase
        .from("projects")
        .update({
          name: input.title,
          slug: generatedSlug,
          description: input.excerpt || input.title,
          cover_image_url: input.coverImageUrl || null,
          category_id: input.categoryId || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.id);

      const refreshed = await getArticleBySlugOrId(input.id, user);
      if (refreshed) return refreshed;
    } catch {
      // Continue
    }

    throw new ApiError("INTERNAL_ERROR", "Failed to update article.", 500);
  }

  // Creating a new article
  const newRow: Record<string, unknown> = {
    title: input.title,
    slug: generatedSlug,
    excerpt: input.excerpt || null,
    cover_image_url: input.coverImageUrl || null,
    content: input.content,
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

  try {
    const { data, error } = await supabase
      .from("articles")
      .insert(newRow)
      .select(ARTICLE_SELECT)
      .single();

    if (!error && data) {
      return mapArticleRow(data as unknown as ArticleRow);
    }
    if (error && error.code === "23505") {
      throw new ApiError("CONFLICT", "An article with this slug already exists. Please choose a different slug.", 409);
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
  }

  // Fallback creation in projects table
  try {
    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .insert({
        owner_id: user.id,
        name: input.title,
        slug: generatedSlug,
        description: input.excerpt || input.title,
        category_id: input.categoryId || null,
        cover_image_url: input.coverImageUrl || null,
        status: isPublishing ? "launched" : "idea",
        visibility: "public",
      })
      .select(PROJECT_FALLBACK_SELECT)
      .single();

    if (projectError) {
      if (projectError.code === "23505") {
        throw new ApiError("CONFLICT", "An article with this slug already exists.", 409);
      }
      throw projectError;
    }

    return projectToArticle(projectData as unknown as ProjectFallbackRow);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError("INTERNAL_ERROR", "Failed to save article.", 500);
  }
}

export async function deleteArticle(id: string, user: User): Promise<void> {
  const permissions = await getUserPermissions(user.id);
  const existing = await getArticleBySlugOrId(id, user);

  if (!existing) {
    throw new ApiError("NOT_FOUND", "Article not found.", 404);
  }

  const isSuperOrAdmin = permissions.has("*") || permissions.has("articles.manage");
  const isAuthorModerator = permissions.has("articles.create") && existing.authorId === user.id;

  if (!isSuperOrAdmin && !isAuthorModerator) {
    throw new ApiError("FORBIDDEN", "You do not have permission to delete this article.", 403);
  }

  const supabase = await createSupabaseServerClient();
  const deletedAt = new Date().toISOString();
  let deleted = false;

  // Try soft-deleting in articles table
  try {
    const { error } = await supabase
      .from("articles")
      .update({ deleted_at: deletedAt })
      .eq("id", id)
      .is("deleted_at", null);

    if (!error) {
      deleted = true;
    } else {
      console.warn("[deleteArticle] articles table soft-delete error:", error.message);
    }
  } catch (err) {
    console.warn("[deleteArticle] articles table exception:", err);
  }

  // Fallback: try soft-deleting in projects table
  if (!deleted) {
    try {
      const { error } = await supabase
        .from("projects")
        .update({ deleted_at: deletedAt })
        .eq("id", id)
        .is("deleted_at", null);

      if (!error) {
        deleted = true;
      } else {
        console.warn("[deleteArticle] projects table soft-delete error:", error.message);
      }
    } catch (err) {
      console.warn("[deleteArticle] projects table exception:", err);
    }
  }

  if (!deleted) {
    throw new ApiError("INTERNAL_ERROR", "Failed to delete the article. Please try again.", 500);
  }

  // Clean up associated cover image from storage if applicable
  if (existing.coverImageUrl) {
    try {
      const url = new URL(existing.coverImageUrl);
      const storageMatch = url.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
      if (storageMatch) {
        const [, bucket, path] = storageMatch;
        await supabase.storage.from(bucket).remove([decodeURIComponent(path)]);
      }
    } catch {
      // Non-critical: storage cleanup failure should not block the deletion response
    }
  }
}
