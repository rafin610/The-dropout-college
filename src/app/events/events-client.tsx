"use client";

import { CalendarDays, MessageCircle } from "lucide-react";
import Link from "next/link";
import { EventCard } from "@/components/cards";
import type { Event } from "@/lib/supabase-data";

export function EventsClient({ events }: { events: Event[] }) {
  function downloadAllIcs() {
    if (!events.length) return;

    const vEvents = events.map((event) => [
      "BEGIN:VEVENT",
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.type} event at The DropOut College - ${event.meta}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
    ].join("\r\n")).join("\r\n");

    const calendarData = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//The DropOut College//Events//EN",
      vEvents,
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([calendarData], { type: "text/calendar;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "dropout_college_calendar.ics");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <>
      <div className="section-heading">
        <div>
          <div className="eyebrow">Upcoming events</div>
          <h2>Calendar ({events.length})</h2>
        </div>
        {events.length > 0 && (
          <button onClick={downloadAllIcs} className="button button-ghost" type="button">
            <CalendarDays size={15} /> Export calendar (.ics)
          </button>
        )}
      </div>

      {events.length ? (
        <div className="event-grid">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <div className="panel" style={{ textAlign: "center", padding: "40px 20px" }}>
          <p className="muted-text" style={{ fontSize: 14, margin: "0 0 16px" }}>
            No upcoming events are currently scheduled.
          </p>
          <Link
            href="https://discord.gg/3xfu5TMgF"
            target="_blank"
            rel="noreferrer"
            className="button button-primary"
            style={{ fontSize: 12 }}
          >
            Join Discord for live sessions <MessageCircle size={14} />
          </Link>
        </div>
      )}
    </>
  );
}
