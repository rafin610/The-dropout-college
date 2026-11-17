import { cache } from "react";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { getPublicEnv } from "@/server/env";
import { ApiError } from "@/server/errors";
import { getMemberRole, isStaffRole, normalizeMemberRole, type MemberRole } from "@/server/auth/roles";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface PostAuthor {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  role: MemberRole;
}

export interface Post {
  id: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  author: PostAuthor;
  loveCount: number;
  commentCount: number;
  viewerLoved: boolean;
}

export interface PostComment {
  id: string;
  postId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: PostAuthor;
}

type Embedded<T> = T | T[] | null | undefined;

interface ProfileJoin {
  id?: string;
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  user_roles?: Array<{ role?: string | null }> | null;
}

interface CountJoin {
  count?: number | null;
}

interface PostRow {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  author_id: string;
  author?: Embedded<ProfileJoin>;
  post_loves?: CountJoin[] | null;
  post_comments?: CountJoin[] | null;
}

interface CommentRow {
  id: string;
  post_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author_id: string;
  author?: Embedded<ProfileJoin>;
}

const POST_SELECT = `
  id, content, image_url, created_at, author_id,
  author:profiles!posts_author_id_fkey(id, display_name, username, avatar_url, user_roles(role)),
  post_loves(count),
  post_comments(count)
`;

const COMMENT_SELECT = `
  id, post_id, content, created_at, updated_at, author_id,
  author:profiles!post_comments_author_id_fkey(id, display_name, username, avatar_url, user_roles(role))
`;

function isMissingTable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    Boolean(error.message?.includes("does not exist"))
  );
}

function firstEmbedded<T>(value: Embedded<T>): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function mapAuthor(profile: ProfileJoin | null, fallbackId: string): PostAuthor {
  const roles = (profile?.user_roles ?? [])
    .map((entry) => entry?.role)
    .filter((role): role is string => Boolean(role));

  return {
    id: profile?.id || fallbackId,
    displayName: profile?.display_name || "Campus member",
    username: profile?.username || "",
    avatarUrl: profile?.avatar_url || null,
    role: normalizeMemberRole(roles),
  };
}

function mapPostRow(row: PostRow, viewerLoved = false): Post {
  return {
    id: row.id,
    content: row.content,
    imageUrl: row.image_url,
    createdAt: row.created_at,
    author: mapAuthor(firstEmbedded(row.author), row.author_id),
    loveCount: Number(row.post_loves?.[0]?.count ?? 0),
    commentCount: Number(row.post_comments?.[0]?.count ?? 0),
    viewerLoved,
  };
}

function mapCommentRow(row: CommentRow): PostComment {
  return {
    id: row.id,
    postId: row.post_id,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author: mapAuthor(firstEmbedded(row.author), row.author_id),
  };
}

async function lovedPostIds(postIds: string[], viewerId?: string | null): Promise<Set<string>> {
  if (!viewerId || postIds.length === 0) return new Set();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("post_loves")
    .select("post_id")
    .eq("profile_id", viewerId)
    .in("post_id", postIds);

  if (error) return new Set();
  return new Set((data ?? []).map((row) => String(row.post_id)));
}

export async function listPosts(options: {
  page?: number;
  limit?: number;
  viewerId?: string | null;
  authorId?: string;
}): Promise<{ posts: Post[]; total: number; unavailable: boolean }> {
  if (options.authorId && !UUID_PATTERN.test(options.authorId)) {
    return { posts: [], total: 0, unavailable: false };
  }

  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(30, Math.max(1, options.limit ?? 10));
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("posts")
    .select(POST_SELECT, { count: "exact" })
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (options.authorId) {
    query = query.eq("author_id", options.authorId);
  }

  const { data, error, count } = await query;

  if (error) {
    if (isMissingTable(error)) return { posts: [], total: 0, unavailable: true };
    throw error;
  }

  const rows = (data ?? []) as unknown as PostRow[];
  const loved = await lovedPostIds(rows.map((row) => row.id), options.viewerId);

  return {
    posts: rows.map((row) => mapPostRow(row, loved.has(row.id))),
    total: count ?? rows.length,
    unavailable: false,
  };
}

export const getPostById = cache(async (
  postId: string,
  viewerId?: string | null,
): Promise<{ post: Post | null; unavailable: boolean }> => {
  if (!UUID_PATTERN.test(postId)) {
    return { post: null, unavailable: false };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("id", postId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    if (isMissingTable(error)) return { post: null, unavailable: true };
    throw error;
  }

  if (!data) return { post: null, unavailable: false };
  const loved = await lovedPostIds([postId], viewerId);
  return {
    post: mapPostRow(data as unknown as PostRow, loved.has(postId)),
    unavailable: false,
  };
});

export function isSafePostImageUrl(value: string | null | undefined): boolean {
  if (!value) return true;
  if (value.length > 2000) return false;
  if (value.startsWith("/")) return !value.startsWith("//");
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const base = new URL(getPublicEnv().NEXT_PUBLIC_SUPABASE_URL);
    return (
      url.origin === base.origin &&
      url.pathname.startsWith("/storage/v1/object/public/post-media/")
    );
  } catch {
    return false;
  }
}

export async function createPost(input: {
  content: string;
  imageUrl?: string | null;
  authorId: string;
}): Promise<Post> {
  const content = input.content.trim();
  if (content.length < 1 || content.length > 300) {
    throw new ApiError("VALIDATION_ERROR", "A post needs between 1 and 300 characters.", 400);
  }
  if (!isSafePostImageUrl(input.imageUrl)) {
    throw new ApiError("VALIDATION_ERROR", "The image URL is invalid.", 400);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("posts")
    .insert({
      author_id: input.authorId,
      content,
      image_url: input.imageUrl || null,
    })
    .select("id")
    .single();

  if (error) {
    if (isMissingTable(error)) {
      throw new ApiError("SERVICE_UNAVAILABLE", "The Campus feed is not set up yet.", 503);
    }
    if (error.code === "23514") {
      throw new ApiError("VALIDATION_ERROR", "A post needs between 1 and 300 characters.", 400);
    }
    throw error;
  }

  const created = await getPostById(String(data.id), input.authorId);
  if (!created.post) {
    throw new ApiError("INTERNAL_ERROR", "The post was created but could not be loaded.", 500);
  }
  return created.post;
}

export async function deletePost(postId: string, userId: string): Promise<void> {
  const existing = await getPostById(postId, userId);
  if (existing.unavailable) {
    throw new ApiError("SERVICE_UNAVAILABLE", "The Campus feed is not set up yet.", 503);
  }
  if (!existing.post) {
    throw new ApiError("NOT_FOUND", "Post not found.", 404);
  }

  const role = await getMemberRole(userId);
  if (existing.post.author.id !== userId && !isStaffRole(role)) {
    throw new ApiError("FORBIDDEN", "You cannot delete this post.", 403);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("posts")
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", postId)
    .is("deleted_at", null);

  if (error) throw error;

  if (existing.post.imageUrl) {
    try {
      const url = new URL(existing.post.imageUrl);
      const match = url.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
      if (match) {
        await supabase.storage.from(match[1]).remove([decodeURIComponent(match[2])]);
      }
    } catch {
      // The post is already hidden. Orphaned media should not fail the request.
    }
  }
}

export async function toggleLove(
  postId: string,
  userId: string,
): Promise<{ loved: boolean; loveCount: number }> {
  const existing = await getPostById(postId, userId);
  if (existing.unavailable) {
    throw new ApiError("SERVICE_UNAVAILABLE", "The Campus feed is not set up yet.", 503);
  }
  if (!existing.post) {
    throw new ApiError("NOT_FOUND", "Post not found.", 404);
  }

  const supabase = await createSupabaseServerClient();
  let loved: boolean;

  if (existing.post.viewerLoved) {
    const { error } = await supabase
      .from("post_loves")
      .delete()
      .eq("post_id", postId)
      .eq("profile_id", userId);
    if (error) throw error;
    loved = false;
  } else {
    const { error } = await supabase
      .from("post_loves")
      .insert({ post_id: postId, profile_id: userId });
    if (error && error.code !== "23505") throw error;
    loved = true;
  }

  const { count } = await supabase
    .from("post_loves")
    .select("post_id", { count: "exact", head: true })
    .eq("post_id", postId);

  return { loved, loveCount: count ?? (loved ? 1 : 0) };
}

export async function listComments(postId: string, limit = 60): Promise<PostComment[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("post_comments")
    .select(COMMENT_SELECT)
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .limit(Math.min(100, Math.max(1, limit)));

  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }

  return ((data ?? []) as unknown as CommentRow[]).map(mapCommentRow);
}

export async function createComment(input: {
  postId: string;
  authorId: string;
  content: string;
}): Promise<PostComment> {
  const content = input.content.trim();
  if (content.length < 1 || content.length > 1000) {
    throw new ApiError("VALIDATION_ERROR", "A comment needs between 1 and 1000 characters.", 400);
  }

  const post = await getPostById(input.postId, input.authorId);
  if (post.unavailable) {
    throw new ApiError("SERVICE_UNAVAILABLE", "The Campus feed is not set up yet.", 503);
  }
  if (!post.post) {
    throw new ApiError("NOT_FOUND", "Post not found.", 404);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("post_comments")
    .insert({
      post_id: input.postId,
      author_id: input.authorId,
      content,
    })
    .select(COMMENT_SELECT)
    .single();

  if (error) {
    if (error.code === "23514") {
      throw new ApiError("VALIDATION_ERROR", "A comment needs between 1 and 1000 characters.", 400);
    }
    throw error;
  }

  return mapCommentRow(data as unknown as CommentRow);
}

export async function updateComment(input: {
  commentId: string;
  postId: string;
  userId: string;
  content: string;
}): Promise<PostComment> {
  const content = input.content.trim();
  if (content.length < 1 || content.length > 1000) {
    throw new ApiError("VALIDATION_ERROR", "A comment needs between 1 and 1000 characters.", 400);
  }

  const supabase = await createSupabaseServerClient();
  const { data: existing, error: lookupError } = await supabase
    .from("post_comments")
    .select("id, author_id, post_id")
    .eq("id", input.commentId)
    .eq("post_id", input.postId)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (!existing) throw new ApiError("NOT_FOUND", "Comment not found.", 404);
  if (existing.author_id !== input.userId) {
    throw new ApiError("FORBIDDEN", "You can only edit your own comments.", 403);
  }

  const { data, error } = await supabase
    .from("post_comments")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", input.commentId)
    .select(COMMENT_SELECT)
    .single();

  if (error) {
    if (error.code === "23514") {
      throw new ApiError("VALIDATION_ERROR", "A comment needs between 1 and 1000 characters.", 400);
    }
    throw error;
  }

  return mapCommentRow(data as unknown as CommentRow);
}

export async function deleteComment(input: {
  commentId: string;
  postId: string;
  userId: string;
}): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data: existing, error: lookupError } = await supabase
    .from("post_comments")
    .select("id, author_id")
    .eq("id", input.commentId)
    .eq("post_id", input.postId)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (!existing) throw new ApiError("NOT_FOUND", "Comment not found.", 404);

  const role = await getMemberRole(input.userId);
  if (existing.author_id !== input.userId && !isStaffRole(role)) {
    throw new ApiError("FORBIDDEN", "You cannot delete this comment.", 403);
  }

  const { error } = await supabase.from("post_comments").delete().eq("id", input.commentId);
  if (error) throw error;
}
