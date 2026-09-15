import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/server/supabase/server";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: event } = await supabase.from("events").select("id, title, description, event_type, starts_at, ends_at, location, status, event_url, categories(name)").eq("id", id).eq("status", "published").maybeSingle();
  if (!event) notFound();
  const category = Array.isArray(event.categories) ? event.categories[0] : event.categories;

  return (
    <article className="panel" style={{ maxWidth: 820, margin: "0 auto" }}>
      <div className="eyebrow">{category?.name || event.event_type}</div>
      <h1 style={{ margin: "12px 0", fontSize: "clamp(32px, 6vw, 64px)", lineHeight: 1 }}>{event.title}</h1>
      <p className="member-bio">{new Date(event.starts_at).toLocaleString()} to {new Date(event.ends_at).toLocaleTimeString()} {event.location ? `· ${event.location}` : ""}</p>
      <p className="hero-copy" style={{ whiteSpace: "pre-wrap" }}>{event.description}</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 28 }}>
        {event.event_url && <Link className="button button-primary" href={event.event_url} target="_blank" rel="noreferrer">Open event link</Link>}
        <Link className="button button-ghost" href="/events">Back to events</Link>
      </div>
    </article>
  );
}