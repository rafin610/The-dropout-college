-- 0013: Critical/High security hardening
--
-- This migration is additive and idempotent. It closes the permissive policies
-- introduced by earlier migrations without rewriting historical files, and it
-- adds the server-side helpers/RPCs required by the application fixes.
--
-- Verify against staging before production. The migration is intentionally
-- conservative: public read access is preserved, while writes require an
-- active account and the appropriate permission.

-- ============================================================================
-- 1. Account and permission helpers
-- ============================================================================

create or replace function public.is_active_account(actor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.users u
    join public.profiles p on p.id = u.id
    where u.id = actor_id
      and u.account_status = 'active'
      and p.status = 'active'
  );
$$;

create or replace function public.is_super_admin(actor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_active_account(actor_id)
    and (
      exists (
        select 1
        from public.user_roles
        where profile_id = actor_id
          and role = 'super_admin'
      )
      or exists (
        select 1
        from public.user_admin_roles uar
        join public.admin_roles ar on ar.id = uar.role_id
        where uar.user_id = actor_id
          and ar.slug = 'super_admin'
      )
    );
$$;

create or replace function public.has_permission(actor_id uuid, permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when actor_id is null or permission_key is null then false
    when not public.is_active_account(actor_id) then false
    when public.is_super_admin(actor_id) then true
    when exists (
      select 1
      from public.user_admin_roles uar
      join public.admin_role_permissions arp on arp.role_id = uar.role_id
      join public.permissions p on p.id = arp.permission_id
      where uar.user_id = actor_id
        and p.key = permission_key
    ) then true
    else exists (
      select 1
      from public.user_roles ur
      where ur.profile_id = actor_id
        and (
          (
            ur.role = 'admin'
            and permission_key in (
              'dashboard.read', 'users.manage', 'categories.manage',
              'projects.moderate', 'articles.create', 'articles.publish',
              'articles.manage', 'articles.delete', 'events.manage',
              'badges.manage', 'reports.manage', 'discord.manage',
              'audit_logs.read', 'roles.manage', 'site.manage'
            )
          )
          or (
            ur.role = 'moderator'
            and permission_key in (
              'dashboard.read', 'projects.moderate', 'articles.create',
              'articles.publish', 'articles.moderate', 'reports.manage'
            )
          )
          or (
            ur.role = 'event_organizer'
            and permission_key in ('dashboard.read', 'events.manage')
          )
        )
    )
  end;
$$;

create or replace function public.has_event_management_permission(actor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.has_permission(actor_id, 'events.manage');
$$;

-- ============================================================================
-- 2. Permission catalogue
-- ============================================================================

insert into public.permissions (key, description) values
  ('site.manage', 'Manage public site content'),
  ('articles.create', 'Create journal articles'),
  ('articles.publish', 'Publish journal articles'),
  ('articles.manage', 'Manage all journal articles'),
  ('articles.delete', 'Delete journal articles'),
  ('articles.moderate', 'Moderate journal articles')
on conflict (key) do update set description = excluded.description;

insert into public.admin_role_permissions (role_id, permission_id)
select ar.id, p.id
from public.admin_roles ar
cross join public.permissions p
where ar.slug = 'super_admin'
on conflict do nothing;

insert into public.admin_role_permissions (role_id, permission_id)
select ar.id, p.id
from public.admin_roles ar
join public.permissions p on p.key in (
  'dashboard.read', 'users.manage', 'categories.manage', 'projects.moderate',
  'events.manage', 'badges.manage', 'reports.manage', 'discord.manage',
  'roles.manage', 'audit_logs.read', 'site.manage', 'articles.create',
  'articles.publish', 'articles.manage', 'articles.delete'
)
where ar.slug = 'admin'
on conflict do nothing;

insert into public.admin_role_permissions (role_id, permission_id)
select ar.id, p.id
from public.admin_roles ar
join public.permissions p on p.key in (
  'dashboard.read', 'projects.moderate', 'reports.manage',
  'articles.create', 'articles.publish', 'articles.moderate'
)
where ar.slug = 'moderator'
on conflict do nothing;

insert into public.admin_role_permissions (role_id, permission_id)
select ar.id, p.id
from public.admin_roles ar
join public.permissions p on p.key in ('dashboard.read', 'events.manage')
where ar.slug = 'event_manager'
on conflict do nothing;

-- ============================================================================
-- 3. Column privileges: owners may edit presentation data, never status
-- ============================================================================

revoke all on table public.users from anon, authenticated;
grant select on table public.users to authenticated;
grant insert (id, email, onboarding_completed, last_seen_at, created_at, updated_at)
  on table public.users to authenticated;
grant update (onboarding_completed, last_seen_at, updated_at)
  on table public.users to authenticated;

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to anon, authenticated;
grant insert (id, username, display_name, avatar_url, bio, status, created_at, updated_at, last_active_at)
  on table public.profiles to authenticated;
grant update (username, display_name, avatar_url, bio, updated_at, last_active_at)
  on table public.profiles to authenticated;

-- Role assignment and admin metadata are server-controlled.
revoke insert, update, delete on table public.user_roles from anon, authenticated;
revoke insert, update, delete on table public.user_admin_roles from anon, authenticated;
revoke insert, update, delete on table public.admin_roles from anon, authenticated;
revoke insert, update, delete on table public.permissions from anon, authenticated;
revoke insert, update, delete on table public.admin_role_permissions from anon, authenticated;
revoke insert, update, delete on table public.audit_logs from anon, authenticated;

-- Notifications are inserted by trusted RPCs/triggers only.
revoke insert on table public.notifications from anon, authenticated;

-- ============================================================================
-- 4. Account/profile policies
-- ============================================================================

alter table public.users enable row level security;

drop policy if exists "users can read own account" on public.users;
create policy "users can read own account" on public.users
  for select to authenticated
  using (auth.uid() = id);

drop policy if exists "users can insert own account" on public.users;
create policy "users can insert own account" on public.users
  for insert to authenticated
  with check (auth.uid() = id);

drop policy if exists "users can update own account" on public.users;
create policy "users can update own account" on public.users
  for update to authenticated
  using (auth.uid() = id and public.is_active_account(id))
  with check (auth.uid() = id and public.is_active_account(id));

alter table public.profiles enable row level security;

drop policy if exists "public profiles are readable" on public.profiles;
create policy "public profiles are readable" on public.profiles
  for select
  using (
    (status = 'active' and public.is_active_account(id))
    or auth.uid() = id
  );

drop policy if exists "users can insert own profile" on public.profiles;
create policy "users can insert own profile" on public.profiles
  for insert to authenticated
  with check (auth.uid() = id and status = 'active');

drop policy if exists "users update their profile" on public.profiles;
create policy "users update their profile" on public.profiles
  for update to authenticated
  using (auth.uid() = id and public.is_active_account(id))
  with check (
    auth.uid() = id
    and public.is_active_account(id)
    and status = 'active'
  );

-- ============================================================================
-- 5. Profile-adjacent owner writes require an active account
-- ============================================================================

drop policy if exists "users manage their profile categories" on public.profile_categories;
create policy "users manage their profile categories" on public.profile_categories
  for all to authenticated
  using (auth.uid() = profile_id and public.is_active_account(auth.uid()))
  with check (auth.uid() = profile_id and public.is_active_account(auth.uid()));

drop policy if exists "users manage their profile skills" on public.profile_skills;
create policy "users manage their profile skills" on public.profile_skills
  for all to authenticated
  using (auth.uid() = profile_id and public.is_active_account(auth.uid()))
  with check (auth.uid() = profile_id and public.is_active_account(auth.uid()));

drop policy if exists "users manage their skills" on public.user_skills;
create policy "users manage their skills" on public.user_skills
  for all to authenticated
  using (auth.uid() = user_id and public.is_active_account(auth.uid()))
  with check (auth.uid() = user_id and public.is_active_account(auth.uid()));

drop policy if exists "users manage their own social links" on public.social_links;
create policy "users manage their own social links" on public.social_links
  for all to authenticated
  using (auth.uid() = profile_id and public.is_active_account(auth.uid()))
  with check (auth.uid() = profile_id and public.is_active_account(auth.uid()));

-- Community roles are public presentation data, but suspended accounts are
-- not presented as active community members.
drop policy if exists "public community roles are readable" on public.user_roles;
drop policy if exists "users can read their own community roles" on public.user_roles;
create policy "public community roles are readable" on public.user_roles
  for select
  using (
    public.is_active_account(profile_id)
    or auth.uid() = profile_id
  );

-- ============================================================================
-- 5b. Tables that 0001 left without RLS
-- ============================================================================

-- Discord OAuth tokens must never be readable through the public API. The
-- table is server-only; service_role bypasses RLS for the integration code.
alter table public.discord_connections enable row level security;
revoke all on table public.discord_connections from anon, authenticated;

-- Badge definitions and awards are public presentation data; only members
-- with badges.manage may change them.
alter table public.badges enable row level security;

drop policy if exists "badges are publicly readable" on public.badges;
create policy "badges are publicly readable" on public.badges
  for select using (true);

drop policy if exists "badge managers manage badges" on public.badges;
create policy "badge managers manage badges" on public.badges
  for all to authenticated
  using (public.has_permission(auth.uid(), 'badges.manage'))
  with check (public.has_permission(auth.uid(), 'badges.manage'));

alter table public.profile_badges enable row level security;

drop policy if exists "profile badges are publicly readable" on public.profile_badges;
create policy "profile badges are publicly readable" on public.profile_badges
  for select
  using (
    public.is_active_account(profile_id)
    or auth.uid() = profile_id
  );

drop policy if exists "badge managers manage profile badges" on public.profile_badges;
create policy "badge managers manage profile badges" on public.profile_badges
  for all to authenticated
  using (public.has_permission(auth.uid(), 'badges.manage'))
  with check (public.has_permission(auth.uid(), 'badges.manage'));

-- Project metadata is readable only when the parent project is visible, and
-- writable only by the project owner or a project moderator.
alter table public.project_technologies enable row level security;

drop policy if exists "visible project technologies are readable" on public.project_technologies;
create policy "visible project technologies are readable" on public.project_technologies
  for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.deleted_at is null
        and (p.visibility = 'public' or p.owner_id = auth.uid())
    )
    or public.has_permission(auth.uid(), 'projects.moderate')
  );

drop policy if exists "project owners manage technologies" on public.project_technologies;
create policy "project owners manage technologies" on public.project_technologies
  for all to authenticated
  using (
    public.is_active_account(auth.uid())
    and (
      public.has_permission(auth.uid(), 'projects.moderate')
      or exists (
        select 1 from public.projects p
        where p.id = project_id and p.owner_id = auth.uid()
      )
    )
  )
  with check (
    public.is_active_account(auth.uid())
    and (
      public.has_permission(auth.uid(), 'projects.moderate')
      or exists (
        select 1 from public.projects p
        where p.id = project_id and p.owner_id = auth.uid()
      )
    )
  );

alter table public.project_links enable row level security;

drop policy if exists "visible project links are readable" on public.project_links;
create policy "visible project links are readable" on public.project_links
  for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.deleted_at is null
        and (p.visibility = 'public' or p.owner_id = auth.uid())
    )
    or public.has_permission(auth.uid(), 'projects.moderate')
  );

drop policy if exists "project owners manage links" on public.project_links;
create policy "project owners manage links" on public.project_links
  for all to authenticated
  using (
    public.is_active_account(auth.uid())
    and (
      public.has_permission(auth.uid(), 'projects.moderate')
      or exists (
        select 1 from public.projects p
        where p.id = project_id and p.owner_id = auth.uid()
      )
    )
  )
  with check (
    public.is_active_account(auth.uid())
    and (
      public.has_permission(auth.uid(), 'projects.moderate')
      or exists (
        select 1 from public.projects p
        where p.id = project_id and p.owner_id = auth.uid()
      )
    )
  );

-- Invitations are private between the inviter and the invited member.
alter table public.team_invitations enable row level security;

drop policy if exists "invitation participants can read" on public.team_invitations;
create policy "invitation participants can read" on public.team_invitations
  for select to authenticated
  using (
    auth.uid() = invited_profile_id
    or auth.uid() = invited_by
  );

drop policy if exists "inviters create invitations" on public.team_invitations;
create policy "inviters create invitations" on public.team_invitations
  for insert to authenticated
  with check (
    auth.uid() = invited_by
    and public.is_active_account(auth.uid())
  );

drop policy if exists "invitation participants update" on public.team_invitations;
create policy "invitation participants update" on public.team_invitations
  for update to authenticated
  using (
    (auth.uid() = invited_profile_id or auth.uid() = invited_by)
    and public.is_active_account(auth.uid())
  )
  with check (
    (auth.uid() = invited_profile_id or auth.uid() = invited_by)
    and public.is_active_account(auth.uid())
  );

drop policy if exists "inviters delete invitations" on public.team_invitations;
create policy "inviters delete invitations" on public.team_invitations
  for delete to authenticated
  using (
    auth.uid() = invited_by
    and public.is_active_account(auth.uid())
  );

-- ============================================================================
-- 6. Project and social write policies
-- ============================================================================

drop policy if exists "public projects are readable" on public.projects;
create policy "public projects are readable" on public.projects
  for select
  using (
    (visibility = 'public' and deleted_at is null)
    or auth.uid() = owner_id
  );

drop policy if exists "owners create projects" on public.projects;
create policy "owners create projects" on public.projects
  for insert to authenticated
  with check (
    auth.uid() = owner_id
    and public.is_active_account(auth.uid())
  );

drop policy if exists "owners update projects" on public.projects;
create policy "owners update projects" on public.projects
  for update to authenticated
  using (auth.uid() = owner_id and public.is_active_account(auth.uid()))
  with check (auth.uid() = owner_id and public.is_active_account(auth.uid()));

drop policy if exists "owners delete projects" on public.projects;
create policy "owners delete projects" on public.projects
  for delete to authenticated
  using (auth.uid() = owner_id and public.is_active_account(auth.uid()));

drop policy if exists "users manage their own upvotes" on public.project_upvotes;
create policy "users manage their own upvotes" on public.project_upvotes
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.is_active_account(auth.uid())
    and exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.deleted_at is null
        and (p.visibility = 'public' or p.owner_id = auth.uid())
    )
  );

drop policy if exists "users delete their own upvotes" on public.project_upvotes;
create policy "users delete their own upvotes" on public.project_upvotes
  for delete to authenticated
  using (auth.uid() = user_id and public.is_active_account(auth.uid()));

drop policy if exists "users create their own comments" on public.project_comments;
create policy "users create their own comments" on public.project_comments
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.is_active_account(auth.uid())
    and exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.deleted_at is null
        and (p.visibility = 'public' or p.owner_id = auth.uid())
    )
  );

drop policy if exists "users update their own comments" on public.project_comments;
create policy "users update their own comments" on public.project_comments
  for update to authenticated
  using (auth.uid() = user_id and public.is_active_account(auth.uid()))
  with check (auth.uid() = user_id and public.is_active_account(auth.uid()));

drop policy if exists "users delete their own comments" on public.project_comments;
create policy "users delete their own comments" on public.project_comments
  for delete to authenticated
  using (auth.uid() = user_id and public.is_active_account(auth.uid()));

drop policy if exists "admins moderate comments" on public.project_comments;
create policy "admins moderate comments" on public.project_comments
  for delete to authenticated
  using (public.has_permission(auth.uid(), 'projects.moderate'));

drop policy if exists "users can follow other users" on public.follows;
create policy "users can follow other users" on public.follows
  for insert to authenticated
  with check (
    auth.uid() = follower_id
    and follower_id <> following_id
    and public.is_active_account(auth.uid())
    and public.is_active_account(following_id)
  );

drop policy if exists "users can unfollow users" on public.follows;
create policy "users can unfollow users" on public.follows
  for delete to authenticated
  using (auth.uid() = follower_id and public.is_active_account(auth.uid()));

-- ============================================================================
-- 7. Event policies: remove the permissive 0005 policies entirely
-- ============================================================================

drop policy if exists "events_public_read_published" on public.events;
drop policy if exists "events_authenticated_read_all" on public.events;
drop policy if exists "events_authenticated_insert" on public.events;
drop policy if exists "events_authenticated_update" on public.events;
drop policy if exists "events_authenticated_delete" on public.events;
drop policy if exists "published events are readable" on public.events;
drop policy if exists "event managers create events" on public.events;
drop policy if exists "event managers update events" on public.events;
drop policy if exists "event managers delete events" on public.events;

create policy "published events are readable" on public.events
  for select
  using (status = 'published');

drop policy if exists "event creators and managers read events" on public.events;
create policy "event creators and managers read events" on public.events
  for select to authenticated
  using (
    auth.uid() = created_by
    or public.has_permission(auth.uid(), 'events.manage')
  );

create policy "event managers create events" on public.events
  for insert to authenticated
  with check (
    auth.uid() = created_by
    and public.has_permission(auth.uid(), 'events.manage')
  );

create policy "event managers update events" on public.events
  for update to authenticated
  using (public.has_permission(auth.uid(), 'events.manage'))
  with check (public.has_permission(auth.uid(), 'events.manage'));

create policy "event managers delete events" on public.events
  for delete to authenticated
  using (public.has_permission(auth.uid(), 'events.manage'));

drop policy if exists "event_participants_users_manage_own" on public.event_participants;
create policy "event_participants_users_manage_own" on public.event_participants
  for all to authenticated
  using (
    auth.uid() = profile_id
    and public.is_active_account(auth.uid())
  )
  with check (
    auth.uid() = profile_id
    and public.is_active_account(auth.uid())
  );

-- ============================================================================
-- 8. Notifications: no direct inserts; restricted social RPC
-- ============================================================================

drop policy if exists "notifications can insert via service role only" on public.notifications;
drop policy if exists "users create notifications as actor" on public.notifications;
drop policy if exists "notifications_authenticated_insert_events" on public.notifications;

drop policy if exists "users read their notifications" on public.notifications;
create policy "users read their notifications" on public.notifications
  for select to authenticated
  using (auth.uid() = profile_id);

drop policy if exists "users update their notifications" on public.notifications;
create policy "users update their notifications" on public.notifications
  for update to authenticated
  using (auth.uid() = profile_id and public.is_active_account(auth.uid()))
  with check (auth.uid() = profile_id and public.is_active_account(auth.uid()));

create or replace function public.create_social_notification(
  p_recipient_id uuid,
  p_type text,
  p_project_id uuid default null,
  p_comment_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_type text := upper(coalesce(p_type, ''));
  v_existing uuid;
  v_notification_id uuid;
  v_actor_name text;
  v_project record;
  v_comment record;
  v_title text;
  v_body text;
  v_resource_type text;
  v_resource_id uuid;
begin
  if v_actor is null or not public.is_active_account(v_actor) then
    raise exception 'An active account is required.'
      using errcode = '42501';
  end if;

  if p_recipient_id is null
    or p_recipient_id = v_actor
    or not public.is_active_account(p_recipient_id) then
    raise exception 'Notification recipient is not available.'
      using errcode = '42501';
  end if;

  if v_type not in ('FOLLOW', 'UPVOTE', 'COMMENT') then
    raise exception 'Unsupported notification type.'
      using errcode = '22023';
  end if;

  select coalesce(display_name, 'A community member')
    into v_actor_name
    from public.profiles
    where id = v_actor;

  if v_type = 'FOLLOW' then
    if not exists (
      select 1 from public.follows
      where follower_id = v_actor
        and following_id = p_recipient_id
    ) then
      raise exception 'A follow relationship is required.'
        using errcode = '42501';
    end if;

    v_resource_type := 'profile';
    v_resource_id := v_actor;
    v_title := 'New follower';
    v_body := v_actor_name || ' started following you.';

  elsif v_type = 'UPVOTE' then
    if p_project_id is null then
      raise exception 'A project is required for an upvote notification.'
        using errcode = '22023';
    end if;

    select p.id, p.owner_id, p.name
      into v_project
      from public.projects p
      where p.id = p_project_id
        and p.deleted_at is null;

    if not found then
      raise exception 'Project not found.'
        using errcode = '22023';
    end if;
    if v_project.owner_id <> p_recipient_id then
      raise exception 'Notification recipient does not own this project.'
        using errcode = '42501';
    end if;
    if not exists (
      select 1 from public.project_upvotes
      where project_id = p_project_id
        and user_id = v_actor
    ) then
      raise exception 'An upvote is required for this notification.'
        using errcode = '42501';
    end if;

    v_resource_type := 'project';
    v_resource_id := p_project_id;
    v_title := 'New upvote';
    v_body := v_actor_name || ' upvoted your project "' || v_project.name || '".';

  else
    if p_comment_id is null then
      raise exception 'A comment is required for a comment notification.'
        using errcode = '22023';
    end if;

    select c.id, c.project_id, c.user_id, p.owner_id, p.name
      into v_comment
      from public.project_comments c
      join public.projects p on p.id = c.project_id
      where c.id = p_comment_id;

    if not found then
      raise exception 'Comment not found.'
        using errcode = '22023';
    end if;
    if v_comment.user_id <> v_actor then
      raise exception 'You can only notify about your own comment.'
        using errcode = '42501';
    end if;
    if v_comment.owner_id <> p_recipient_id then
      raise exception 'Notification recipient does not own this project.'
        using errcode = '42501';
    end if;
    if p_project_id is not null and p_project_id <> v_comment.project_id then
      raise exception 'Comment does not belong to the supplied project.'
        using errcode = '22023';
    end if;

    v_resource_type := 'project';
    v_resource_id := v_comment.project_id;
    v_title := 'New comment';
    v_body := v_actor_name || ' commented on your project "' || v_comment.name || '".';
  end if;

  select id into v_existing
  from public.notifications
  where profile_id = p_recipient_id
    and actor_id = v_actor
    and type = v_type
    and project_id is not distinct from p_project_id
    and comment_id is not distinct from p_comment_id
    and read_at is null
  limit 1;

  if v_existing is not null then
    update public.notifications
      set created_at = now()
      where id = v_existing;
    return v_existing;
  end if;

  insert into public.notifications (
    profile_id, actor_id, type, title, body, resource_type, resource_id,
    project_id, comment_id
  )
  values (
    p_recipient_id, v_actor, v_type, v_title, v_body, v_resource_type,
    v_resource_id, p_project_id, p_comment_id
  )
  returning id into v_notification_id;

  return v_notification_id;
end;
$$;

revoke all on function public.create_social_notification(uuid, text, uuid, uuid) from public;
revoke all on function public.create_social_notification(uuid, text, uuid, uuid) from anon;
grant execute on function public.create_social_notification(uuid, text, uuid, uuid)
  to authenticated, service_role;

-- ============================================================================
-- 9. Journal policies and write-time trigger
-- ============================================================================

drop policy if exists "public articles are readable" on public.articles;
create policy "public articles are readable" on public.articles
  for select
  using (status = 'published' and deleted_at is null);

drop policy if exists "authors can read own articles" on public.articles;
create policy "authors can read own articles" on public.articles
  for select to authenticated
  using (
    auth.uid() = author_id
    and deleted_at is null
    and public.is_active_account(auth.uid())
  );

drop policy if exists "staff can read all articles" on public.articles;
create policy "staff can read all articles" on public.articles
  for select to authenticated
  using (
    deleted_at is null
    and (
      public.has_permission(auth.uid(), 'articles.manage')
      or public.has_permission(auth.uid(), 'articles.moderate')
    )
  );

drop policy if exists "staff can insert articles" on public.articles;
create policy "staff can insert articles" on public.articles
  for insert to authenticated
  with check (
    auth.uid() = author_id
    and (
      public.has_permission(auth.uid(), 'articles.create')
      or public.has_permission(auth.uid(), 'articles.manage')
    )
  );

drop policy if exists "admins can update articles" on public.articles;
create policy "admins can update articles" on public.articles
  for update to authenticated
  using (public.has_permission(auth.uid(), 'articles.manage'))
  with check (public.has_permission(auth.uid(), 'articles.manage'));

drop policy if exists "moderators can update own articles" on public.articles;
create policy "moderators can update own articles" on public.articles
  for update to authenticated
  using (
    auth.uid() = author_id
    and public.has_permission(auth.uid(), 'articles.create')
  )
  with check (
    auth.uid() = author_id
    and public.has_permission(auth.uid(), 'articles.create')
  );

drop policy if exists "admins can delete articles" on public.articles;
create policy "admins can delete articles" on public.articles
  for delete to authenticated
  using (
    public.has_permission(auth.uid(), 'articles.manage')
    or public.has_permission(auth.uid(), 'articles.delete')
  );

drop policy if exists "moderators can delete own drafts" on public.articles;
create policy "moderators can delete own drafts" on public.articles
  for delete to authenticated
  using (
    auth.uid() = author_id
    and status = 'draft'
    and public.has_permission(auth.uid(), 'articles.create')
  );

create or replace function public.enforce_article_write_permissions()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Service-role/internal writes have no end-user JWT and are trusted.
  if auth.uid() is null then
    return new;
  end if;

  if not public.is_active_account(auth.uid()) then
    raise exception 'An active account is required.'
      using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    if new.author_id <> auth.uid() then
      raise exception 'Articles must be authored by the current user.'
        using errcode = '42501';
    end if;
    if not (
      public.has_permission(auth.uid(), 'articles.create')
      or public.has_permission(auth.uid(), 'articles.manage')
    ) then
      raise exception 'Article creation permission is required.'
        using errcode = '42501';
    end if;
    if new.status = 'published'
      and not public.has_permission(auth.uid(), 'articles.publish')
      and not public.has_permission(auth.uid(), 'articles.manage') then
      raise exception 'Article publish permission is required.'
        using errcode = '42501';
    end if;
    if new.featured
      and not public.has_permission(auth.uid(), 'articles.manage') then
      raise exception 'Article feature permission is required.'
        using errcode = '42501';
    end if;
  else
    if old.author_id <> new.author_id
      and not public.has_permission(auth.uid(), 'articles.manage') then
      raise exception 'Only an article manager can change authorship.'
        using errcode = '42501';
    end if;

    if not public.has_permission(auth.uid(), 'articles.manage') then
      if old.author_id <> auth.uid() then
        raise exception 'You can only update your own articles.'
          using errcode = '42501';
      end if;
      if new.status = 'published'
        and old.status <> 'published'
        and not public.has_permission(auth.uid(), 'articles.publish') then
        raise exception 'Article publish permission is required.'
          using errcode = '42501';
      end if;
      if new.featured is distinct from old.featured
        and not public.has_permission(auth.uid(), 'articles.manage') then
        raise exception 'Article feature permission is required.'
          using errcode = '42501';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_article_write_permissions on public.articles;
create trigger enforce_article_write_permissions
  before insert or update on public.articles
  for each row execute function public.enforce_article_write_permissions();

-- ============================================================================
-- 10. CMS writes require site.manage, not merely an authenticated session
-- ============================================================================

drop policy if exists "admins manage site settings" on public.site_settings;
drop policy if exists "site managers manage site settings" on public.site_settings;
create policy "site managers manage site settings" on public.site_settings
  for all to authenticated
  using (public.has_permission(auth.uid(), 'site.manage'))
  with check (public.has_permission(auth.uid(), 'site.manage'));

drop policy if exists "admins manage site sections" on public.site_sections;
drop policy if exists "site managers manage site sections" on public.site_sections;
create policy "site managers manage site sections" on public.site_sections
  for all to authenticated
  using (public.has_permission(auth.uid(), 'site.manage'))
  with check (public.has_permission(auth.uid(), 'site.manage'));

drop policy if exists "admins manage social links" on public.site_social_links;
drop policy if exists "site managers manage social links" on public.site_social_links;
create policy "site managers manage social links" on public.site_social_links
  for all to authenticated
  using (public.has_permission(auth.uid(), 'site.manage'))
  with check (public.has_permission(auth.uid(), 'site.manage'));

-- ============================================================================
-- 11. Storage: project-cover writes are scoped to the uploader's folder
-- ============================================================================

alter table storage.objects enable row level security;

drop policy if exists "authenticated users can upload project covers" on storage.objects;
create policy "authenticated users can upload project covers"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'project-covers'
    and public.is_active_account(auth.uid())
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users can update their project covers" on storage.objects;
create policy "users can update their project covers"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'project-covers'
    and public.is_active_account(auth.uid())
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'project-covers'
    and public.is_active_account(auth.uid())
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users can delete their project covers" on storage.objects;
create policy "users can delete their project covers"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'project-covers'
    and public.is_active_account(auth.uid())
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- 12. Transactional, service-role-only member administration
-- ============================================================================

create or replace function public.admin_update_member(
  p_actor_id uuid,
  p_user_id uuid,
  p_status text default null,
  p_role text default null,
  p_request_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_super boolean;
  v_target record;
  v_target_roles text[];
  v_new_roles text[];
  v_response_roles text[];
  v_before jsonb;
  v_after jsonb;
  v_new_status text;
  v_profile_status text;
  v_display_name text;
  v_username text;
  v_email text;
  v_created_at timestamptz;
  v_other_supers integer;
begin
  -- Serialize administrative changes so two concurrent requests cannot both
  -- remove the last super admin.
  perform pg_advisory_xact_lock(hashtext('admin_update_member'));

  if p_actor_id is null or p_user_id is null then
    raise exception 'An actor and target are required.'
      using errcode = '22023';
  end if;
  if p_actor_id = p_user_id then
    raise exception 'You cannot change your own membership.'
      using errcode = '42501';
  end if;
  if p_status is not null
    and p_status not in ('active', 'suspended', 'deleted') then
    raise exception 'Invalid member status.'
      using errcode = '22023';
  end if;
  if p_role is not null
    and p_role not in ('member', 'mentor', 'event_organizer', 'moderator', 'admin') then
    raise exception 'Invalid member role.'
      using errcode = '22023';
  end if;
  if p_status is null and p_role is null then
    raise exception 'Choose a status or role to update.'
      using errcode = '22023';
  end if;

  if not public.is_active_account(p_actor_id) then
    raise exception 'An active administrator account is required.'
      using errcode = '42501';
  end if;
  if not public.has_permission(p_actor_id, 'users.manage') then
    raise exception 'Member management permission is required.'
      using errcode = '42501';
  end if;
  if p_role is not null
    and not public.has_permission(p_actor_id, 'roles.manage') then
    raise exception 'Role management permission is required.'
      using errcode = '42501';
  end if;

  v_actor_super := public.is_super_admin(p_actor_id);

  select
    u.id,
    u.email,
    u.account_status,
    p.status as profile_status,
    p.display_name,
    p.username,
    p.created_at
    into v_target
    from public.users u
    join public.profiles p on p.id = u.id
    where u.id = p_user_id
    for update of u, p;

  if not found then
    raise exception 'Member not found.'
      using errcode = 'P0002';
  end if;

  select coalesce(array_agg(role order by role), '{}'::text[])
    into v_target_roles
    from (
      select role
      from public.user_roles
      where profile_id = p_user_id
      union
      select ar.slug as role
      from public.user_admin_roles uar
      join public.admin_roles ar on ar.id = uar.role_id
      where uar.user_id = p_user_id
    ) target_roles;

  if not v_actor_super
    and (
      'super_admin' = any(v_target_roles)
      or 'admin' = any(v_target_roles)
    ) then
    raise exception 'Only a super admin can change another administrator.'
      using errcode = '42501';
  end if;

  if p_role = 'admin' and not v_actor_super then
    raise exception 'Only a super admin can assign the admin role.'
      using errcode = '42501';
  end if;

  if 'super_admin' = any(v_target_roles)
    and (
      (p_role is not null and p_role <> 'super_admin')
      or (p_status is not null and p_status <> 'active')
    ) then
    select count(*)::int
      into v_other_supers
      from (
        select ur.profile_id
        from public.user_roles ur
        where ur.role = 'super_admin'
        union
        select uar.user_id
        from public.user_admin_roles uar
        join public.admin_roles ar on ar.id = uar.role_id
        where ar.slug = 'super_admin'
      ) supers
      join public.users u on u.id = supers.profile_id
      join public.profiles p on p.id = supers.profile_id
      where supers.profile_id <> p_user_id
        and u.account_status = 'active'
        and p.status = 'active';

    if v_other_supers = 0 then
      raise exception 'At least one active super admin must remain.'
        using errcode = '23514';
    end if;
  end if;

  v_before := jsonb_build_object(
    'accountStatus', v_target.account_status,
    'profileStatus', v_target.profile_status,
    'roles', to_jsonb(v_target_roles)
  );

  if p_status is not null then
    update public.users
      set account_status = p_status::public.member_status,
          updated_at = now()
      where id = p_user_id;
    update public.profiles
      set status = p_status::public.member_status,
          updated_at = now()
      where id = p_user_id;
  end if;

  if p_role is not null then
    delete from public.user_roles where profile_id = p_user_id;
    -- Clear legacy admin assignments as well. Otherwise a member demoted to
    -- "member" would keep the permissions of a user_admin_roles row.
    delete from public.user_admin_roles where user_id = p_user_id;
    insert into public.user_roles (profile_id, role)
      values (p_user_id, p_role);
  end if;

  select
    u.account_status::text,
    p.status::text,
    p.display_name,
    p.username,
    u.email,
    p.created_at
    into v_new_status, v_profile_status, v_display_name, v_username, v_email, v_created_at
    from public.users u
    join public.profiles p on p.id = u.id
    where u.id = p_user_id;

  select coalesce(array_agg(role order by role), '{}'::text[])
    into v_new_roles
    from (
      select role
      from public.user_roles
      where profile_id = p_user_id
      union
      select ar.slug as role
      from public.user_admin_roles uar
      join public.admin_roles ar on ar.id = uar.role_id
      where uar.user_id = p_user_id
    ) target_roles;

  v_response_roles := case
    when cardinality(v_new_roles) = 0 then array['member']::text[]
    else v_new_roles
  end;

  v_after := jsonb_build_object(
    'accountStatus', v_new_status,
    'profileStatus', v_profile_status,
    'roles', to_jsonb(v_new_roles)
  );

  insert into public.audit_logs (
    actor_id, action, resource_type, resource_id, before_data, after_data, request_id
  )
  values (
    p_actor_id, 'member.update', 'user', p_user_id, v_before, v_after, p_request_id
  );

  return jsonb_build_object(
    'id', p_user_id,
    'displayName', v_display_name,
    'username', v_username,
    'email', v_email::text,
    'status', v_profile_status,
    'accountStatus', v_new_status,
    'createdAt', v_created_at,
    'roles', to_jsonb(v_response_roles)
  );
end;
$$;

revoke all on function public.admin_update_member(uuid, uuid, text, text, text) from public;
revoke all on function public.admin_update_member(uuid, uuid, text, text, text) from anon;
revoke all on function public.admin_update_member(uuid, uuid, text, text, text) from authenticated;
grant execute on function public.admin_update_member(uuid, uuid, text, text, text)
  to service_role;
