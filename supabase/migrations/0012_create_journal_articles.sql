-- Migration 0012: The DropOut Journal Articles Schema
-- Creates public.articles table, RLS policies, indexes, and migrates existing project data.

create extension if not exists "citext";
create extension if not exists "pg_trgm";

-- 1. Create articles table
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug citext unique not null,
  excerpt text,
  cover_image_url text,
  content jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  author_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  tags text[] not null default '{}'::text[],
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  reading_time_minutes integer not null default 1,
  featured boolean not null default false,
  published_at timestamptz,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- 2. Indexes for search and fast lookups
create index if not exists articles_slug_idx on public.articles (slug);
create index if not exists articles_status_idx on public.articles (status, published_at desc) where deleted_at is null;
create index if not exists articles_author_idx on public.articles (author_id);
create index if not exists articles_category_idx on public.articles (category_id);
create index if not exists articles_search_idx on public.articles using gin (to_tsvector('english', title || ' ' || coalesce(excerpt, '')));

-- 3. Enable Row Level Security
alter table public.articles enable row level security;

-- 4. RLS Policies
-- A. Anyone can read published articles that are not deleted
drop policy if exists "public articles are readable" on public.articles;
create policy "public articles are readable"
  on public.articles for select
  using (status = 'published' and deleted_at is null);

-- B. Authors can read their own drafts
drop policy if exists "authors can read own articles" on public.articles;
create policy "authors can read own articles"
  on public.articles for select
  using (auth.uid() = author_id and deleted_at is null);

-- C. Staff (admins and moderators) can read all articles including drafts
drop policy if exists "staff can read all articles" on public.articles;
create policy "staff can read all articles"
  on public.articles for select
  using (
    deleted_at is null
    and exists (
      select 1 from public.user_roles
      where profile_id = auth.uid()
      and role in ('admin', 'super_admin', 'moderator')
    )
  );

-- D. Staff can insert articles
drop policy if exists "staff can insert articles" on public.articles;
create policy "staff can insert articles"
  on public.articles for insert
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.user_roles
      where profile_id = auth.uid()
      and role in ('admin', 'super_admin', 'moderator')
    )
  );

-- E. Admins can update any article
drop policy if exists "admins can update articles" on public.articles;
create policy "admins can update articles"
  on public.articles for update
  using (
    exists (
      select 1 from public.user_roles
      where profile_id = auth.uid()
      and role in ('admin', 'super_admin')
    )
  )
  with check (
    exists (
      select 1 from public.user_roles
      where profile_id = auth.uid()
      and role in ('admin', 'super_admin')
    )
  );

-- F. Moderators can update their own articles
drop policy if exists "moderators can update own articles" on public.articles;
create policy "moderators can update own articles"
  on public.articles for update
  using (
    auth.uid() = author_id
    and exists (
      select 1 from public.user_roles
      where profile_id = auth.uid()
      and role = 'moderator'
    )
  )
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.user_roles
      where profile_id = auth.uid()
      and role = 'moderator'
    )
  );

-- G. Admins can delete any article
drop policy if exists "admins can delete articles" on public.articles;
create policy "admins can delete articles"
  on public.articles for delete
  using (
    exists (
      select 1 from public.user_roles
      where profile_id = auth.uid()
      and role in ('admin', 'super_admin')
    )
  );

-- H. Moderators can delete their own drafts
drop policy if exists "moderators can delete own drafts" on public.articles;
create policy "moderators can delete own drafts"
  on public.articles for delete
  using (
    auth.uid() = author_id
    and status = 'draft'
    and exists (
      select 1 from public.user_roles
      where profile_id = auth.uid()
      and role = 'moderator'
    )
  );

-- 5. Safe backward-compatible migration of existing projects to articles
insert into public.articles (
  id,
  title,
  slug,
  excerpt,
  cover_image_url,
  content,
  author_id,
  category_id,
  tags,
  status,
  reading_time_minutes,
  featured,
  published_at,
  created_at,
  updated_at,
  deleted_at
)
select
  p.id,
  p.name as title,
  p.slug,
  substring(p.description from 1 for 280) as excerpt,
  p.cover_image_url,
  jsonb_build_object(
    'type', 'doc',
    'content', jsonb_build_array(
      jsonb_build_object(
        'type', 'paragraph',
        'content', jsonb_build_array(
          jsonb_build_object('type', 'text', 'text', p.description)
        )
      )
    )
  ) as content,
  p.owner_id as author_id,
  p.category_id,
  array['Community', 'Editorial'] as tags,
  'published' as status,
  greatest(1, ceil(array_length(regexp_split_to_array(p.description, '\s+'), 1) / 200.0)::int) as reading_time_minutes,
  (case when p.slug = 'how-to-become-a-philomath' then true else false end) as featured,
  p.created_at as published_at,
  p.created_at,
  p.updated_at,
  p.deleted_at
from public.projects p
where p.deleted_at is null
on conflict (slug) do nothing;
