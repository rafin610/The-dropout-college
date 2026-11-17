-- Campus staff administration. This migration depends on the posts and
-- post_comments tables introduced by 0016_campus_social.sql.

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
      join public.admin_roles ar on ar.slug = ur.role
      join public.admin_role_permissions arp on arp.role_id = ar.id
      join public.permissions p on p.id = arp.permission_id
      where ur.profile_id = actor_id
        and p.key = permission_key
        and ur.role in ('admin', 'moderator')
    ) or exists (
      select 1
      from public.user_roles ur
      where ur.profile_id = actor_id
        and ur.role = 'event_organizer'
        and permission_key in ('dashboard.read', 'events.manage')
    )
  end;
$$;

insert into public.permissions (key, description) values
  ('dashboard.read', 'View the staff dashboard'),
  ('users.manage', 'View member activity and manage member accounts'),
  ('projects.moderate', 'Moderate community projects'),
  ('articles.create', 'Create and edit journal drafts'),
  ('articles.publish', 'Publish and unpublish journal articles'),
  ('articles.moderate', 'Review journal articles'),
  ('reports.manage', 'Manage community reports')
on conflict (key) do update set description = excluded.description;

insert into public.admin_roles (name, slug, description)
values ('Moderator', 'moderator', 'Manage approved community and editorial workflows')
on conflict (slug) do nothing;

insert into public.admin_role_permissions (role_id, permission_id)
select roles.id, permissions.id
from public.admin_roles roles
join public.permissions permissions on permissions.key in (
  'dashboard.read',
  'projects.moderate',
  'articles.create',
  'articles.publish',
  'articles.moderate',
  'reports.manage'
)
where roles.slug = 'moderator'
on conflict do nothing;

create or replace function public.admin_list_members(
  p_actor_id uuid,
  p_page integer default 1,
  p_page_size integer default 25,
  p_search text default '',
  p_status text default null,
  p_role text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null
    or p_actor_id is distinct from auth.uid()
    or not public.is_active_account(p_actor_id)
    or not public.has_permission(p_actor_id, 'users.manage') then
    raise exception 'Member management permission is required.'
      using errcode = '42501';
  end if;

  if p_page < 1 or p_page_size < 1 or p_page_size > 50 then
    raise exception 'Invalid member page.'
      using errcode = '22023';
  end if;
  if p_status is not null and p_status not in ('active', 'suspended', 'deleted') then
    raise exception 'Invalid member status filter.'
      using errcode = '22023';
  end if;
  if p_role is not null and p_role not in ('member', 'moderator', 'admin') then
    raise exception 'Invalid member role filter.'
      using errcode = '22023';
  end if;

  with filtered as materialized (
    select
      p.id,
      p.display_name,
      p.username,
      p.avatar_url,
      p.created_at,
      u.account_status::text as status,
      coalesce((
        select array_agg(distinct assigned.role order by assigned.role)
        from (
          select ur.role
          from public.user_roles ur
          where ur.profile_id = p.id
          union
          select ar.slug
          from public.user_admin_roles uar
          join public.admin_roles ar on ar.id = uar.role_id
          where uar.user_id = p.id
        ) assigned
      ), array['member']::text[]) as roles
    from public.profiles p
    join public.users u on u.id = p.id
    where (
        coalesce(p_search, '') = ''
        or p.display_name ilike '%' || p_search || '%'
        or p.username::text ilike '%' || p_search || '%'
      )
      and (p_status is null or u.account_status::text = p_status)
      and (
        p_role is null
        or (
          p_role = 'member'
          and not exists (
            select 1 from public.user_roles ur
            where ur.profile_id = p.id
          )
          and not exists (
            select 1 from public.user_admin_roles uar
            where uar.user_id = p.id
          )
        )
        or exists (
          select 1 from public.user_roles ur
          where ur.profile_id = p.id
            and (
              ur.role = p_role
              or (p_role = 'admin' and ur.role = 'super_admin')
            )
        )
        or exists (
          select 1
          from public.user_admin_roles uar
          join public.admin_roles ar on ar.id = uar.role_id
          where uar.user_id = p.id
            and (
              ar.slug = p_role
              or (p_role = 'admin' and ar.slug = 'super_admin')
            )
        )
      )
  ),
  page_rows as (
    select *
    from filtered
    order by created_at desc, id
    limit p_page_size
    offset (p_page - 1) * p_page_size
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'page', p_page,
    'pageSize', p_page_size,
    'members', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', member.id,
          'displayName', member.display_name,
          'username', member.username,
          'avatarUrl', member.avatar_url,
          'status', member.status,
          'createdAt', member.created_at,
          'roles', to_jsonb(member.roles),
          'posts', (select count(*) from public.posts post where post.author_id = member.id and post.deleted_at is null),
          'comments', (select count(*) from public.post_comments comment where comment.author_id = member.id),
          'journals', (select count(*) from public.articles article where article.author_id = member.id and article.deleted_at is null),
          'followers', (select count(*) from public.follows follow where follow.following_id = member.id),
          'following', (select count(*) from public.follows follow where follow.follower_id = member.id)
        )
        order by member.created_at desc, member.id
      )
      from page_rows member
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_list_members(uuid, integer, integer, text, text, text) from public, anon, authenticated;
grant execute on function public.admin_list_members(uuid, integer, integer, text, text, text) to authenticated;

create or replace function public.admin_get_staff_overview()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null
    or not public.is_active_account(auth.uid())
    or not public.has_permission(auth.uid(), 'dashboard.read') then
    raise exception 'Staff dashboard permission is required.'
      using errcode = '42501';
  end if;

  select jsonb_build_object(
    'stats', jsonb_build_object(
      'totalMembers', (select count(*) from public.users),
      'activeMembers', (select count(*) from public.users where account_status = 'active'),
      'suspendedMembers', (select count(*) from public.users where account_status = 'suspended'),
      'newMembers', (select count(*) from public.users where created_at >= now() - interval '30 days'),
      'publishedPosts', (select count(*) from public.posts where deleted_at is null),
      'publishedJournals', (select count(*) from public.articles where status = 'published' and deleted_at is null),
      'comments', (select count(*) from public.post_comments),
      'followRelationships', (select count(*) from public.follows),
      'admins', (
        select count(*) from public.users u
        join public.profiles p on p.id = u.id
        where u.account_status = 'active' and p.status = 'active'
          and (
            exists (select 1 from public.user_roles ur where ur.profile_id = u.id and ur.role in ('admin', 'super_admin'))
            or exists (
              select 1 from public.user_admin_roles uar
              join public.admin_roles ar on ar.id = uar.role_id
              where uar.user_id = u.id and ar.slug in ('admin', 'super_admin')
            )
          )
      ),
      'moderators', (
        select count(*) from public.users u
        join public.profiles p on p.id = u.id
        where u.account_status = 'active' and p.status = 'active'
          and (
            exists (select 1 from public.user_roles ur where ur.profile_id = u.id and ur.role = 'moderator')
            or exists (
              select 1 from public.user_admin_roles uar
              join public.admin_roles ar on ar.id = uar.role_id
              where uar.user_id = u.id and ar.slug = 'moderator'
            )
          )
      )
    ),
    'recentMembers', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', member.id,
          'displayName', member.display_name,
          'username', member.username,
          'avatarUrl', member.avatar_url,
          'status', member.account_status,
          'createdAt', member.created_at,
          'role', member.role
        ) order by member.created_at desc
      )
      from (
        select
          p.id,
          p.display_name,
          p.username,
          p.avatar_url,
          p.created_at,
          u.account_status::text as account_status,
          case
            when exists (
              select 1 from public.user_roles ur
              where ur.profile_id = p.id and ur.role in ('admin', 'super_admin')
            ) or exists (
              select 1 from public.user_admin_roles uar
              join public.admin_roles ar on ar.id = uar.role_id
              where uar.user_id = p.id and ar.slug in ('admin', 'super_admin')
            ) then 'admin'
            when exists (
              select 1 from public.user_roles ur
              where ur.profile_id = p.id and ur.role = 'moderator'
            ) or exists (
              select 1 from public.user_admin_roles uar
              join public.admin_roles ar on ar.id = uar.role_id
              where uar.user_id = p.id and ar.slug = 'moderator'
            ) then 'moderator'
            else 'member'
          end as role
        from public.profiles p
        join public.users u on u.id = p.id
        order by p.created_at desc
        limit 6
      ) member
    ), '[]'::jsonb),
    'recentActivity', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', item.id,
          'kind', item.kind,
          'summary', item.summary,
          'createdAt', item.created_at,
          'authorName', item.display_name,
          'username', item.username
        ) order by item.created_at desc
      )
      from (
        select
          'post:' || post.id::text as id,
          'post'::text as kind,
          left(post.content, 110) as summary,
          post.created_at,
          profile.display_name,
          profile.username
        from public.posts post
        join public.profiles profile on profile.id = post.author_id
        where post.deleted_at is null
        union all
        select
          'comment:' || comment.id::text as id,
          'comment'::text as kind,
          left(comment.content, 110) as summary,
          comment.created_at,
          profile.display_name,
          profile.username
        from public.post_comments comment
        join public.profiles profile on profile.id = comment.author_id
      ) item
      order by item.created_at desc
      limit 8
    ), '[]'::jsonb),
    'recentJournals', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', article.id,
          'title', article.title,
          'slug', article.slug,
          'published_at', article.published_at,
          'updated_at', article.updated_at,
          'author', jsonb_build_object(
            'display_name', profile.display_name,
            'username', profile.username
          )
        ) order by article.published_at desc nulls last
      )
      from (
        select id, title, slug, author_id, published_at, updated_at
        from public.articles
        where status = 'published' and deleted_at is null
        order by published_at desc nulls last
        limit 5
      ) article
      join public.profiles profile on profile.id = article.author_id
    ), '[]'::jsonb),
    'system', jsonb_build_object(
      'database', 'connected',
      'communityFeed', 'ready',
      'activity', 'ready'
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_get_staff_overview() from public, anon;
grant execute on function public.admin_get_staff_overview() to authenticated;

create or replace function public.admin_get_member_detail(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile jsonb;
  v_result jsonb;
begin
  if auth.uid() is null
    or not public.is_active_account(auth.uid())
    or not public.has_permission(auth.uid(), 'users.manage') then
    raise exception 'Member management permission is required.'
      using errcode = '42501';
  end if;

  select jsonb_build_object(
    'display_name', p.display_name,
    'username', p.username,
    'avatar_url', p.avatar_url,
    'bio', p.bio,
    'headline', p.headline,
    'location', p.location,
    'status', u.account_status,
    'created_at', p.created_at
  ) into v_profile
  from public.profiles p
  join public.users u on u.id = p.id
  where p.id = p_user_id;

  if v_profile is null then
    raise exception 'Member not found.' using errcode = 'P0002';
  end if;

  select jsonb_build_object(
    'profile', v_profile,
    'roles', coalesce((
      select jsonb_agg(distinct assigned.role order by assigned.role)
      from (
        select role from public.user_roles where profile_id = p_user_id
        union
        select ar.slug from public.user_admin_roles uar
        join public.admin_roles ar on ar.id = uar.role_id
        where uar.user_id = p_user_id
      ) assigned
    ), '[]'::jsonb),
    'activity', jsonb_build_object(
      'counts', jsonb_build_object(
        'posts', (select count(*) from public.posts where author_id = p_user_id and deleted_at is null),
        'comments', (select count(*) from public.post_comments where author_id = p_user_id),
        'journals', (select count(*) from public.articles where author_id = p_user_id and deleted_at is null),
        'followers', (select count(*) from public.follows where following_id = p_user_id),
        'following', (select count(*) from public.follows where follower_id = p_user_id)
      ),
      'posts', coalesce((
        select jsonb_agg(jsonb_build_object('id', item.id, 'content', item.content, 'created_at', item.created_at) order by item.created_at desc)
        from (
          select id, content, created_at from public.posts
          where author_id = p_user_id and deleted_at is null
          order by created_at desc limit 5
        ) item
      ), '[]'::jsonb),
      'comments', coalesce((
        select jsonb_agg(jsonb_build_object('id', item.id, 'content', item.content, 'created_at', item.created_at) order by item.created_at desc)
        from (
          select id, content, created_at from public.post_comments
          where author_id = p_user_id
          order by created_at desc limit 5
        ) item
      ), '[]'::jsonb),
      'journals', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', item.id, 'title', item.title, 'slug', item.slug,
          'status', item.status, 'updated_at', item.updated_at, 'created_at', item.created_at
        ) order by item.updated_at desc)
        from (
          select id, title, slug, status, updated_at, created_at
          from public.articles
          where author_id = p_user_id and deleted_at is null
          order by updated_at desc limit 5
        ) item
      ), '[]'::jsonb)
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_get_member_detail(uuid) from public, anon;
grant execute on function public.admin_get_member_detail(uuid) to authenticated;

create or replace function public.admin_set_moderator_permission(
  p_actor_id uuid,
  p_permission_key text,
  p_enabled boolean,
  p_request_id text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role_id uuid;
  v_permission_id uuid;
  v_was_enabled boolean;
begin
  if auth.uid() is null
    or p_actor_id is distinct from auth.uid()
    or not public.is_active_account(p_actor_id)
    or not public.has_permission(p_actor_id, 'roles.manage') then
    raise exception 'Only an active administrator can manage Moderator permissions.'
      using errcode = '42501';
  end if;

  if p_permission_key not in (
    'dashboard.read',
    'users.manage',
    'projects.moderate',
    'articles.create',
    'articles.publish',
    'articles.moderate',
    'reports.manage'
  ) then
    raise exception 'That permission is not configurable for Moderators.'
      using errcode = '22023';
  end if;

  select id into v_role_id
  from public.admin_roles
  where slug = 'moderator';

  select id into v_permission_id
  from public.permissions
  where key = p_permission_key;

  if v_role_id is null or v_permission_id is null then
    raise exception 'Moderator permissions are not configured.'
      using errcode = 'P0002';
  end if;

  select exists (
    select 1 from public.admin_role_permissions
    where role_id = v_role_id and permission_id = v_permission_id
  ) into v_was_enabled;

  if p_enabled then
    insert into public.admin_role_permissions (role_id, permission_id)
    values (v_role_id, v_permission_id)
    on conflict do nothing;
  else
    delete from public.admin_role_permissions
    where role_id = v_role_id and permission_id = v_permission_id;
  end if;

  insert into public.audit_logs (
    actor_id, action, resource_type, before_data, after_data, request_id
  )
  values (
    p_actor_id,
    'moderator.permission',
    'admin_role',
    jsonb_build_object('permission', p_permission_key, 'enabled', v_was_enabled),
    jsonb_build_object('permission', p_permission_key, 'enabled', p_enabled),
    p_request_id
  );
end;
$$;

revoke all on function public.admin_set_moderator_permission(uuid, text, boolean, text) from public, anon;
grant execute on function public.admin_set_moderator_permission(uuid, text, boolean, text) to authenticated;

create or replace function public.staff_admin_update_member(
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
begin
  if auth.uid() is null then
    raise exception 'An authenticated administrator is required.'
      using errcode = '42501';
  end if;

  return public.admin_update_member(
    auth.uid(),
    p_user_id,
    p_status,
    p_role,
    p_request_id
  );
end;
$$;

revoke all on function public.staff_admin_update_member(uuid, text, text, text) from public, anon;
grant execute on function public.staff_admin_update_member(uuid, text, text, text) to authenticated;

create or replace function public.prevent_last_active_admin_removal()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_removing_access boolean := false;
  v_target_is_admin boolean;
begin
  perform pg_advisory_xact_lock(hashtext('admin_update_member'));

  if tg_table_name = 'users' then
    v_user_id := old.id;
    if tg_op = 'DELETE' then
      v_removing_access := true;
    else
      v_removing_access := old.account_status = 'active' and new.account_status <> 'active';
    end if;
  elsif tg_table_name = 'profiles' then
    v_user_id := old.id;
    if tg_op = 'DELETE' then
      v_removing_access := true;
    else
      v_removing_access := old.status = 'active' and new.status <> 'active';
    end if;
  elsif tg_table_name = 'user_roles' then
    v_user_id := old.profile_id;
    if tg_op = 'DELETE' then
      v_removing_access := old.role in ('admin', 'super_admin');
    else
      v_removing_access := old.role in ('admin', 'super_admin')
        and new.role not in ('admin', 'super_admin');
    end if;
  elsif tg_table_name = 'user_admin_roles' then
    v_user_id := old.user_id;
    if tg_op = 'DELETE' then
      v_removing_access := exists (
        select 1 from public.admin_roles
        where id = old.role_id and slug in ('admin', 'super_admin')
      );
    else
      v_removing_access := exists (
        select 1 from public.admin_roles
        where id = old.role_id and slug in ('admin', 'super_admin')
      ) and not exists (
        select 1 from public.admin_roles
        where id = new.role_id and slug in ('admin', 'super_admin')
      );
    end if;
  end if;

  if not v_removing_access then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  select
    exists (
      select 1 from public.user_roles
      where profile_id = v_user_id and role in ('admin', 'super_admin')
    )
    or exists (
      select 1
      from public.user_admin_roles uar
      join public.admin_roles ar on ar.id = uar.role_id
      where uar.user_id = v_user_id and ar.slug in ('admin', 'super_admin')
    )
  into v_target_is_admin;

  if v_target_is_admin
    and exists (
      select 1
      from public.users u
      join public.profiles p on p.id = u.id
      where u.id = v_user_id
        and u.account_status = 'active'
        and p.status = 'active'
    )
    and not exists (
      select 1
      from public.users u
      join public.profiles p on p.id = u.id
      where u.id <> v_user_id
        and u.account_status = 'active'
        and p.status = 'active'
        and (
          exists (
            select 1 from public.user_roles ur
            where ur.profile_id = u.id and ur.role in ('admin', 'super_admin')
          )
          or exists (
            select 1
            from public.user_admin_roles uar
            join public.admin_roles ar on ar.id = uar.role_id
            where uar.user_id = u.id and ar.slug in ('admin', 'super_admin')
          )
        )
    ) then
    raise exception 'At least one active administrator must remain.'
      using errcode = '23514';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_last_active_admin_removal() from public, anon, authenticated;

drop trigger if exists protect_last_active_admin_user on public.users;
create trigger protect_last_active_admin_user
before update of account_status or delete on public.users
for each row execute function public.prevent_last_active_admin_removal();

drop trigger if exists protect_last_active_admin_profile on public.profiles;
create trigger protect_last_active_admin_profile
before update of status or delete on public.profiles
for each row execute function public.prevent_last_active_admin_removal();

drop trigger if exists protect_last_active_admin_role on public.user_roles;
create trigger protect_last_active_admin_role
before update or delete on public.user_roles
for each row execute function public.prevent_last_active_admin_removal();

drop trigger if exists protect_last_active_admin_legacy_role on public.user_admin_roles;
create trigger protect_last_active_admin_legacy_role
before update or delete on public.user_admin_roles
for each row execute function public.prevent_last_active_admin_removal();

drop policy if exists "staff can insert articles" on public.articles;
create policy "staff can insert articles"
  on public.articles for insert to authenticated
  with check (
    auth.uid() = author_id
    and public.has_permission(auth.uid(), 'articles.create')
    and (status <> 'published' or public.has_permission(auth.uid(), 'articles.publish'))
  );

drop policy if exists "admins can update articles" on public.articles;
create policy "admins can update articles"
  on public.articles for update to authenticated
  using (public.has_permission(auth.uid(), 'articles.manage'))
  with check (
    public.has_permission(auth.uid(), 'articles.manage')
    and (status <> 'published' or public.has_permission(auth.uid(), 'articles.publish'))
  );

drop policy if exists "moderators can update own articles" on public.articles;
create policy "moderators can update own articles"
  on public.articles for update to authenticated
  using (
    auth.uid() = author_id
    and public.has_permission(auth.uid(), 'articles.create')
    and (status <> 'published' or public.has_permission(auth.uid(), 'articles.publish'))
  )
  with check (
    auth.uid() = author_id
    and public.has_permission(auth.uid(), 'articles.create')
    and (status <> 'published' or public.has_permission(auth.uid(), 'articles.publish'))
  );

drop policy if exists "staff can read all articles" on public.articles;
create policy "staff can read all articles"
  on public.articles for select to authenticated
  using (
    deleted_at is null
    and (
      public.has_permission(auth.uid(), 'articles.manage')
      or public.has_permission(auth.uid(), 'articles.moderate')
      or public.has_permission(auth.uid(), 'articles.create')
    )
  );

drop policy if exists "admins can delete articles" on public.articles;
create policy "admins can delete articles"
  on public.articles for delete to authenticated
  using (
    public.has_permission(auth.uid(), 'articles.manage')
    or public.has_permission(auth.uid(), 'articles.delete')
  );

drop policy if exists "moderators can delete own articles" on public.articles;
drop policy if exists "moderators can delete own drafts" on public.articles;
create policy "moderators can delete own drafts"
  on public.articles for delete to authenticated
  using (
    auth.uid() = author_id
    and status = 'draft'
    and public.has_permission(auth.uid(), 'articles.create')
  );
