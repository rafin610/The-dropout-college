/* eslint-disable react-hooks/error-boundaries */
import { CalendarDays } from "lucide-react";
import { getEvents } from "@/lib/supabase-data";
import { EventCard } from "@/components/cards";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  try {
    const events = await getEvents();
    return <><div className="page-title"><div className="eyebrow">The community calendar</div><h1>Make time for<br /><span style={{ color: "var(--lime)" }}>the good stuff.</span></h1><p>Workshops, competitions, open studios, and the occasional excuse to stay up too late making something.</p></div><div className="section-heading"><div><div className="eyebrow">Upcoming events</div><h2>Calendar</h2></div><button className="button button-ghost"><CalendarDays size={15} /> Add to calendar</button></div>{events.length ? <div className="event-grid">{events.map((event) => <EventCard key={event.id} event={event} />)}</div> : <p className="muted-text">No upcoming events have been added yet.</p>}</>;
  } catch { return <section className="panel"><h2>Unable to load events</h2><p className="member-bio">Please try again later.</p></section>; }
}