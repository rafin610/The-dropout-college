import { getEvents } from "@/lib/supabase-data";
import { EventsClient } from "@/app/events/events-client";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  let events: Awaited<ReturnType<typeof getEvents>> = [];
  let loadError = false;

  try {
    events = await getEvents();
  } catch {
    loadError = true;
  }

  if (loadError) {
    return (
      <section className="panel">
        <h2>Unable to load events</h2>
        <p className="member-bio">Please try again later.</p>
      </section>
    );
  }

  return (
    <>
      <div className="page-title">
        <div className="eyebrow">The community calendar</div>
        <h1>
          Make time for<br />
          <span style={{ color: "var(--lime)" }}>the good stuff.</span>
        </h1>
        <p>Workshops, competitions, open studios, and the occasional excuse to stay up too late making something.</p>
      </div>

      <EventsClient events={events} />
    </>
  );
}