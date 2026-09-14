-- ============================================================================
-- FIX MULTI-USER DATA ISOLATION & PROFILES IN SUPABASE
-- Run this entire script in Supabase Dashboard > SQL Editor > Run
-- ============================================================================

-- 1. Enable extensions
create extension if not exists "citext";
create extension if not exists "pg_trgm";

-- ============================================================================
-- 2. AUTOMATIC USER & PROFILE PROVISIONING TRIGGER (SECURITY DEFINER)
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  default_username text;
  raw_name text;
  raw_avatar text;
  clean_prefix text;
begin
  -- 1. Ensure record in public.users
  insert into public.users (id, email, account_status, created_at, updated_at)
  values (
    new.id,
    coalesce(new.email, new.id::text || '@community.local'),
    'active',
    now(),
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    updated_at = now();

  -- 2. Extract Google OAuth metadata
  raw_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1),
    'Community Member'
  );

  raw_avatar := coalesce(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture',
    null
  );

  clean_prefix := lower(regexp_replace(coalesce(split_part(new.email, '@', 1), 'member'), '[^a-zA-Z0-9_]', '_', 'g'));
  if length(clean_prefix) < 3 then
    clean_prefix := 'user_' || clean_prefix;
  end if;

  default_username := clean_prefix || '_' || substr(replace(new.id::text, '-', ''), 1, 4);

  -- 3. Ensure record in public.profiles
  insert into public.profiles (
    id,
    username,
    display_name,
    avatar_url,
    status,
    created_at,
    updated_at,
    last_active_at
  )
  values (
    new.id,
    default_username,
    raw_name,
    raw_avatar,
    'active',
    now(),
    now(),
    now()
  )
  on conflict (id) do update set
    last_active_at = now(),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);

  -- 4. Default user role: 'member'
  insert into public.user_roles (profile_id, role)
  values (new.id, 'member')
  on conflict do nothing;

  return new;
end;
$$;

-- Bind trigger to auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill any existing auth.users who lack public.users or public.profiles
do $$
declare
  r record;
  raw_name text;
  raw_avatar text;
  clean_prefix text;
  default_username text;
begin
  for r in select * from auth.users loop
    -- Insert into public.users if missing
    insert into public.users (id, email, account_status, created_at, updated_at)
    values (r.id, coalesce(r.email, r.id::text || '@community.local'), 'active', now(), now())
    on conflict (id) do nothing;

    -- Extract metadata
    raw_name := coalesce(
      r.raw_user_meta_data->>'full_name',
      r.raw_user_meta_data->>'name',
      split_part(r.email, '@', 1),
      'Community Member'
    );
    raw_avatar := coalesce(
      r.raw_user_meta_data->>'avatar_url',
      r.raw_user_meta_data->>'picture',
      null
    );
    clean_prefix := lower(regexp_replace(coalesce(split_part(r.email, '@', 1), 'member'), '[^a-zA-Z0-9_]', '_', 'g'));
    if length(clean_prefix) < 3 then
      clean_prefix := 'user_' || clean_prefix;
    end if;
    default_username := clean_prefix || '_' || substr(replace(r.id::text, '-', ''), 1, 4);

    -- Insert into public.profiles if missing
    insert into public.profiles (id, username, display_name, avatar_url, status, created_at, updated_at, last_active_at)
    values (r.id, default_username, raw_name, raw_avatar, 'active', now(), now(), now())
    on conflict (id) do nothing;

    -- Default role
    insert into public.user_roles (profile_id, role)
    values (r.id, 'member')
    on conflict do nothing;
  end loop;
end;
$$;

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Table: public.users
alter table public.users enable row level security;

drop policy if exists "users can read own account" on public.users;
create policy "users can read own account" on public.users
  for select using (auth.uid() = id);

drop policy if exists "users can insert own account" on public.users;
create policy "users can insert own account" on public.users
  for insert with check (auth.uid() = id);

drop policy if exists "users can update own account" on public.users;
create policy "users can update own account" on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Table: public.profiles
alter table public.profiles enable row level security;

drop policy if exists "public profiles are readable" on public.profiles;
create policy "public profiles are readable" on public.profiles
  for select using (status = 'active' or auth.uid() = id);

drop policy if exists "users can insert own profile" on public.profiles;
create policy "users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "users update their profile" on public.profiles;
create policy "users update their profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Table: public.projects
alter table public.projects enable row level security;

drop policy if exists "public projects are readable" on public.projects;
create policy "public projects are readable" on public.projects
  for select using ((visibility = 'public' and deleted_at is null) or (auth.uid() = owner_id));

drop policy if exists "owners create projects" on public.projects;
create policy "owners create projects" on public.projects
  for insert with check (auth.uid() = owner_id);

drop policy if exists "owners update projects" on public.projects;
create policy "owners update projects" on public.projects
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "owners delete projects" on public.projects;
create policy "owners delete projects" on public.projects
  for delete using (auth.uid() = owner_id);

-- Table: public.social_links
alter table public.social_links enable row level security;

drop policy if exists "public social links are readable" on public.social_links;
create policy "public social links are readable" on public.social_links
  for select using (true);

drop policy if exists "users manage their own social links" on public.social_links;
create policy "users manage their own social links" on public.social_links
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- Table: public.notifications
alter table public.notifications enable row level security;

drop policy if exists "users read their notifications" on public.notifications;
create policy "users read their notifications" on public.notifications
  for select using (auth.uid() = profile_id);

drop policy if exists "users update their notifications" on public.notifications;
create policy "users update their notifications" on public.notifications
  for update using (auth.uid() = profile_id);
