import { getCurrentUser } from "@/server/auth/current-user";
import { toErrorResponse, ApiError } from "@/server/errors";
import { getPublishedArticles, saveArticle, getStaffArticles } from "@/server/journal/articles";
import { articleSchema } from "@/server/journal/validation";
import { getUserPermissions } from "@/server/auth/permissions";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const { searchParams } = new URL(request.url);

  try {
    const scope = searchParams.get("scope");
    if (scope === "staff") {
      const user = await getCurrentUser();
      const articles = await getStaffArticles(user);
      return Response.json({ data: articles, requestId });
    }

    const category = searchParams.get("category") || undefined;
    const query = searchParams.get("query") || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "12", 10)));

    const result = await getPublishedArticles({ categorySlug: category, query, page, limit });
    return Response.json({ data: result.articles, total: result.total, page, limit, requestId });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  try {
    const user = await getCurrentUser();
    const permissions = await getUserPermissions(user.id);

    if (!permissions.has("*") && !permissions.has("articles.create") && !permissions.has("articles.manage")) {
      throw new ApiError("FORBIDDEN", "Only Admins and Moderators can create articles.", 403);
    }

    const body = await request.json();
    const parsed = articleSchema.safeParse(body);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues
        ? parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")
        : parsed.error.message;
      throw new ApiError("VALIDATION_ERROR", `Invalid article data: ${errorMsg}`, 400);
    }

    const article = await saveArticle(
      {
        title: parsed.data.title,
        slug: parsed.data.slug,
        excerpt: parsed.data.excerpt || undefined,
        coverImageUrl: parsed.data.coverImageUrl || undefined,
        content: parsed.data.content,
        categoryId: parsed.data.categoryId || undefined,
        tags: parsed.data.tags,
        status: parsed.data.status,
        featured: parsed.data.featured,
        seoTitle: parsed.data.seoTitle || undefined,
        seoDescription: parsed.data.seoDescription || undefined,
      },
      user
    );

    return Response.json({ data: article, requestId }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
