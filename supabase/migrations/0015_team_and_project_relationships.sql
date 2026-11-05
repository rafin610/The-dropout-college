-- 0015: Complete team/project relationship access and create owner memberships
-- atomically. Existing project visibility remains intact; members-only projects
-- become readable to active signed-in community members.

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.project_members enable row level security;

drop policy if exists "public teams are readable" on public.teams;
create policy "public teams are readable"
  on public.teams for select
  using (visibility = 'public');

drop policy if exists "active members read member teams" on public.teams;
create policy "active members read member teams"
  on public.teams for select to authenticated
  using (
    visibility = 'members'
    and public.is_active_account(auth.uid())
  );

drop policy if exists "team owners read their teams" on public.teams;
create policy "team owners read their teams"
  on public.teams for select to authenticated
  using (owner_id = auth.uid());

drop policy if exists "active members create their teams" on public.teams;
create policy "active members create their teams"
  on public.teams for insert to authenticated
  with check (
    owner_id = auth.uid()
    and public.is_active_account(auth.uid())
  );

drop policy if exists "team owners update their teams" on public.teams;
create policy "team owners update their teams"
  on public.teams for update to authenticated
  using (owner_id = auth.uid() and public.is_active_account(auth.uid()))
  with check (owner_id = auth.uid() and public.is_active_account(auth.uid()));

drop policy if exists "team owners delete their teams" on public.teams;
create policy "team owners delete their teams"
  on public.teams for delete to authenticated
  using (owner_id = auth.uid() and public.is_active_account(auth.uid()));

drop policy if exists "visible team rosters are readable" on public.team_members;
create policy "visible team rosters are readable"
  on public.team_members for select
  using (
    auth.uid() = profile_id
    or exists (
      select 1
      from public.teams t
      where t.id = team_id
        and (
          t.visibility = 'public'
          or t.owner_id = auth.uid()
          or (
            t.visibility = 'members'
            and public.is_active_account(auth.uid())
          )
        )
    )
  );

drop policy if exists "team owners manage team members" on public.team_members;
create policy "team owners manage team members"
  on public.team_members for all to authenticated
  using (
    public.is_active_account(auth.uid())
    and exists (
      select 1 from public.teams t
      where t.id = team_id and t.owner_id = auth.uid()
    )
  )
  with check (
    public.is_active_account(auth.uid())
    and exists (
      select 1 from public.teams t
      where t.id = team_id and t.owner_id = auth.uid()
    )
    and (role <> 'owner' or profile_id = auth.uid())
  );

drop policy if exists "members can leave teams" on public.team_members;
create policy "members can leave teams"
  on public.team_members for delete to authenticated
  using (
    auth.uid() = profile_id
    and role <> 'owner'
    and public.is_active_account(auth.uid())
  );

drop policy if exists "visible project rosters are readable" on public.project_members;
create policy "visible project rosters are readable"
  on public.project_members for select
  using (
    auth.uid() = profile_id
    or exists (
      select 1
      from public.projects p
      where p.id = project_id
        and p.deleted_at is null
        and (
          p.visibility = 'public'
          or p.owner_id = auth.uid()
          or (
            p.visibility = 'members'
            and public.is_active_account(auth.uid())
          )
          or public.has_permission(auth.uid(), 'projects.moderate')
        )
    )
  );

drop policy if exists "project owners manage project members" on public.project_members;
create policy "project owners manage project members"
  on public.project_members for all to authenticated
  using (
    public.is_active_account(auth.uid())
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    public.is_active_account(auth.uid())
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "projects visible by visibility" on public.projects;
drop policy if exists "public projects are readable" on public.projects;
create policy "projects visible by visibility"
  on public.projects for select
  using (
    (visibility = 'public' and deleted_at is null)
    or (
      visibility = 'members'
      and deleted_at is null
      and public.is_active_account(auth.uid())
    )
    or auth.uid() = owner_id
    or public.has_permission(auth.uid(), 'projects.moderate')
  );

drop policy if exists "visible project technologies are readable" on public.project_technologies;
create policy "visible project technologies are readable"
  on public.project_technologies for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.deleted_at is null
        and (
          p.visibility = 'public'
          or (p.visibility = 'members' and public.is_active_account(auth.uid()))
          or p.owner_id = auth.uid()
          or public.has_permission(auth.uid(), 'projects.moderate')
        )
    )
  );

drop policy if exists "visible project links are readable" on public.project_links;
create policy "visible project links are readable"
  on public.project_links for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.deleted_at is null
        and (
          p.visibility = 'public'
          or (p.visibility = 'members' and public.is_active_account(auth.uid()))
          or p.owner_id = auth.uid()
          or public.has_permission(auth.uid(), 'projects.moderate')
        )
    )
  );

create or replace function public.add_team_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.team_members (team_id, profile_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (team_id, profile_id) do update set role = 'owner';
  return new;
end;
$$;

drop trigger if exists on_team_created_add_owner on public.teams;
create trigger on_team_created_add_owner
  after insert on public.teams
  for each row execute function public.add_team_owner_membership();

create or replace function public.add_project_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.project_members (project_id, profile_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (project_id, profile_id) do update set role = 'owner';
  return new;
end;
$$;

drop trigger if exists on_project_created_add_owner on public.projects;
create trigger on_project_created_add_owner
  after insert on public.projects
  for each row execute function public.add_project_owner_membership();

create or replace function public.save_site_cms(
  p_settings jsonb,
  p_sections jsonb,
  p_social_links jsonb,
  p_announcements jsonb default null,
  p_founders jsonb default null
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if not public.has_permission(auth.uid(), 'site.manage') then
    raise exception 'Site management permission is required.'
      using errcode = '42501';
  end if;

  if jsonb_typeof(p_settings) is distinct from 'object'
    or jsonb_typeof(p_sections) is distinct from 'array'
    or jsonb_typeof(p_social_links) is distinct from 'array'
    or (p_announcements is not null and jsonb_typeof(p_announcements) <> 'array')
    or (p_founders is not null and jsonb_typeof(p_founders) <> 'array') then
    raise exception 'Invalid website content payload.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_each(p_settings) setting
    where setting.key not in (
      'site_name', 'site_description', 'hero_title', 'hero_subtitle',
      'hero_description', 'hero_badge_text', 'hero_primary_cta_label',
      'hero_primary_cta_href', 'hero_secondary_cta_label',
      'hero_secondary_cta_href', 'hero_cta_text', 'hero_cta_href',
      'who_we_are', 'our_aim', 'our_goal', 'our_story', 'our_vision',
      'our_mission', 'our_philosophy', 'footer_text', 'community_invite_link',
      'contact_email', 'contact_phone', 'discord_link', 'github_link',
      'facebook_link', 'instagram_link', 'youtube_link'
    )
      or jsonb_typeof(setting.value) <> 'string'
  ) then
    raise exception 'Unknown or invalid website setting.'
      using errcode = '22023';
  end if;

  insert into public.site_settings (key, value, updated_at)
  select key, value, now()
  from jsonb_each_text(p_settings)
  on conflict (key) do update
    set value = excluded.value,
        updated_at = excluded.updated_at;

  insert into public.site_sections (
    slug, title, description, cta_label, cta_href, enabled, sort_order, content, updated_at
  )
  select
    section.slug,
    coalesce(section.title, ''),
    coalesce(section.description, ''),
    coalesce(section.cta_label, ''),
    coalesce(section.cta_href, ''),
    coalesce(section.enabled, true),
    coalesce(section.sort_order, 0),
    coalesce(section.content, '{}'::jsonb),
    now()
  from jsonb_to_recordset(p_sections) as section(
    slug text,
    title text,
    description text,
    cta_label text,
    cta_href text,
    enabled boolean,
    sort_order integer,
    content jsonb
  )
  on conflict (slug) do update set
    title = excluded.title,
    description = excluded.description,
    cta_label = excluded.cta_label,
    cta_href = excluded.cta_href,
    enabled = excluded.enabled,
    sort_order = excluded.sort_order,
    content = excluded.content,
    updated_at = excluded.updated_at;

  insert into public.site_social_links (
    platform, label, url, enabled, sort_order, updated_at
  )
  select
    link.platform,
    link.label,
    coalesce(link.url, ''),
    coalesce(link.enabled, true),
    coalesce(link.sort_order, 0),
    now()
  from jsonb_to_recordset(p_social_links) as link(
    platform text,
    label text,
    url text,
    enabled boolean,
    sort_order integer
  )
  on conflict (platform) do update set
    label = excluded.label,
    url = excluded.url,
    enabled = excluded.enabled,
    sort_order = excluded.sort_order,
    updated_at = excluded.updated_at;

  if p_announcements is not null then
    insert into public.site_sections (
      slug, title, description, enabled, sort_order, content
    )
    values (
      'community-noticeboard',
      'Community Noticeboard',
      'Announcements, upcoming sessions, community challenges, and alerts.',
      true,
      7,
      jsonb_build_object('announcements', p_announcements)
    )
    on conflict (slug) do update set
      content = jsonb_set(
        coalesce(site_sections.content, '{}'::jsonb),
        '{announcements}',
        excluded.content -> 'announcements',
        true
      ),
      updated_at = now();
  end if;

  if p_founders is not null then
    insert into public.site_sections (
      slug, title, description, enabled, sort_order, content
    )
    values (
      'founders',
      'Founders & Leadership',
      'Meet the co-founders and leadership driving The DropOut College forward.',
      true,
      8,
      jsonb_build_object('founders', p_founders)
    )
    on conflict (slug) do update set
      content = jsonb_set(
        coalesce(site_sections.content, '{}'::jsonb),
        '{founders}',
        excluded.content -> 'founders',
        true
      ),
      updated_at = now();
  end if;
end;
$$;

revoke all on function public.save_site_cms(jsonb, jsonb, jsonb, jsonb, jsonb) from public;
revoke all on function public.save_site_cms(jsonb, jsonb, jsonb, jsonb, jsonb) from anon;
grant execute on function public.save_site_cms(jsonb, jsonb, jsonb, jsonb, jsonb) to authenticated;

insert into public.team_members (team_id, profile_id, role)
select id, owner_id, 'owner'
from public.teams
on conflict (team_id, profile_id) do update set role = 'owner';

insert into public.project_members (project_id, profile_id, role)
select id, owner_id, 'owner'
from public.projects
on conflict (project_id, profile_id) do update set role = 'owner';
