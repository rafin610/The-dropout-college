-- Minimal Supabase-compatible bootstrap for the local RLS test harness.
-- This is NOT a production migration and must never be applied to a real
-- Supabase project. It provides the auth/storage schemas and roles that the
-- repository migrations assume exist.

\set ON_ERROR_STOP on

create extension if not exists "pgcrypto";
create extension if not exists "citext";
create extension if not exists "pg_trgm";

-- Supabase API roles. service_role bypasses RLS, exactly like Supabase.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end $$;

grant usage on schema public to anon, authenticated, service_role;

-- Supabase grants broad table privileges by default and relies on RLS.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

create schema if not exists auth;
create schema if not exists storage;

grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema storage to anon, authenticated, service_role;

create table if not exists auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Mirrors Supabase's auth.uid(): the JWT subject, or null for anon/service.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select case
    when nullif(current_setting('request.jwt.claim.sub', true), '') is not null
      then current_setting('request.jwt.claim.sub', true)::uuid
    when nullif(current_setting('request.jwt.claims', true), '') is not null
      then nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid
    else null
  end;
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select case
    when nullif(current_setting('request.jwt.claim.role', true), '') is not null
      then current_setting('request.jwt.claim.role', true)
    when nullif(current_setting('request.jwt.claims', true), '') is not null
      then current_setting('request.jwt.claims', true)::jsonb ->> 'role'
    else null
  end;
$$;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text,
  owner uuid,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_accessed_at timestamptz not null default now()
);

grant all on storage.buckets to anon, authenticated, service_role;
grant all on storage.objects to anon, authenticated, service_role;

-- Returns every path segment except the file name, like Supabase storage.
create or replace function storage.foldername(name text)
returns text[]
language sql
immutable
as $$
  select case
    when position('/' in name) = 0 then array[]::text[]
    else (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
  end;
$$;

-- 0011 adds the social tables to this publication when it exists.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;
