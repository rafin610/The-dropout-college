-- 0010: Social project features — additive fixes, idempotent.
-- Does NOT delete data. Reuses tables from 0009 where present.
-- Adds demo/github URL columns, fixes follows readability, hardens RLS + storage.

-- 1. Projects: optional demo + github URLs (spec 4)
alter table public.projects
  add column if not exists demo_url text,
  add column if not exists github_url text,
  add column if not exists upvote_count integer not null default 0,
  add column if not exists comment_count integer not null default 0;

-- 2. Ensure social tables exist (reuse 0009 if already applied)
create table if not exists public.project_upvotes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create table if not exists public.project_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (length(trim(content)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, following_id),
  check (follower_id <> following_id)
);

-- 3. Notifications: ensure social columns exist
alter table public.notifications
  add column if not exists actor_id uuid references public.profiles(id) on delete cascade,
  add column if not exists project_id uuid references public.projects(id) on delete cascade,
  add column if not exists comment_id uuid references public.project_comments(id) on delete cascade,
  add column if not exists read_at timestamptz;

-- 4. Indexes
create index if not exists project_upvotes_project_idx on public.project_upvotes (project_id, created_at desc);
create index if not exists project_upvotes_user_idx on public.project_upvotes (user_id, created_at desc);
create index if not exists project_comments_project_idx on public.project_comments (project_id, created_at desc);
create index if not exists follows_following_idx on public.follows (following_id, created_at desc);
create index if not exists follows_follower_idx on public.follows (follower_id, created_at desc);
create index if not exists notifications_profile_created_idx2 on public.notifications (profile_id, created_at desc);
create index if not exists notifications_actor_idx on public.notifications (actor_id, created_at desc);

-- 5. RLS enable
alter table public.project_upvotes enable row level security;
alter table public.project_comments enable row level security;
alter table public.follows enable row level security;

-- 6. RLS: drop + recreate idempotently so re-runs never fail
drop policy if exists "project upvotes are readable to everyone for visible projects" on public.project_upvotes;
create policy "project upvotes are readable to everyone for visible projects"
  on public.project_upvotes for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_upvotes.project_id
        and p.visibility = 'public'
        and p.deleted_at is null
    )
    or auth.uid() = user_id
    or exists (
      select 1 from public.user_roles ur
      where ur.profile_id = auth.uid() and ur.role in ('admin', 'super_admin')
    )
  );

drop policy if exists "users manage their own upvotes" on public.project_upvotes;
create policy "users manage their own upvotes"
  on public.project_upvotes for insert with check (auth.uid() = user_id);

drop policy if exists "users delete their own upvotes" on public.project_upvotes;
create policy "users delete their own upvotes"
  on public.project_upvotes for delete using (auth.uid() = user_id);

drop policy if exists "project comments are readable when project is public" on public.project_comments;
create policy "project comments are readable when project is public"
  on public.project_comments for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_comments.project_id
        and p.visibility = 'public'
        and p.deleted_at is null
    )
    or auth.uid() = user_id
    or exists (
      select 1 from public.user_roles ur
      where ur.profile_id = auth.uid() and ur.role in ('admin', 'super_admin')
    )
  );

drop policy if exists "users create their own comments" on public.project_comments;
create policy "users create their own comments"
  on public.project_comments for insert with check (auth.uid() = user_id);

drop policy if exists "users update their own comments" on public.project_comments;
create policy "users update their own comments"
  on public.project_comments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users delete their own comments" on public.project_comments;
create policy "users delete their own comments"
  on public.project_comments for delete using (auth.uid() = user_id);

drop policy if exists "admins moderate comments" on public.project_comments;
create policy "admins moderate comments"
  on public.project_comments for delete using (
    exists (
      select 1 from public.user_roles ur
      where ur.profile_id = auth.uid() and ur.role in ('admin', 'super_admin')
    )
  );

-- Follows must be publicly readable so profiles can show Follower/Following
-- counts + lists without leaking emails (profiles table exposes no email).
drop policy if exists "follows are readable to relevant users" on public.follows;
drop policy if exists "follows are publicly readable" on public.follows;
create policy "follows are publicly readable"
  on public.follows for select using (true);

drop policy if exists "users can follow other users" on public.follows;
create policy "users can follow other users"
  on public.follows for insert
  with check (
    auth.uid() = follower_id
    and follower_id <> following_id
  );

drop policy if exists "users can unfollow users" on public.follows;
create policy "users can unfollow users"
  on public.follows for delete using (auth.uid() = follower_id);

-- Notifications: owner-only read/update (service role inserts via API)
drop policy if exists "users read their notifications" on public.notifications;
create policy "users read their notifications"
  on public.notifications for select using (auth.uid() = profile_id);

drop policy if exists "users update their notifications" on public.notifications;
create policy "users update their notifications"
  on public.notifications for update using (auth.uid() = profile_id);

drop policy if exists "notifications can insert via service role only" on public.notifications;
create policy "notifications can insert via service role only"
  on public.notifications for insert with check (false);

-- 7. Storage bucket for project covers (idempotent)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-covers', 'project-covers', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif'];

drop policy if exists "authenticated users can upload project covers" on storage.objects;
create policy "authenticated users can upload project covers"
  on storage.objects for insert
  with check (
    bucket_id = 'project-covers'
    and auth.role() = 'authenticated'
  );

drop policy if exists "project covers are publicly readable" on storage.objects;
create policy "project covers are publicly readable"
  on storage.objects for select
  using (bucket_id = 'project-covers');

drop policy if exists "users can update their project covers" on storage.objects;
create policy "users can update their project covers"
  on storage.objects for update using (
    bucket_id = 'project-covers'
    and auth.role() = 'authenticated'
  );

drop policy if exists "users can delete their project covers" on storage.objects;
create policy "users can delete their project covers"
  on storage.objects for delete using (
    bucket_id = 'project-covers'
    and auth.role() = 'authenticated'
  );

-- 8. Keep denormalized counts in sync (best-effort; API also updates UI optimistically)
create or replace function public.sync_project_upvote_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.projects set upvote_count = upvote_count + 1 where id = new.project_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.projects set upvote_count = greatest(upvote_count - 1, 0) where id = old.project_id;
    return old;
  end if;
  return null;
end; $$;

drop trigger if exists trg_sync_project_upvote_count on public.project_upvotes;
create trigger trg_sync_project_upvote_count
  after insert or delete on public.project_upvotes
  for each row execute function public.sync_project_upvote_count();

create or replace function public.sync_project_comment_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.projects set comment_count = comment_count + 1 where id = new.project_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.projects set comment_count = greatest(comment_count - 1, 0) where id = old.project_id;
    return old;
  end if;
  return null;
end; $$;

drop trigger if exists trg_sync_project_comment_count on public.project_comments;
create trigger trg_sync_project_comment_count
  after insert or delete on public.project_comments
  for each row execute function public.sync_project_comment_count();

-- 9. Backfill counts from existing rows (safe, no data loss)
update public.projects p
set upvote_count = coalesce((select count(*) from public.project_upvotes u where u.project_id = p.id), 0),
    comment_count = coalesce((select count(*) from public.project_comments c where c.project_id = p.id), 0);
