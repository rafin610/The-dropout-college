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

const emptyForm = { title: "", slug: "", description: "", eventType: "Workshop", startsAt: "", endsAt: "", location: "", categoryId: "", status: "draft" };

function localDateTime(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function AdminEvents() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const [eventResponse, categoryResponse] = await Promise.all([fetch("/api/v1/admin/events", { cache: "no-store" }), fetch("/api/v1/categories", { cache: "no-store" })]);
    if (eventResponse.ok) setEvents((await eventResponse.json()).data ?? []);
    if (categoryResponse.ok) setCategories((await categoryResponse.json()).data ?? []);
    setLoading(false);
  }

  // Initial data loading is the effect's external synchronization boundary.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, []);

  function updateField(field: keyof typeof emptyForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function editEvent(event: AdminEvent) {
    setEditingId(event.id);
    setForm({ title: event.title, slug: event.slug, description: event.description, eventType: event.event_type, startsAt: localDateTime(event.starts_at), endsAt: localDateTime(event.ends_at), location: event.location ?? "", categoryId: event.category_id ?? "", status: event.status });
    setMessage("");
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function saveEvent(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const payload = { ...form, startsAt: new Date(form.startsAt).toISOString(), endsAt: new Date(form.endsAt).toISOString(), categoryId: form.categoryId || null, location: form.location || null, status: form.status };
    const response = await fetch(editingId ? `/api/v1/admin/events/${editingId}` : "/api/v1/admin/events", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (response.ok) {
      setMessage(editingId ? "Event updated." : "Event created.");
      resetForm();
      await load();
    } else {
      const body = await response.json().catch(() => null);
      setMessage(body?.error?.message || "The event could not be saved.");
    }
    setSaving(false);
  }

  async function setStatus(id: string, status: string) {
    const response = await fetch(`/api/v1/admin/events/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (response.ok) await load();
    else setMessage("The event status could not be updated.");
  }

  async function archiveEvent(id: string) {
    const response = await fetch(`/api/v1/admin/events/${id}`, { method: "DELETE" });
    if (response.ok) await load();
    else setMessage("The event could not be archived.");
  }

  return (
    <div className="admin-panel">
      <div className="section-heading">
        <div><div className="eyebrow">Calendar</div><h2>Event management</h2></div>
        <button type="button" className="button button-primary" onClick={resetForm}><CalendarPlus size={14} /> New event</button>
      </div>

      <form className="admin-form-grid" onSubmit={saveEvent}>
        <div className="field"><label>Title</label><input value={form.title} onChange={(event) => updateField("title", event.target.value)} required /></div>
        <div className="field"><label>Slug</label><input value={form.slug} onChange={(event) => updateField("slug", event.target.value)} required /></div>
        <div className="field"><label>Type</label><input value={form.eventType} onChange={(event) => updateField("eventType", event.target.value)} required /></div>
        <div className="field"><label>Category</label><select value={form.categoryId} onChange={(event) => updateField("categoryId", event.target.value)}><option value="">No category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
        <div className="field"><label>Starts</label><input type="datetime-local" value={form.startsAt} onChange={(event) => updateField("startsAt", event.target.value)} required /></div>
        <div className="field"><label>Ends</label><input type="datetime-local" value={form.endsAt} onChange={(event) => updateField("endsAt", event.target.value)} required /></div>
        <div className="field"><label>Location or online link</label><input value={form.location} onChange={(event) => updateField("location", event.target.value)} /></div>
        <div className="field"><label>Status</label><select value={form.status} onChange={(event) => updateField("status", event.target.value)}><option value="draft">Draft</option><option value="published">Published</option><option value="cancelled">Cancelled</option></select></div>
        <div className="field full"><label>Description</label><textarea value={form.description} onChange={(event) => updateField("description", event.target.value)} rows={4} required /></div>
        <div className="field full" style={{ display: "flex", flexDirection: "row", justifyContent: "flex-end", gap: 8 }}><button type="button" className="button button-ghost" onClick={resetForm}>Clear</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? "Saving..." : editingId ? "Save event" : "Create event"}</button></div>
      </form>
      {message && <p className="muted-text" style={{ marginTop: 12 }}>{message}</p>}

      <div className="table-wrap" style={{ marginTop: 28 }}>
        <div className="admin-table">
          <div className="admin-table-head"><span>Event</span><span>When</span><span>Status</span><span>Actions</span></div>
          {loading ? <div className="admin-table-row"><span>Loading events...</span></div> : events.length === 0 ? <div className="admin-table-row"><span>No events yet.</span></div> : events.map((event) => (
            <div className="admin-table-row" key={event.id}>
              <div><strong>{event.title}</strong><small>{event.event_type}</small></div>
              <span>{new Date(event.starts_at).toLocaleString()}</span>
              <span className={`status-badge ${event.status === "published" ? "active" : "inactive"}`}>{event.status}</span>
              <div className="inline-actions"><button type="button" onClick={() => editEvent(event)} aria-label={`Edit ${event.title}`}><Pencil size={13} /></button><button type="button" onClick={() => void setStatus(event.id, event.status === "published" ? "draft" : "published")}>{event.status === "published" ? "Unpublish" : "Publish"}</button><button type="button" className="danger" onClick={() => void archiveEvent(event.id)} aria-label={`Archive ${event.title}`}><Trash2 size={13} /></button></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}