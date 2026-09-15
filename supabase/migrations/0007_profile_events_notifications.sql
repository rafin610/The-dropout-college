-- Extend the existing profile, event, and notification systems without replacing data.

alter table public.events
  add column if not exists category_id uuid references public.categories(id) on delete set null,
  add column if not exists event_url text,
  add column if not exists cover_image_url text;

create index if not exists events_status_starts_at_idx on public.events (status, starts_at);
create index if not exists profile_categories_category_id_idx on public.profile_categories (category_id);

-- These tables contain intentionally public profile presentation data. Writes remain owner-only.
drop policy if exists "public profile categories are readable" on public.profile_categories;
create policy "public profile categories are readable" on public.profile_categories
  for select using (true);

drop policy if exists "users manage their profile categories" on public.profile_categories;
create policy "users manage their profile categories" on public.profile_categories
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

drop policy if exists "public profile skills are readable" on public.profile_skills;
create policy "public profile skills are readable" on public.profile_skills
  for select using (true);

drop policy if exists "users manage their profile skills" on public.profile_skills;
create policy "users manage their profile skills" on public.profile_skills
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

drop policy if exists "public community roles are readable" on public.user_roles;
create policy "public community roles are readable" on public.user_roles
  for select using (true);

create or replace function public.has_event_management_permission(actor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where profile_id = actor_id
      and role in ('admin', 'super_admin', 'event_organizer')
  )
  or exists (
    select 1
    from public.user_admin_roles uar
    join public.admin_roles ar on ar.id = uar.role_id
    join public.admin_role_permissions arp on arp.role_id = ar.id
    join public.permissions p on p.id = arp.permission_id
    where uar.user_id = actor_id
      and p.key = 'events.manage'
  );
$$;

drop policy if exists "published events are readable" on public.events;
create policy "published events are readable" on public.events
  for select using (status = 'published' or auth.uid() = created_by or public.has_event_management_permission(auth.uid()));

drop policy if exists "event managers create events" on public.events;
create policy "event managers create events" on public.events
  for insert with check (auth.uid() = created_by and public.has_event_management_permission(auth.uid()));

drop policy if exists "event managers update events" on public.events;
create policy "event managers update events" on public.events
  for update using (public.has_event_management_permission(auth.uid()))
  with check (public.has_event_management_permission(auth.uid()));

drop policy if exists "event managers delete events" on public.events;
create policy "event managers delete events" on public.events
  for delete using (public.has_event_management_permission(auth.uid()));

create or replace function public.notify_members_of_published_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    insert into public.notifications (profile_id, type, title, body, resource_type, resource_id)
    select p.id,
      'event_published',
      'New community event',
      'The DropOut College announced a new event: ' || new.title,
      'event',
      new.id
    from public.profiles p
    where p.status = 'active'
      and p.id <> new.created_by;
  end if;
  return new;
end;
$$;

drop trigger if exists on_event_published on public.events;
create trigger on_event_published
  after insert or update of status on public.events
  for each row execute function public.notify_members_of_published_event();