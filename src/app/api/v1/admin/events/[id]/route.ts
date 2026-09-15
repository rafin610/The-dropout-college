import { requirePermission } from "@/server/auth/permissions";
import { ApiError, toErrorResponse } from "@/server/errors";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { eventSchema } from "@/server/validation/resources";

export const runtime = "nodejs";

async function getId(context: { params: Promise<{ id: string }> }) {
  return (await context.params).id;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    await requirePermission("events.manage");
    const parsed = eventSchema.partial().safeParse(await request.json());
    if (!parsed.success) throw new ApiError("VALIDATION_ERROR", "Event data is invalid.", 400);
    const value = parsed.data;
    const updates = {
      ...(value.title !== undefined && { title: value.title }),
      ...(value.slug !== undefined && { slug: value.slug }),
      ...(value.description !== undefined && { description: value.description }),
      ...(value.eventType !== undefined && { event_type: value.eventType }),
      ...(value.startsAt !== undefined && { starts_at: value.startsAt }),
      ...(value.endsAt !== undefined && { ends_at: value.endsAt }),
      ...(value.capacity !== undefined && { capacity: value.capacity }),
      ...(value.location !== undefined && { location: value.location }),
      ...(value.categoryId !== undefined && { category_id: value.categoryId }),
      ...(value.eventUrl !== undefined && { event_url: value.eventUrl }),
      ...(value.coverImageUrl !== undefined && { cover_image_url: value.coverImageUrl }),
      ...(value.status !== undefined && { status: value.status }),
      updated_at: new Date().toISOString(),
    };
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("events").update(updates).eq("id", await getId(context)).select().single();
    if (error) throw new ApiError(error.code === "PGRST116" ? "NOT_FOUND" : "CONFLICT", "Event could not be updated.", error.code === "PGRST116" ? 404 : 409);
    return Response.json({ data, requestId });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    await requirePermission("events.manage");
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("events").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", await getId(context));
    if (error) throw error;
    return new Response(null, { status: 204, headers: { "x-request-id": requestId } });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}