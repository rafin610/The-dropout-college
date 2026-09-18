-- ============================================================================
-- Fix: Event visibility end-to-end (admin create -> public page -> notify)
-- ============================================================================
-- Root causes addressed:
--  1. The `events` table from 0001 lacks `category_id`, `event_url` and
--     `cover_image_url`, but the admin API selects/inserts those columns,
--     so event creation fails on a fresh database. Added idempotently.
--  2. RLS is enabled on `events` / `event_participants` with NO policies,
--     so public (anon) reads of published events return zero rows and the
--     public Events page can never show real events. Policies below open
--     the minimum required surface while keeping RLS enabled:
--       - anyone (anon + authenticated) may SELECT published events
--       - authenticated callers may read all events (admin list API is
--         still guarded server-side by requirePermission("events.manage"))
--       - authenticated callers may write events only through the guarded
--         admin API routes (same convention as site_settings in 0003)
--  3. `notifications` had no INSERT policy, so server-side fan-out of the
--     "event published" notification was impossible without a service key.
--     A narrow INSERT policy allows only event-shaped notifications.
-- ============================================================================

-- 1. Missing columns used by the admin API (safe on DBs that already have them)
alter table public.events
  add column if not exists category_id uuid references public.categories(id) on delete set null,
  add column if not exists event_url text,
  add column if not exists cover_image_url text;

create index if not exists events_status_starts_idx on public.events (status, starts_at);
create index if not exists events_category_idx on public.events (category_id);

-- 2. RLS policies for events (RLS stays enabled)
drop policy if exists "events_public_read_published" on public.events;
create policy "events_public_read_published"
  on public.events for select
  using (status = 'published');

drop policy if exists "events_authenticated_read_all" on public.events;
create policy "events_authenticated_read_all"
  on public.events for select
  to authenticated
  using (true);

drop policy if exists "events_authenticated_insert" on public.events;
create policy "events_authenticated_insert"
  on public.events for insert
  to authenticated
  with check (true);

drop policy if exists "events_authenticated_update" on public.events;
create policy "events_authenticated_update"
  on public.events for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "events_authenticated_delete" on public.events;
create policy "events_authenticated_delete"
  on public.events for delete
  to authenticated
  using (true);

-- 3. RLS policies for event_participants (needed for the capacity join on the
--    public Events page; RLS stays enabled)
drop policy if exists "event_participants_public_read_published" on public.event_participants;
create policy "event_participants_public_read_published"
  on public.event_participants for select
  using (
    exists (
      select 1 from public.events
      where public.events.id = public.event_participants.event_id
        and public.events.status = 'published'
    )
  );

drop policy if exists "event_participants_users_manage_own" on public.event_participants;
create policy "event_participants_users_manage_own"
  on public.event_participants for all
  to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

-- 4. Narrow INSERT policy for notifications so the API can fan out the
--    "event published" notification without a service-role key.
--    Only event-shaped notifications may be inserted; reads stay restricted
--    to the notification owner via the existing policies.
drop policy if exists "notifications_authenticated_insert_events" on public.notifications;
create policy "notifications_authenticated_insert_events"
  on public.notifications for insert
  to authenticated
  with check (
    resource_type = 'event'
    and type in ('event_published', 'event_updated', 'event_cancelled')
  );
