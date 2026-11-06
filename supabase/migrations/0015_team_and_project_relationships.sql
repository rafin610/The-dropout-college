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

insert into public.team_members (team_id, profile_id, role)
select id, owner_id, 'owner'
from public.teams
on conflict (team_id, profile_id) do update set role = 'owner';

insert into public.project_members (project_id, profile_id, role)
select id, owner_id, 'owner'
from public.projects
on conflict (project_id, profile_id) do update set role = 'owner';
