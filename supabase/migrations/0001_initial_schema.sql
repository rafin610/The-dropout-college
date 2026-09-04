create extension if not exists "citext";
create extension if not exists "pg_trgm";

create type public.member_status as enum ('active', 'suspended', 'deleted');
create type public.skill_level as enum ('beginner', 'intermediate', 'advanced', 'expert');
create type public.project_status as enum ('idea', 'recruiting', 'in_progress', 'launched', 'archived');
create type public.visibility as enum ('public', 'members', 'private');
create type public.team_role as enum ('owner', 'admin', 'member');
create type public.event_status as enum ('draft', 'published', 'cancelled', 'completed');

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext unique not null,
  account_status public.member_status not null default 'active',
  onboarding_completed boolean not null default false,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.profiles (
  id uuid primary key references public.users(id) on delete cascade,
  username citext unique not null,
  display_name text not null,
  avatar_url text,
  bio text,
  status public.member_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_active_at timestamptz
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text unique not null,
  description text,
  icon text,
  color text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  slug text unique not null,
  name text unique not null,
  created_at timestamptz not null default now()
);

create table public.profile_categories (
  profile_id uuid references public.profiles(id) on delete cascade,
  category_id uuid references public.categories(id) on delete cascade,
  primary key (profile_id, category_id)
);

create table public.profile_skills (
  profile_id uuid references public.profiles(id) on delete cascade,
  skill_id uuid references public.skills(id) on delete cascade,
  level public.skill_level not null default 'beginner',
  years_experience numeric(4, 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (profile_id, skill_id)
);

create table public.user_skills (
  user_id uuid references public.users(id) on delete cascade,
  skill_id uuid references public.skills(id) on delete cascade,
  level public.skill_level not null default 'beginner',
  years_experience numeric(4, 1),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, skill_id)
);

create table public.social_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  platform text not null,
  url text not null,
  unique (profile_id, platform)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text unique not null,
  description text not null,
  cover_image_url text,
  status public.project_status not null default 'idea',
  visibility public.visibility not null default 'public',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.project_members (
  project_id uuid references public.projects(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  role text not null default 'contributor',
  joined_at timestamptz not null default now(),
  primary key (project_id, profile_id)
);

create table public.project_technologies (
  project_id uuid references public.projects(id) on delete cascade,
  technology text not null,
  primary key (project_id, technology)
);

create table public.project_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  label text not null,
  url text not null
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  name text not null,
  slug text unique not null,
  description text,
  avatar_url text,
  visibility public.visibility not null default 'public',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.team_members (
  team_id uuid references public.teams(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  role public.team_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (team_id, profile_id)
);

create table public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  invited_profile_id uuid references public.profiles(id) on delete cascade,
  invited_by uuid references public.profiles(id),
  status text not null default 'pending',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id),
  title text not null,
  slug text unique not null,
  description text not null,
  event_type text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer,
  location text,
  discord_channel_id text,
  status public.event_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.event_participants (
  event_id uuid references public.events(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  status text not null default 'registered',
  registered_at timestamptz not null default now(),
  primary key (event_id, profile_id)
);

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text unique not null,
  description text not null,
  icon text,
  criteria_type text not null,
  is_active boolean not null default true
);

create table public.profile_badges (
  profile_id uuid references public.profiles(id) on delete cascade,
  badge_id uuid references public.badges(id) on delete cascade,
  awarded_by uuid references public.profiles(id),
  awarded_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  primary key (profile_id, badge_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  resource_type text,
  resource_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.user_roles (
  profile_id uuid references public.profiles(id) on delete cascade,
  role text not null check (role in ('member', 'mentor', 'event_organizer', 'moderator', 'admin', 'super_admin')),
  primary key (profile_id, role)
);

create table public.discord_connections (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  discord_user_id text unique not null,
  discord_username text not null,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  last_verified_at timestamptz,
  connected_at timestamptz not null default now()
);

create index projects_search_idx on public.projects using gin (to_tsvector('english', name || ' ' || description));
create index profiles_username_trgm_idx on public.profiles using gin (username gin_trgm_ops);
create index notifications_profile_created_idx on public.notifications (profile_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.skills enable row level security;
alter table public.profile_categories enable row level security;
alter table public.profile_skills enable row level security;
alter table public.user_skills enable row level security;
alter table public.social_links enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.events enable row level security;
alter table public.event_participants enable row level security;
alter table public.notifications enable row level security;

create policy "public profiles are readable" on public.profiles for select using (status = 'active');
create policy "active categories are readable" on public.categories for select using (is_active = true);
create policy "active skills are readable" on public.skills for select using (is_active = true);
create policy "users update their profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "users manage their skills" on public.user_skills for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users read their notifications" on public.notifications for select using (auth.uid() = profile_id);
create policy "users update their notifications" on public.notifications for update using (auth.uid() = profile_id);
create policy "public projects are readable" on public.projects for select using (visibility = 'public' and deleted_at is null);
create policy "owners create projects" on public.projects for insert with check (auth.uid() = owner_id);
create policy "owners update projects" on public.projects for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "owners delete projects" on public.projects for delete using (auth.uid() = owner_id);