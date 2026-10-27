import { getCurrentUser, getOptionalUser } from "@/server/auth/current-user";
import { toErrorResponse, ApiError } from "@/server/errors";
import { getArticleBySlugOrId, saveArticle, deleteArticle } from "@/server/journal/articles";
import { isValidArticleId } from "@/server/journal/delete-article";
import { articleSchema } from "@/server/journal/validation";
import { getUserPermissions } from "@/server/auth/permissions";

export const runtime = "nodejs";

async function getId(context: { params: Promise<{ id: string }> }) {
  return (await context.params).id;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    const id = await getId(context);
    const user = await getOptionalUser();
    const article = await getArticleBySlugOrId(id, user);

    if (!article) {
      throw new ApiError("NOT_FOUND", "Article not found.", 404);
    }

    return Response.json({ data: article, requestId });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    const id = await getId(context);
    const user = await getCurrentUser();
    const permissions = await getUserPermissions(user.id);

    if (!permissions.has("*") && !permissions.has("articles.create") && !permissions.has("articles.manage")) {
      throw new ApiError("FORBIDDEN", "Only Admins and Moderators can edit articles.", 403);
    }

    const body = await request.json();
    const parsed = articleSchema.partial().safeParse(body);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues
        ? parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")
        : parsed.error.message;
      throw new ApiError("VALIDATION_ERROR", `Invalid update data: ${errorMsg}`, 400);
    }

    const existing = await getArticleBySlugOrId(id, user);
    if (!existing) {
      throw new ApiError("NOT_FOUND", "Article not found.", 404);
    }

    // Role check: Admins can edit any; Moderators can only edit their own
    const canManageAll = permissions.has("*") || permissions.has("articles.manage");
    if (!canManageAll && existing.authorId !== user.id) {
      throw new ApiError("FORBIDDEN", "You can only edit your own articles.", 403);
    }

    const article = await saveArticle(
      {
        id: existing.id,
        title: parsed.data.title ?? existing.title,
        slug: parsed.data.slug ?? existing.slug,
        excerpt: parsed.data.excerpt !== undefined ? (parsed.data.excerpt || null) : existing.excerpt,
        coverImageUrl: parsed.data.coverImageUrl !== undefined ? (parsed.data.coverImageUrl || null) : existing.coverImageUrl,
        content: parsed.data.content ?? existing.content,
        categoryId: parsed.data.categoryId !== undefined ? (parsed.data.categoryId || null) : existing.categoryId,
        tags: parsed.data.tags ?? existing.tags,
        status: parsed.data.status ?? existing.status,
        featured: parsed.data.featured !== undefined ? parsed.data.featured : existing.featured,
        seoTitle: parsed.data.seoTitle !== undefined ? (parsed.data.seoTitle || null) : existing.seoTitle,
        seoDescription: parsed.data.seoDescription !== undefined ? (parsed.data.seoDescription || null) : existing.seoDescription,
      },
      user
    );

    return Response.json({ data: article, requestId });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    const id = await getId(context);
    const user = await getCurrentUser();
    if (!isValidArticleId(id)) {
      throw new ApiError("VALIDATION_ERROR", "Invalid article ID.", 400);
    }
    await deleteArticle(id, user);

    return new Response(null, { status: 204, headers: { "x-request-id": requestId } });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
