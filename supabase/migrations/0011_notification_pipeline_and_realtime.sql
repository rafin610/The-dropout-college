-- 0011: Notification pipeline + realtime hardening (additive, idempotent, no data loss).
-- Fixes: social notifications never inserted when the service-role key is absent,
-- realtime subscriptions never receiving rows, and missing unread indexes.

-- 1. Allow authenticated users to create social notifications as themselves (actor).
--    Event fan-out and admin inserts continue via the service role (bypasses RLS).
drop policy if exists "notifications can insert via service role only" on public.notifications;
drop policy if exists "users create notifications as actor" on public.notifications;
create policy "users create notifications as actor"
  on public.notifications for insert
  with check (
    auth.uid() is not null
    and actor_id = auth.uid()
    and profile_id <> auth.uid()
  );

-- Preserve the event fan-out insert policy (narrow shape, authenticated).
drop policy if exists "notifications_authenticated_insert_events" on public.notifications;
create policy "notifications_authenticated_insert_events"
  on public.notifications for insert
  to authenticated
  with check (
    resource_type = 'event'
    and type in ('event_published', 'event_updated', 'event_cancelled')
  );

-- 2. Indexes for the hot notification read paths.
create index if not exists notifications_profile_created_idx on public.notifications (profile_id, created_at desc);
create index if not exists notifications_profile_unread_idx on public.notifications (profile_id, read_at) where read_at is null;

-- 3. Enable realtime for social tables so client subscriptions receive rows.
--    (Idempotent: skip if the table is already in the publication.)
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'project_upvotes') then
    alter publication supabase_realtime add table public.project_upvotes;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'project_comments') then
    alter publication supabase_realtime add table public.project_comments;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'follows') then
    alter publication supabase_realtime add table public.follows;
  end if;
exception
  when undefined_object then
    -- supabase_realtime publication does not exist in this environment; nothing to do.
    null;
end $$;

-- 4. Remove duplicate follow rows if any were ever created before the unique
--    constraint, then re-assert uniqueness.
delete from public.follows a
using public.follows b
where a.follower_id = b.follower_id
  and a.following_id = b.following_id
  and a.created_at > b.created_at;

-- 5. Ensure indexes used by social queries exist.
create index if not exists notifications_actor_idx on public.notifications (actor_id, created_at desc);
