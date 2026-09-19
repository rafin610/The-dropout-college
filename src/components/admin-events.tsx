"use client";

import { CalendarPlus, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Category } from "@/lib/supabase-data";

type AdminEvent = {
  id: string;
  title: string;
  slug: string;
  description: string;
  event_type: string;
  starts_at: string;
  ends_at: string;
  location: string | null;
  status: string;
  category_id: string | null;
};

type Toast = { message: string; tone: "success" | "error" | "info" } | null;

const emptyForm = { title: "", slug: "", description: "", eventType: "Workshop", startsAt: "", endsAt: "", location: "", categoryId: "", status: "draft" };

function localDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function AdminEvents() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);

  function showToast(message: string, tone: "success" | "error" | "info") {
    setToast({ message, tone });
  }

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  async function load() {
    try {
      const [eventResponse, categoryResponse] = await Promise.all([fetch("/api/v1/admin/events", { cache: "no-store" }), fetch("/api/v1/categories", { cache: "no-store" })]);
      if (eventResponse.ok) {
        setEvents((await eventResponse.json()).data ?? []);
      } else {
        showToast("Could not load events. Please try again.", "error");
      }
      if (categoryResponse.ok) setCategories((await categoryResponse.json()).data ?? []);
    } catch {
      showToast("Network error while loading events.", "error");
    } finally {
      setLoading(false);
    }
  }

  // Initial data loading is the effect's external synchronization boundary.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, []);

  function updateField(field: keyof typeof emptyForm, value: string) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      // Keep the slug in sync while creating (admins can still override it).
      if (field === "title" && !editingId) next.slug = toSlug(value);
      return next;
    });
  }

  function editEvent(event: AdminEvent) {
    setEditingId(event.id);
    setConfirmDeleteId(null);
    setForm({ title: event.title, slug: event.slug, description: event.description, eventType: event.event_type, startsAt: localDateTime(event.starts_at), endsAt: localDateTime(event.ends_at), location: event.location ?? "", categoryId: event.category_id ?? "", status: event.status });
    showToast(`Editing "${event.title}".`, "info");
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function validateForm(): string | null {
    if (form.title.trim().length < 2) return "Please enter an event title.";
    if (!/^[a-z0-9-]+$/.test(form.slug.trim()) || form.slug.trim().length < 2) return "Slug must be lowercase letters, numbers, or hyphens.";
    if (form.description.trim().length < 10) return "Description must be at least 10 characters.";
    if (form.eventType.trim().length < 2) return "Please enter an event type.";
    const starts = new Date(form.startsAt);
    const ends = new Date(form.endsAt);
    if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime())) return "Please choose valid start and end times.";
    if (ends.getTime() <= starts.getTime()) return "End time must be after start time.";
    return null;
  }

  async function saveEvent(event: React.FormEvent) {
    event.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      showToast(validationError, "error");
      return;
    }
    setSaving(true);
    showToast(editingId ? "Saving event..." : "Creating event...", "info");
    const payload = { ...form, title: form.title.trim(), slug: form.slug.trim(), description: form.description.trim(), eventType: form.eventType.trim(), startsAt: new Date(form.startsAt).toISOString(), endsAt: new Date(form.endsAt).toISOString(), categoryId: form.categoryId || null, location: form.location.trim() || null, status: form.status };
    try {
      const response = await fetch(editingId ? `/api/v1/admin/events/${editingId}` : "/api/v1/admin/events", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json().catch(() => null);
      if (response.ok && body?.data) {
        const saved = body.data as AdminEvent;
        if (saved.status === "published") {
          showToast(editingId ? "Event updated and published. It is now visible on the Events page." : "Event created and published. It is now visible on the Events page.", "success");
        } else {
          showToast(editingId ? "Event updated as draft. Publish it to show it on the Events page." : "Event created as draft. Publish it to show it on the Events page.", "success");
        }
        resetForm();
        await load();
      } else {
        showToast(body?.error?.message || "Failed to create event. Please try again.", "error");
      }
    } catch {
      showToast("Failed to create event. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(id: string, status: string) {
    const target = events.find((event) => event.id === id);
    setPendingId(id);
    showToast(status === "published" ? "Publishing event..." : "Unpublishing event...", "info");
    try {
      const response = await fetch(`/api/v1/admin/events/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const body = await response.json().catch(() => null);
      if (response.ok && body?.data) {
        showToast(status === "published" ? `Event published successfully. "${target?.title ?? "Event"}" is now visible on the Events page.` : "Event unpublished. It is hidden from the Events page.", "success");
        await load();
      } else {
        showToast(body?.error?.message || "Could not publish event.", "error");
      }
    } catch {
      showToast("Could not publish event.", "error");
    } finally {
      setPendingId(null);
    }
  }

  async function archiveEvent(id: string) {
    const target = events.find((event) => event.id === id);
    setPendingId(id);
    try {
      const response = await fetch(`/api/v1/admin/events/${id}`, { method: "DELETE" });
      if (response.ok) {
        showToast(`"${target?.title ?? "Event"}" cancelled and hidden from the Events page.`, "success");
        setConfirmDeleteId(null);
        await load();
      } else {
        const body = await response.json().catch(() => null);
        showToast(body?.error?.message || "The event could not be cancelled.", "error");
      }
    } catch {
      showToast("The event could not be cancelled.", "error");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="admin-panel">
      <div className="section-heading">
        <div><div className="eyebrow">Calendar</div><h2>Event management</h2></div>
        <button type="button" className="button button-primary" onClick={resetForm}><CalendarPlus size={14} /> New event</button>
      </div>

      {toast && (
        <div
          role={toast.tone === "error" ? "alert" : "status"}
          aria-live="polite"
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: 6,
            fontSize: "0.85rem",
            border: `1px solid ${toast.tone === "success" ? "rgba(34, 197, 94, 0.4)" : toast.tone === "error" ? "rgba(255, 107, 107, 0.4)" : "var(--line)"}`,
            background: toast.tone === "success" ? "rgba(34, 197, 94, 0.08)" : toast.tone === "error" ? "rgba(255, 107, 107, 0.08)" : "var(--surface-2)",
            color: toast.tone === "success" ? "var(--lime)" : toast.tone === "error" ? "#ff6b6b" : "var(--muted)",
          }}
        >
          {toast.message}
        </div>
      )}

      <form className="admin-form-grid" onSubmit={saveEvent}>
        <div className="field"><label htmlFor="event-title">Title</label><input id="event-title" value={form.title} onChange={(event) => updateField("title", event.target.value)} required /></div>
        <div className="field"><label htmlFor="event-slug">Slug</label><input id="event-slug" value={form.slug} onChange={(event) => updateField("slug", event.target.value)} required /></div>
        <div className="field"><label htmlFor="event-type">Type</label><input id="event-type" value={form.eventType} onChange={(event) => updateField("eventType", event.target.value)} required /></div>
        <div className="field"><label htmlFor="event-category">Category</label><select id="event-category" value={form.categoryId} onChange={(event) => updateField("categoryId", event.target.value)}><option value="">No category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
        <div className="field"><label htmlFor="event-starts">Starts</label><input id="event-starts" type="datetime-local" value={form.startsAt} onChange={(event) => updateField("startsAt", event.target.value)} required /></div>
        <div className="field"><label htmlFor="event-ends">Ends</label><input id="event-ends" type="datetime-local" value={form.endsAt} onChange={(event) => updateField("endsAt", event.target.value)} required /></div>
        <div className="field"><label htmlFor="event-location">Location or online link</label><input id="event-location" value={form.location} onChange={(event) => updateField("location", event.target.value)} /></div>
        <div className="field">
          <label htmlFor="event-status">Status</label>
          <select id="event-status" value={form.status} onChange={(event) => updateField("status", event.target.value)}>
            <option value="draft">Draft — hidden from the Events page</option>
            <option value="published">Published — visible on the Events page</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="field full"><label htmlFor="event-description">Description</label><textarea id="event-description" value={form.description} onChange={(event) => updateField("description", event.target.value)} rows={4} required /></div>
        <div className="field full" style={{ display: "flex", flexDirection: "row", justifyContent: "flex-end", gap: 8 }}><button type="button" className="button button-ghost" onClick={resetForm}>Clear</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? "Saving..." : editingId ? "Save event" : "Create event"}</button></div>
      </form>

      <div className="table-wrap" style={{ marginTop: 28 }}>
        <div className="admin-table">
          <div className="admin-table-head"><span>Event</span><span>When</span><span>Status</span><span>Actions</span></div>
          {loading ? <div className="admin-table-row"><span>Loading events...</span></div> : events.length === 0 ? <div className="admin-table-row"><span>No events yet. Create your first event above.</span></div> : events.map((event) => (
            <div className="admin-table-row" key={event.id}>
              <div><strong>{event.title}</strong><small>{event.event_type}</small></div>
              <span>{new Date(event.starts_at).toLocaleString()}</span>
              <span className={`status-badge ${event.status === "published" ? "active" : "inactive"}`}>{event.status}</span>
              <div className="inline-actions">
                <button type="button" onClick={() => editEvent(event)} aria-label={`Edit ${event.title}`} disabled={pendingId === event.id}><Pencil size={13} /></button>
                <button type="button" onClick={() => void setStatus(event.id, event.status === "published" ? "draft" : "published")} disabled={pendingId === event.id}>{pendingId === event.id ? "Saving..." : event.status === "published" ? "Unpublish" : "Publish"}</button>
                {confirmDeleteId === event.id ? (
                  <>
                    <button type="button" className="danger" onClick={() => void archiveEvent(event.id)} disabled={pendingId === event.id}>{pendingId === event.id ? "Cancelling..." : "Confirm cancel"}</button>
                    <button type="button" onClick={() => setConfirmDeleteId(null)}>Keep</button>
                  </>
                ) : (
                  <button type="button" className="danger" onClick={() => setConfirmDeleteId(event.id)} aria-label={`Cancel ${event.title}`} disabled={pendingId === event.id}><Trash2 size={13} /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
