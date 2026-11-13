-- Migration 0016: The Campus social layer
--
-- Adds posts, Love reactions, comments, journal permission fixes, public role
-- reads, and isolated storage buckets. All changes are additive and
-- idempotent. Existing articles, profiles, roles, and media are preserved.
--
-- Legacy project/event/CMS tables are intentionally left in place. They are no
-- longer used by the application and can be archived after a verified backup.

create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. Role helpers
-- ============================================================================

create or replace function public.has_role(actor_id uuid, role_name text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_active_account(actor_id)
    and exists (
      select 1
      from public.user_roles
      where profile_id = actor_id
        and role = role_name
    );
$$;

create or replace function public.is_admin(actor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.has_role(actor_id, 'admin')
      or public.has_role(actor_id, 'super_admin');
$$;

create or replace function public.is_journal_staff(actor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_admin(actor_id)
      or public.has_role(actor_id, 'moderator');
$$;

-- Role badges are public information inside the community. This also makes
-- profile/author joins useful without exposing account or email data.
drop policy if exists "public can read member roles" on public.user_roles;
create policy "public can read member roles"
  on public.user_roles for select
  to anon, authenticated
  using (true);

-- ============================================================================
-- 2. Posts
-- ============================================================================

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint posts_content_length check (
    char_length(btrim(content)) between 1 and 300
  ),
  constraint posts_image_url_length check (
    image_url is null or char_length(image_url) <= 2000
  )
);

create index if not exists posts_created_at_idx
  on public.posts (created_at desc)
  where deleted_at is null;
create index if not exists posts_author_created_idx
  on public.posts (author_id, created_at desc)
  where deleted_at is null;

alter table public.posts enable row level security;

drop policy if exists "posts are publicly readable" on public.posts;
create policy "posts are publicly readable"
  on public.posts for select
  to anon, authenticated
  using (deleted_at is null);

drop policy if exists "members can create their own posts" on public.posts;
create policy "members can create their own posts"
  on public.posts for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and public.is_active_account(auth.uid())
    and char_length(btrim(content)) between 1 and 300
  );

drop policy if exists "authors can edit their own posts" on public.posts;
create policy "authors can edit their own posts"
  on public.posts for update
  to authenticated
  using (auth.uid() = author_id and deleted_at is null)
  with check (
    auth.uid() = author_id
    and deleted_at is null
    and char_length(btrim(content)) between 1 and 300
  );

drop policy if exists "authors and staff can delete posts" on public.posts;
create policy "authors and staff can delete posts"
  on public.posts for delete
  to authenticated
  using (auth.uid() = author_id or public.is_journal_staff(auth.uid()));

-- The app hides posts by setting deleted_at (soft delete), which is an UPDATE.
-- Keep a dedicated policy so authors and staff can hide live posts without
-- loosening the normal edit policy above.
drop policy if exists "authors and staff can hide posts" on public.posts;
create policy "authors and staff can hide posts"
  on public.posts for update
  to authenticated
  using (
    deleted_at is null
    and (auth.uid() = author_id or public.is_journal_staff(auth.uid()))
  )
  with check (
    deleted_at is not null
    and (auth.uid() = author_id or public.is_journal_staff(auth.uid()))
  );

-- PostgreSQL re-checks the new row against SELECT policies for updates that
-- touch a column used by those policies. Let authors and staff read their own
-- hidden rows so the soft-delete UPDATE can complete. App queries always add
-- `deleted_at is null`, so hidden posts never appear in the public feed.
drop policy if exists "authors and staff can see hidden posts" on public.posts;
create policy "authors and staff can see hidden posts"
  on public.posts for select
  to authenticated
  using (
    deleted_at is not null
    and (auth.uid() = author_id or public.is_journal_staff(auth.uid()))
  );

-- ============================================================================
-- 3. Love reactions (one row per member per post)
-- ============================================================================

create table if not exists public.post_loves (
  post_id uuid not null references public.posts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);

create index if not exists post_loves_profile_idx
  on public.post_loves (profile_id);

alter table public.post_loves enable row level security;

drop policy if exists "loves are publicly readable" on public.post_loves;
create policy "loves are publicly readable"
  on public.post_loves for select
  to anon, authenticated
  using (true);

drop policy if exists "members can love a post" on public.post_loves;
create policy "members can love a post"
  on public.post_loves for insert
  to authenticated
  with check (
    auth.uid() = profile_id
    and public.is_active_account(auth.uid())
    and exists (
      select 1 from public.posts
      where posts.id = post_id
        and posts.deleted_at is null
    )
  );

drop policy if exists "members can remove their love" on public.post_loves;
create policy "members can remove their love"
  on public.post_loves for delete
  to authenticated
  using (auth.uid() = profile_id);

-- ============================================================================
-- 4. Comments (flat, authenticated, editable by the author)
-- ============================================================================

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint post_comments_content_length check (
    char_length(btrim(content)) between 1 and 1000
  )
);

create index if not exists post_comments_post_created_idx
  on public.post_comments (post_id, created_at asc);
create index if not exists post_comments_author_idx
  on public.post_comments (author_id);

alter table public.post_comments enable row level security;

drop policy if exists "comments are publicly readable" on public.post_comments;
create policy "comments are publicly readable"
  on public.post_comments for select
  to anon, authenticated
  using (true);

drop policy if exists "members can comment on live posts" on public.post_comments;
create policy "members can comment on live posts"
  on public.post_comments for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and public.is_active_account(auth.uid())
    and char_length(btrim(content)) between 1 and 1000
    and exists (
      select 1 from public.posts
      where posts.id = post_id
        and posts.deleted_at is null
    )
  );

drop policy if exists "authors can edit their own comments" on public.post_comments;
create policy "authors can edit their own comments"
  on public.post_comments for update
  to authenticated
  using (auth.uid() = author_id)
  with check (
    auth.uid() = author_id
    and char_length(btrim(content)) between 1 and 1000
  );

drop policy if exists "authors and staff can delete comments" on public.post_comments;
create policy "authors and staff can delete comments"
  on public.post_comments for delete
  to authenticated
  using (auth.uid() = author_id or public.is_journal_staff(auth.uid()));

-- ============================================================================
-- 5. Journal permissions
--    Admins manage every article. Moderators manage their own articles.
-- ============================================================================

drop policy if exists "public articles are readable" on public.articles;
create policy "public articles are readable"
  on public.articles for select
  to anon, authenticated
  using (status = 'published' and deleted_at is null);

drop policy if exists "authors can read own articles" on public.articles;
create policy "authors can read own articles"
  on public.articles for select
  to authenticated
  using (auth.uid() = author_id and deleted_at is null);

drop policy if exists "staff can read all articles" on public.articles;
create policy "staff can read all articles"
  on public.articles for select
  to authenticated
  using (deleted_at is null and public.is_journal_staff(auth.uid()));

-- The soft-delete UPDATE needs the new row to pass SELECT policies. These
-- hidden rows stay out of every app query, which filters deleted_at itself.
drop policy if exists "authors and staff can see deleted articles" on public.articles;
create policy "authors and staff can see deleted articles"
  on public.articles for select
  to authenticated
  using (
    deleted_at is not null
    and (auth.uid() = author_id or public.is_journal_staff(auth.uid()))
  );

drop policy if exists "staff can insert articles" on public.articles;
create policy "staff can insert articles"
  on public.articles for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and public.is_journal_staff(auth.uid())
  );

drop policy if exists "admins can update articles" on public.articles;
create policy "admins can update articles"
  on public.articles for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "moderators can update own articles" on public.articles;
create policy "moderators can update own articles"
  on public.articles for update
  to authenticated
  using (
    auth.uid() = author_id
    and public.has_role(auth.uid(), 'moderator')
  )
  with check (
    auth.uid() = author_id
    and public.has_role(auth.uid(), 'moderator')
  );

drop policy if exists "admins can delete articles" on public.articles;
create policy "admins can delete articles"
  on public.articles for delete
  to authenticated
  using (public.is_admin(auth.uid()));

drop policy if exists "moderators can delete own drafts" on public.articles;
drop policy if exists "moderators can delete own articles" on public.articles;
create policy "moderators can delete own articles"
  on public.articles for delete
  to authenticated
  using (
    auth.uid() = author_id
    and public.has_role(auth.uid(), 'moderator')
  );

-- ============================================================================
-- 6. Storage buckets and folder-scoped policies
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('post-media', 'post-media', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif']),
  ('journal-media', 'journal-media', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif']),
  ('profile-media', 'profile-media', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public campus media is readable" on storage.objects;
create policy "public campus media is readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id in ('post-media', 'journal-media', 'profile-media'));

drop policy if exists "members can upload post media" on storage.objects;
create policy "members can upload post media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'post-media'
    and public.is_active_account(auth.uid())
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "members can update their post media" on storage.objects;
create policy "members can update their post media"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "members can delete their post media" on storage.objects;
create policy "members can delete their post media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "staff can upload journal media" on storage.objects;
create policy "staff can upload journal media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'journal-media'
    and public.is_journal_staff(auth.uid())
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "staff can update their journal media" on storage.objects;
create policy "staff can update their journal media"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'journal-media'
    and public.is_journal_staff(auth.uid())
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'journal-media'
    and public.is_journal_staff(auth.uid())
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "staff can delete their journal media" on storage.objects;
create policy "staff can delete their journal media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'journal-media'
    and public.is_journal_staff(auth.uid())
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "members can upload profile media" on storage.objects;
create policy "members can upload profile media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'profile-media'
    and public.is_active_account(auth.uid())
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "members can update their profile media" on storage.objects;
create policy "members can update their profile media"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'profile-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'profile-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "members can delete their profile media" on storage.objects;
create policy "members can delete their profile media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'profile-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- 7. Minimal role management without a service-role key
--    Only active admins may call this. Admins cannot edit themselves, other
--    administrators, or assign the admin role through the app. This keeps the
--    app usable when SUPABASE_SERVICE_ROLE_KEY is intentionally absent.
-- ============================================================================

create or replace function public.set_member_role(
  p_user_id uuid,
  p_role text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  target_roles text[];
begin
  if actor_id is null or not public.is_admin(actor_id) then
    raise exception 'Only an administrator can change member roles.'
      using errcode = '42501';
  end if;

  if p_user_id = actor_id then
    raise exception 'You cannot change your own role.'
      using errcode = '42501';
  end if;

  if p_role not in ('member', 'moderator') then
    raise exception 'Only member and moderator roles can be assigned here.'
      using errcode = '22023';
  end if;

  select coalesce(array_agg(role), '{}'::text[])
    into target_roles
    from public.user_roles
    where profile_id = p_user_id;

  if not found or cardinality(target_roles) = 0 then
    raise exception 'Member not found.'
      using errcode = 'P0002';
  end if;

  if 'admin' = any(target_roles) or 'super_admin' = any(target_roles) then
    raise exception 'Administrator roles must be changed directly in the database.'
      using errcode = '42501';
  end if;

  delete from public.user_roles where profile_id = p_user_id;
  insert into public.user_roles (profile_id, role)
    values (p_user_id, p_role);

  insert into public.audit_logs (
    actor_id, action, resource_type, resource_id, before_data, after_data
  )
  values (
    actor_id,
    'member.role',
    'user',
    p_user_id,
    jsonb_build_object('roles', to_jsonb(target_roles)),
    jsonb_build_object('roles', jsonb_build_array(p_role))
  );

  return p_role;
end;
$$;

revoke all on function public.set_member_role(uuid, text) from public;
revoke all on function public.set_member_role(uuid, text) from anon;
grant execute on function public.set_member_role(uuid, text) to authenticated;

-- ============================================================================
-- 8. Realtime (optional, safe to ignore if the publication is absent)
-- ============================================================================

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.posts;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.post_loves;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.post_comments;
    exception when duplicate_object then null;
    end;
  end if;
end;
$$;
