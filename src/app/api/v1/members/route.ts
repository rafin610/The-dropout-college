import { getOptionalUser } from "@/server/auth/current-user";
import { ApiError, toErrorResponse } from "@/server/errors";
import { getMemberDirectoryPage } from "@/server/members/directory";
import { createSupabaseServerClient } from "@/server/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    const { searchParams } = new URL(request.url);
    const rawPage = Number.parseInt(searchParams.get("page") ?? "1", 10);
    if (!Number.isFinite(rawPage) || rawPage < 1) {
      throw new ApiError("VALIDATION_ERROR", "Page must be a positive number.", 400);
    }

    const [supabase, viewer] = await Promise.all([
      createSupabaseServerClient(),
      getOptionalUser(),
    ]);
    const data = await getMemberDirectoryPage(supabase, {
      page: rawPage,
      search: searchParams.get("search") ?? "",
      viewerId: viewer?.id,
    });

    return Response.json(
      { data, requestId },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
