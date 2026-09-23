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

alter table public.notifications
  add column if not exists actor_id uuid references public.profiles(id),
  add column if not exists project_id uuid references public.projects(id),
  add column if not exists comment_id uuid references public.project_comments(id),
  add column if not exists read_at timestamptz;

create index if not exists project_upvotes_project_idx on public.project_upvotes (project_id, created_at desc);
create index if not exists project_comments_project_idx on public.project_comments (project_id, created_at desc);
create index if not exists follows_following_idx on public.follows (following_id, created_at desc);
create index if not exists follows_follower_idx on public.follows (follower_id, created_at desc);
create index if not exists notifications_actor_idx on public.notifications (actor_id, created_at desc);

alter table public.project_upvotes enable row level security;
alter table public.project_comments enable row level security;
alter table public.follows enable row level security;

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

create policy "users manage their own upvotes"
  on public.project_upvotes for insert with check (auth.uid() = user_id);

create policy "users delete their own upvotes"
  on public.project_upvotes for delete using (auth.uid() = user_id);

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

create policy "users create their own comments"
  on public.project_comments for insert with check (auth.uid() = user_id);

create policy "users update their own comments"
  on public.project_comments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users delete their own comments"
  on public.project_comments for delete using (auth.uid() = user_id);

create policy "admins moderate comments"
  on public.project_comments for delete using (
    exists (
      select 1 from public.user_roles ur
      where ur.profile_id = auth.uid() and ur.role in ('admin', 'super_admin')
    )
  );

create policy "follows are readable to relevant users"
  on public.follows for select
  using (
    auth.uid() = follower_id
    or auth.uid() = following_id
    or exists (
      select 1 from public.user_roles ur
      where ur.profile_id = auth.uid() and ur.role in ('admin', 'super_admin')
    )
  );

create policy "users can follow other users"
  on public.follows for insert
  with check (
    auth.uid() = follower_id
    and follower_id <> following_id
  );

create policy "users can unfollow users"
  on public.follows for delete using (auth.uid() = follower_id);

create policy "users read their notifications"
  on public.notifications for select using (auth.uid() = profile_id);

create policy "users update their notifications"
  on public.notifications for update using (auth.uid() = profile_id);

create policy "notifications can insert via service role only"
  on public.notifications for insert with check (false);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-covers', 'project-covers', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif'];

create policy "authenticated users can upload project covers"
  on storage.objects for insert
  with check (
    bucket_id = 'project-covers'
    and auth.role() = 'authenticated'
  );

create policy "project covers are publicly readable"
  on storage.objects for select
  using (bucket_id = 'project-covers');

create policy "users can update their project covers"
  on storage.objects for update using (
    bucket_id = 'project-covers'
    and auth.role() = 'authenticated'
  );

create policy "users can delete their project covers"
  on storage.objects for delete using (
    bucket_id = 'project-covers'
    and auth.role() = 'authenticated'
  );
