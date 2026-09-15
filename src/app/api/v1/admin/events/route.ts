import { requirePermission } from "@/server/auth/permissions";
import { ApiError, toErrorResponse } from "@/server/errors";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { eventSchema } from "@/server/validation/resources";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    await requirePermission("events.manage");
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("events").select("id, title, slug, description, event_type, starts_at, ends_at, capacity, location, event_url, category_id, cover_image_url, status, created_at, updated_at").order("starts_at", { ascending: true });
    if (error) throw error;
    return Response.json({ data: data ?? [], requestId });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    const user = await requirePermission("events.manage");
    const parsed = eventSchema.safeParse(await request.json());
    if (!parsed.success) throw new ApiError("VALIDATION_ERROR", "Event data is invalid.", 400);
    const value = parsed.data;
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("events").insert({
      created_by: user.id,
      title: value.title,
      slug: value.slug,
      description: value.description,
      event_type: value.eventType,
      starts_at: value.startsAt,
      ends_at: value.endsAt,
      capacity: value.capacity,
      location: value.location,
      category_id: value.categoryId,
      event_url: value.eventUrl,
      cover_image_url: value.coverImageUrl,
      status: value.status ?? "draft",
    }).select().single();
    if (error) throw error;
    return Response.json({ data, requestId }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}