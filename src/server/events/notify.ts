import { createSupabaseAdminClient, createSupabaseServerClient } from "@/server/supabase/server";

const EVENT_NOTIFICATION_TYPES = ["event_published", "event_updated", "event_cancelled"] as const;

/**
 * Create a persistent in-app notification for every active member when an
 * event is published for the first time.
 *
 * - Uses the service-role client when configured (bypasses RLS for fan-out).
 * - Falls back to the request-scoped client, which is covered by the
 *   `notifications_authenticated_insert_events` RLS policy.
 * - Idempotent: if a notification for this event already exists, nothing is
 *   inserted again (no duplicates on re-publish or page refresh).
 * - Never throws: notification failure must not fail the event mutation.
 */
export async function fanOutEventPublished(eventId: string, eventTitle: string): Promise<void> {
  try {
    const adminClient = createSupabaseAdminClient();
    const supabase = adminClient ?? (await createSupabaseServerClient());

    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("resource_type", "event")
      .eq("resource_id", eventId)
      .eq("type", "event_published")
      .limit(1);

    if (existing && existing.length > 0) return;

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id")
      .eq("status", "active")
      .limit(5000);

    if (profilesError || !profiles || profiles.length === 0) return;

    const rows = profiles.map((profile) => ({
      profile_id: profile.id,
      type: "event_published",
      title: "New Event",
      body: `"${eventTitle}" has been announced.`,
      resource_type: "event",
      resource_id: eventId,
    }));

    // Insert in batches to stay well within payload limits.
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500);
      const { error } = await supabase.from("notifications").insert(batch);
      if (error) {
        console.warn("[fanOutEventPublished] batch insert failed:", error.message);
        return;
      }
    }
  } catch (error) {
    console.warn("[fanOutEventPublished] failed:", error instanceof Error ? error.message : error);
  }
}

export { EVENT_NOTIFICATION_TYPES };
