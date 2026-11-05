-- Real database policy/RPC tests for 0013_security_hardening.sql.
--
-- Run through scripts/test-db-security.mjs. The harness creates a throwaway
-- PostgreSQL 16 container, applies supabase/tests/bootstrap.sql, applies every
-- repository migration, re-applies 0013 to prove idempotence, then runs this
-- file with ON_ERROR_STOP.
--
-- Assertions execute as the Supabase-style roles (anon/authenticated/
-- service_role) so row-level security is actually exercised.

\set ON_ERROR_STOP on
set client_min_messages = warning;

create schema if not exists test;
grant usage on schema test to anon, authenticated, service_role;

create or replace function test.assert(p_condition boolean, p_message text)
returns void
language plpgsql
as $$
begin
  if p_condition is not true then
    raise exception 'ASSERTION FAILED: %', p_message;
  end if;
end;
$$;

-- Executes a statement as the current role and requires a specific SQLSTATE.
-- Because this function is SECURITY INVOKER, dynamic SQL still runs with the
-- caller's role and is therefore subject to RLS and column privileges.
create or replace function test.expect_error(
  p_statement text,
  p_expected_state text,
  p_message text
)
returns void
language plpgsql
as $$
begin
  begin
    execute p_statement;
  exception when others then
    if sqlstate <> p_expected_state then
      raise exception
        'ASSERTION FAILED: % (expected SQLSTATE %, got %: %)',
        p_message, p_expected_state, sqlstate, sqlerrm;
    end if;
    return;
  end;

  raise exception
    'ASSERTION FAILED: % (expected SQLSTATE %, statement succeeded)',
    p_message, p_expected_state;
end;
$$;

grant execute on function test.assert(boolean, text)
  to anon, authenticated, service_role;
grant execute on function test.expect_error(text, text, text)
  to anon, authenticated, service_role;

-- ============================================================================
-- Fixtures
-- ============================================================================

select set_config('request.jwt.claim.sub', '', false);
reset role;

-- Remove prior fixtures on re-runs. auth.users cascades to public.users and
-- then to every fixture row that hangs off a profile.
delete from auth.users
where id in (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555',
  '66666666-6666-4666-8666-666666666666',
  '77777777-7777-4777-8777-777777777777',
  '88888888-8888-4888-8888-888888888888'
);

delete from public.admin_roles
where slug in ('test_writer', 'test_publisher');

insert into public.admin_roles (id, name, slug, description) values
  (
    'a1000000-0000-4000-8000-000000000001',
    'Test Writer',
    'test_writer',
    'Test-only role with create but not publish permission'
  ),
  (
    'a1000000-0000-4000-8000-000000000002',
    'Test Publisher',
    'test_publisher',
    'Test-only role with create and publish permission'
  )
on conflict (slug) do update set name = excluded.name;

insert into public.admin_role_permissions (role_id, permission_id)
select ar.id, p.id
from public.admin_roles ar
join public.permissions p on p.key in ('articles.create')
where ar.slug = 'test_writer'
on conflict do nothing;

insert into public.admin_role_permissions (role_id, permission_id)
select ar.id, p.id
from public.admin_roles ar
join public.permissions p on p.key in ('articles.create', 'articles.publish')
where ar.slug = 'test_publisher'
on conflict do nothing;

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-4111-8111-111111111111', 'super@security.test', '{}'::jsonb),
  ('22222222-2222-4222-8222-222222222222', 'admin@security.test', '{}'::jsonb),
  ('33333333-3333-4333-8333-333333333333', 'member@security.test', '{}'::jsonb),
  ('44444444-4444-4444-8444-444444444444', 'suspended@security.test', '{}'::jsonb),
  ('55555555-5555-4555-8555-555555555555', 'other@security.test', '{}'::jsonb),
  ('66666666-6666-4666-8666-666666666666', 'writer@security.test', '{}'::jsonb),
  ('77777777-7777-4777-8777-777777777777', 'organizer@security.test', '{}'::jsonb),
  ('88888888-8888-4888-8888-888888888888', 'moderator@security.test', '{}'::jsonb)
on conflict (id) do nothing;

insert into public.users (id, email, account_status) values
  ('11111111-1111-4111-8111-111111111111', 'super@security.test', 'active'),
  ('22222222-2222-4222-8222-222222222222', 'admin@security.test', 'active'),
  ('33333333-3333-4333-8333-333333333333', 'member@security.test', 'active'),
  ('44444444-4444-4444-8444-444444444444', 'suspended@security.test', 'suspended'),
  ('55555555-5555-4555-8555-555555555555', 'other@security.test', 'active'),
  ('66666666-6666-4666-8666-666666666666', 'writer@security.test', 'active'),
  ('77777777-7777-4777-8777-777777777777', 'organizer@security.test', 'active'),
  ('88888888-8888-4888-8888-888888888888', 'moderator@security.test', 'active')
on conflict (id) do update
  set email = excluded.email,
      account_status = excluded.account_status;

insert into public.profiles (id, username, display_name, status) values
  ('11111111-1111-4111-8111-111111111111', 'sec-super', 'Security Super', 'active'),
  ('22222222-2222-4222-8222-222222222222', 'sec-admin', 'Security Admin', 'active'),
  ('33333333-3333-4333-8333-333333333333', 'sec-member', 'Security Member', 'active'),
  ('44444444-4444-4444-8444-444444444444', 'sec-suspended', 'Suspended Member', 'suspended'),
  ('55555555-5555-4555-8555-555555555555', 'sec-other', 'Other Member', 'active'),
  ('66666666-6666-4666-8666-666666666666', 'sec-writer', 'Article Writer', 'active'),
  ('77777777-7777-4777-8777-777777777777', 'sec-organizer', 'Event Organizer', 'active'),
  ('88888888-8888-4888-8888-888888888888', 'sec-moderator', 'Article Moderator', 'active')
on conflict (id) do update
  set username = excluded.username,
      display_name = excluded.display_name,
      status = excluded.status;

insert into public.user_roles (profile_id, role) values
  ('11111111-1111-4111-8111-111111111111', 'super_admin'),
  ('33333333-3333-4333-8333-333333333333', 'member'),
  ('44444444-4444-4444-8444-444444444444', 'member'),
  ('55555555-5555-4555-8555-555555555555', 'member'),
  ('66666666-6666-4666-8666-666666666666', 'member'),
  ('77777777-7777-4777-8777-777777777777', 'event_organizer'),
  ('88888888-8888-4888-8888-888888888888', 'moderator')
on conflict (profile_id, role) do nothing;

insert into public.user_admin_roles (user_id, role_id, assigned_by)
select '22222222-2222-4222-8222-222222222222'::uuid, ar.id,
       '11111111-1111-4111-8111-111111111111'::uuid
from public.admin_roles ar
where ar.slug = 'admin'
on conflict do nothing;

insert into public.user_admin_roles (user_id, role_id, assigned_by)
select '66666666-6666-4666-8666-666666666666'::uuid, ar.id,
       '11111111-1111-4111-8111-111111111111'::uuid
from public.admin_roles ar
where ar.slug = 'test_writer'
on conflict do nothing;

insert into public.projects (
  id, owner_id, name, slug, description, visibility
) values
  (
    'b1000000-0000-4000-8000-000000000001',
    '55555555-5555-4555-8555-555555555555',
    'Public Fixture',
    'security-public-fixture',
    'A public project fixture.',
    'public'
  ),
  (
    'b1000000-0000-4000-8000-000000000002',
    '55555555-5555-4555-8555-555555555555',
    'Private Fixture',
    'security-private-fixture',
    'A private project fixture.',
    'private'
  )
on conflict (id) do nothing;

insert into public.project_technologies (project_id, technology) values
  ('b1000000-0000-4000-8000-000000000001', 'TypeScript'),
  ('b1000000-0000-4000-8000-000000000002', 'SecretStack')
on conflict do nothing;

insert into public.project_links (id, project_id, label, url) values
  (
    'b2000000-0000-4000-8000-000000000001',
    'b1000000-0000-4000-8000-000000000001',
    'Demo',
    'https://example.test'
  )
on conflict (id) do nothing;

insert into public.project_upvotes (id, project_id, user_id) values
  (
    'b3000000-0000-4000-8000-000000000001',
    'b1000000-0000-4000-8000-000000000001',
    '33333333-3333-4333-8333-333333333333'
  )
on conflict do nothing;

insert into public.project_comments (id, project_id, user_id, content) values
  (
    'b4000000-0000-4000-8000-000000000001',
    'b1000000-0000-4000-8000-000000000001',
    '33333333-3333-4333-8333-333333333333',
    'A fixture comment by the member.'
  ),
  (
    'b4000000-0000-4000-8000-000000000002',
    'b1000000-0000-4000-8000-000000000001',
    '55555555-5555-4555-8555-555555555555',
    'A fixture comment by another member.'
  )
on conflict (id) do nothing;

insert into public.follows (id, follower_id, following_id) values
  (
    'b5000000-0000-4000-8000-000000000001',
    '33333333-3333-4333-8333-333333333333',
    '55555555-5555-4555-8555-555555555555'
  )
on conflict do nothing;

insert into public.notifications (
  id, profile_id, actor_id, type, title, body, resource_type, resource_id
) values
  (
    'b6000000-0000-4000-8000-000000000001',
    '33333333-3333-4333-8333-333333333333',
    '55555555-5555-4555-8555-555555555555',
    'FOLLOW',
    'New follower',
    'Fixture notification',
    'profile',
    '55555555-5555-4555-8555-555555555555'
  ),
  (
    'b6000000-0000-4000-8000-000000000002',
    '44444444-4444-4444-8444-444444444444',
    '55555555-5555-4555-8555-555555555555',
    'FOLLOW',
    'New follower',
    'Suspended member notification',
    'profile',
    '55555555-5555-4555-8555-555555555555'
  )
on conflict (id) do nothing;

insert into public.articles (
  id, title, slug, author_id, status, published_at
) values
  (
    'b7000000-0000-4000-8000-000000000001',
    'Published Fixture',
    'security-published-fixture',
    '33333333-3333-4333-8333-333333333333',
    'published',
    now()
  ),
  (
    'b7000000-0000-4000-8000-000000000002',
    'Member Draft Fixture',
    'security-member-draft-fixture',
    '33333333-3333-4333-8333-333333333333',
    'draft',
    null
  ),
  (
    'b7000000-0000-4000-8000-000000000003',
    'Other Draft Fixture',
    'security-other-draft-fixture',
    '55555555-5555-4555-8555-555555555555',
    'draft',
    null
  )
on conflict (id) do nothing;

insert into public.events (
  id, created_by, title, slug, description, event_type, starts_at, ends_at, status
) values
  (
    'b8000000-0000-4000-8000-000000000001',
    '77777777-7777-4777-8777-777777777777',
    'Published Event Fixture',
    'security-published-event',
    'A published event.',
    'online',
    now() + interval '1 day',
    now() + interval '1 day 1 hour',
    'published'
  ),
  (
    'b8000000-0000-4000-8000-000000000002',
    '77777777-7777-4777-8777-777777777777',
    'Draft Event Fixture',
    'security-draft-event',
    'A draft event.',
    'online',
    now() + interval '2 days',
    now() + interval '2 days 1 hour',
    'draft'
  )
on conflict (id) do nothing;

insert into public.team_invitations (
  id, team_id, invited_profile_id, invited_by, status, expires_at
) values
  (
    'b9000000-0000-4000-8000-000000000001',
    null,
    '33333333-3333-4333-8333-333333333333',
    '55555555-5555-4555-8555-555555555555',
    'pending',
    now() + interval '7 days'
  )
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('other-bucket', 'other-bucket', false)
on conflict (id) do nothing;

insert into storage.objects (id, bucket_id, name, owner) values
  (
    'ba000000-0000-4000-8000-000000000001',
    'project-covers',
    '55555555-5555-4555-8555-555555555555/other-cover.png',
    '55555555-5555-4555-8555-555555555555'
  )
on conflict (id) do nothing;

-- ============================================================================
-- 1. Account status and profile isolation
-- ============================================================================

begin;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
set local role authenticated;

do $$
declare
  affected integer;
begin
  perform test.assert(
    (select count(*) from public.profiles where id = '55555555-5555-4555-8555-555555555555') = 1,
    'an active member can read another active profile'
  );
  perform test.assert(
    (select count(*) from public.profiles where id = '44444444-4444-4444-8444-444444444444') = 0,
    'a suspended profile is hidden from other members'
  );
  perform test.assert(
    (select count(*) from public.users where id = '33333333-3333-4333-8333-333333333333') = 1,
    'a member can read their own account row'
  );
  perform test.assert(
    (select count(*) from public.users where id = '55555555-5555-4555-8555-555555555555') = 0,
    'a member cannot read another account row'
  );

  update public.profiles
  set display_name = 'Changed by someone else'
  where id = '55555555-5555-4555-8555-555555555555';
  get diagnostics affected = row_count;
  perform test.assert(affected = 0, 'a member cannot update another profile');

  update public.profiles
  set display_name = 'Changed by owner'
  where id = '33333333-3333-4333-8333-333333333333';
  get diagnostics affected = row_count;
  perform test.assert(affected = 1, 'a member can update their own presentation fields');

  perform test.expect_error(
    $sql$update public.profiles set status = 'suspended' where id = '33333333-3333-4333-8333-333333333333'$sql$,
    '42501',
    'a member cannot change their own profile status'
  );
  perform test.expect_error(
    $sql$update public.users set account_status = 'suspended' where id = '33333333-3333-4333-8333-333333333333'$sql$,
    '42501',
    'a member cannot change their own account status'
  );
  perform test.expect_error(
    $sql$insert into public.user_roles (profile_id, role) values ('33333333-3333-4333-8333-333333333333', 'admin')$sql$,
    '42501',
    'a member cannot grant themselves a community role'
  );
  perform test.expect_error(
    $sql$insert into public.user_admin_roles (user_id, role_id) select '33333333-3333-4333-8333-333333333333', id from public.admin_roles where slug = 'admin'$sql$,
    '42501',
    'a member cannot grant themselves an admin role'
  );
  perform test.expect_error(
    $sql$insert into public.notifications (profile_id, type, title, body) values ('55555555-5555-4555-8555-555555555555', 'FOLLOW', 'forged', 'forged')$sql$,
    '42501',
    'a member cannot insert notifications directly'
  );
  perform test.expect_error(
    $sql$insert into public.audit_logs (actor_id, action, resource_type) values ('33333333-3333-4333-8333-333333333333', 'forged', 'user')$sql$,
    '42501',
    'a member cannot write audit logs'
  );
end $$;
rollback;

begin;
select set_config('request.jwt.claim.sub', '44444444-4444-4444-8444-444444444444', true);
set local role authenticated;

do $$
declare
  affected integer;
begin
  perform test.assert(
    (select count(*) from public.profiles where id = '44444444-4444-4444-8444-444444444444') = 1,
    'a suspended member can still read their own profile'
  );
  update public.profiles
  set display_name = 'Suspended edit'
  where id = '44444444-4444-4444-8444-444444444444';
  get diagnostics affected = row_count;
  perform test.assert(affected = 0, 'a suspended member cannot update their profile');

  perform test.assert(
    public.is_active_account('44444444-4444-4444-8444-444444444444') = false,
    'the active-account helper rejects a suspended account'
  );
  perform test.assert(
    public.has_permission('44444444-4444-4444-8444-444444444444', 'dashboard.read') = false,
    'a suspended account inherits no permissions'
  );
  perform test.expect_error(
    $sql$insert into public.projects (owner_id, name, slug, description) values ('44444444-4444-4444-8444-444444444444', 'Suspended project', 'suspended-project', 'blocked')$sql$,
    '42501',
    'a suspended member cannot create a project'
  );
end $$;
rollback;

begin;
set local role anon;

do $$
begin
  perform test.assert(
    (select count(*) from public.profiles where id = '55555555-5555-4555-8555-555555555555') = 1,
    'anon can read an active public profile'
  );
  perform test.assert(
    (select count(*) from public.profiles where id = '44444444-4444-4444-8444-444444444444') = 0,
    'anon cannot read a suspended profile'
  );
  perform test.assert(
    (select count(*) from public.projects where id = 'b1000000-0000-4000-8000-000000000001') = 1,
    'anon can read a public project'
  );
  perform test.assert(
    (select count(*) from public.projects where id = 'b1000000-0000-4000-8000-000000000002') = 0,
    'anon cannot read a private project'
  );
  perform test.assert(
    (select count(*) from public.project_technologies where project_id = 'b1000000-0000-4000-8000-000000000001') = 1,
    'anon can read metadata for a public project'
  );
  perform test.assert(
    (select count(*) from public.project_technologies where project_id = 'b1000000-0000-4000-8000-000000000002') = 0,
    'anon cannot read metadata for a private project'
  );

  perform test.expect_error(
    $sql$select id from public.users$sql$,
    '42501',
    'anon has no account-table grant'
  );
  perform test.expect_error(
    $sql$insert into public.projects (owner_id, name, slug, description) values ('55555555-5555-4555-8555-555555555555', 'Anon project', 'anon-project', 'blocked')$sql$,
    '42501',
    'anon cannot create projects'
  );
end $$;
rollback;

-- ============================================================================
-- 2. Project, project metadata, and invitation ownership
-- ============================================================================

begin;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
set local role authenticated;

do $$
declare
  affected integer;
begin
  perform test.assert(
    (select count(*) from public.projects where id = 'b1000000-0000-4000-8000-000000000002') = 0,
    'a member cannot read another member private project'
  );

  insert into public.projects (id, owner_id, name, slug, description)
  values (
    'ba100000-0000-4000-8000-000000000001',
    '33333333-3333-4333-8333-333333333333',
    'Member project',
    'security-member-project',
    'Owned by the member.'
  );
  perform test.assert(
    (select count(*) from public.projects where id = 'ba100000-0000-4000-8000-000000000001') = 1,
    'a member can create a project they own'
  );

  perform test.expect_error(
    $sql$insert into public.projects (owner_id, name, slug, description) values ('55555555-5555-4555-8555-555555555555', 'Forged project', 'forged-project', 'blocked')$sql$,
    '42501',
    'a member cannot create a project for another owner'
  );

  update public.projects
  set name = 'Hijacked'
  where id = 'b1000000-0000-4000-8000-000000000001';
  get diagnostics affected = row_count;
  perform test.assert(affected = 0, 'a member cannot update another owner project');

  delete from public.projects
  where id = 'b1000000-0000-4000-8000-000000000001';
  get diagnostics affected = row_count;
  perform test.assert(affected = 0, 'a member cannot delete another owner project');

  perform test.expect_error(
    $sql$insert into public.project_technologies (project_id, technology) values ('b1000000-0000-4000-8000-000000000001', 'Injected')$sql$,
    '42501',
    'a non-owner cannot add project technology'
  );
  perform test.expect_error(
    $sql$insert into public.project_links (project_id, label, url) values ('b1000000-0000-4000-8000-000000000001', 'Injected', 'https://evil.test')$sql$,
    '42501',
    'a non-owner cannot add project links'
  );

  perform test.assert(
    (select count(*) from public.team_invitations where id = 'b9000000-0000-4000-8000-000000000001') = 1,
    'an invited member can read their invitation'
  );
  insert into public.team_invitations (
    id, team_id, invited_profile_id, invited_by, expires_at
  ) values (
    'ba200000-0000-4000-8000-000000000001',
    null,
    '55555555-5555-4555-8555-555555555555',
    '33333333-3333-4333-8333-333333333333',
    now() + interval '1 day'
  );
  perform test.assert(
    (select count(*) from public.team_invitations where id = 'ba200000-0000-4000-8000-000000000001') = 1,
    'a member can invite another member as themselves'
  );
  perform test.expect_error(
    $sql$insert into public.team_invitations (team_id, invited_profile_id, invited_by, expires_at) values (null, '55555555-5555-4555-8555-555555555555', '55555555-5555-4555-8555-555555555555', now() + interval '1 day')$sql$,
    '42501',
    'a member cannot forge an invitation from another member'
  );
end $$;
rollback;

begin;
select set_config('request.jwt.claim.sub', '55555555-5555-4555-8555-555555555555', true);
set local role authenticated;

do $$
declare
  affected integer;
begin
  perform test.assert(
    (select count(*) from public.projects where id = 'b1000000-0000-4000-8000-000000000002') = 1,
    'an owner can read their private project'
  );
  update public.projects
  set name = 'Renamed by owner'
  where id = 'b1000000-0000-4000-8000-000000000002';
  get diagnostics affected = row_count;
  perform test.assert(affected = 1, 'an owner can update their project');

  insert into public.project_technologies (project_id, technology)
  values ('b1000000-0000-4000-8000-000000000002', 'OwnerStack');
  perform test.assert(
    (select count(*) from public.project_technologies where project_id = 'b1000000-0000-4000-8000-000000000002' and technology = 'OwnerStack') = 1,
    'an owner can add technology to their project'
  );

  delete from public.projects
  where id = 'b1000000-0000-4000-8000-000000000002';
  get diagnostics affected = row_count;
  perform test.assert(affected = 1, 'an owner can delete their project');
end $$;
rollback;

begin;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
set local role authenticated;

do $$
begin
  perform test.assert(
    (select count(*) from public.team_invitations where id = 'b9000000-0000-4000-8000-000000000001') = 0,
    'an unrelated member cannot read another member invitation'
  );
end $$;
rollback;

-- ============================================================================
-- 3. Follows, upvotes, comments, and notification RPC
-- ============================================================================

begin;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
set local role authenticated;

do $$
declare
  first_id uuid;
  second_id uuid;
begin
  perform test.assert(
    (select count(*) from public.follows where follower_id = '33333333-3333-4333-8333-333333333333') = 1,
    'the member can read their own follow relationship'
  );

  insert into public.follows (follower_id, following_id)
  values ('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111');
  perform test.assert(
    (select count(*) from public.follows where follower_id = '33333333-3333-4333-8333-333333333333' and following_id = '11111111-1111-4111-8111-111111111111') = 1,
    'a member can follow another active member'
  );

  perform test.expect_error(
    $sql$insert into public.follows (follower_id, following_id) values ('33333333-3333-4333-8333-333333333333', '33333333-3333-4333-8333-333333333333')$sql$,
    '42501',
    'a member cannot follow themselves'
  );
  perform test.expect_error(
    $sql$insert into public.follows (follower_id, following_id) values ('33333333-3333-4333-8333-333333333333', '44444444-4444-4444-8444-444444444444')$sql$,
    '42501',
    'a member cannot follow a suspended account'
  );

  first_id := public.create_social_notification(
    '55555555-5555-4555-8555-555555555555', 'FOLLOW'
  );
  perform test.assert(first_id is not null, 'a follow notification is created');

  second_id := public.create_social_notification(
    '55555555-5555-4555-8555-555555555555', 'FOLLOW'
  );
  perform test.assert(
    first_id = second_id,
    'duplicate unread follow notifications are deduplicated'
  );

  perform test.expect_error(
    $sql$select public.create_social_notification('22222222-2222-4222-8222-222222222222', 'FOLLOW')$sql$,
    '42501',
    'a follow notification requires an actual follow relationship'
  );
  perform test.expect_error(
    $sql$select public.create_social_notification('55555555-5555-4555-8555-555555555555', 'MENTION')$sql$,
    '22023',
    'unsupported notification types are rejected'
  );
  perform test.expect_error(
    $sql$select public.create_social_notification('33333333-3333-4333-8333-333333333333', 'FOLLOW')$sql$,
    '42501',
    'a member cannot notify themselves'
  );

  insert into public.project_upvotes (project_id, user_id)
  values ('b1000000-0000-4000-8000-000000000001', '33333333-3333-4333-8333-333333333333')
  on conflict do nothing;
  perform test.assert(
    (select count(*) from public.project_upvotes where project_id = 'b1000000-0000-4000-8000-000000000001' and user_id = '33333333-3333-4333-8333-333333333333') = 1,
    'a member can upvote a visible project'
  );
  perform test.expect_error(
    $sql$insert into public.project_upvotes (project_id, user_id) values ('b1000000-0000-4000-8000-000000000002', '33333333-3333-4333-8333-333333333333')$sql$,
    '42501',
    'a member cannot upvote an invisible project'
  );

  perform test.assert(
    public.create_social_notification(
      '55555555-5555-4555-8555-555555555555',
      'UPVOTE',
      'b1000000-0000-4000-8000-000000000001'
    ) is not null,
    'an upvote notification is created for the project owner'
  );
  perform test.expect_error(
    $sql$select public.create_social_notification('33333333-3333-4333-8333-333333333333', 'UPVOTE', 'b1000000-0000-4000-8000-000000000001')$sql$,
    '42501',
    'an upvote notification cannot target a non-owner'
  );
  perform test.expect_error(
    $sql$select public.create_social_notification('55555555-5555-4555-8555-555555555555', 'UPVOTE', 'b1000000-0000-4000-8000-000000000002')$sql$,
    '42501',
    'an upvote notification requires an actual upvote'
  );

  insert into public.project_comments (project_id, user_id, content)
  values ('b1000000-0000-4000-8000-000000000001', '33333333-3333-4333-8333-333333333333', 'A new member comment.')
  returning id into first_id;
  perform test.assert(first_id is not null, 'a member can comment on a visible project');
  perform test.expect_error(
    $sql$insert into public.project_comments (project_id, user_id, content) values ('b1000000-0000-4000-8000-000000000002', '33333333-3333-4333-8333-333333333333', 'Blocked comment')$sql$,
    '42501',
    'a member cannot comment on an invisible project'
  );

  perform test.assert(
    public.create_social_notification(
      '55555555-5555-4555-8555-555555555555',
      'COMMENT',
      'b1000000-0000-4000-8000-000000000001',
      first_id
    ) is not null,
    'a comment notification is created for the project owner'
  );
  perform test.expect_error(
    $sql$select public.create_social_notification('55555555-5555-4555-8555-555555555555', 'COMMENT', 'b1000000-0000-4000-8000-000000000001', 'b4000000-0000-4000-8000-000000000002')$sql$,
    '42501',
    'a member cannot notify about another member comment'
  );
  perform test.expect_error(
    format(
      'select public.create_social_notification(%L, %L, %L, %L)',
      '55555555-5555-4555-8555-555555555555',
      'COMMENT',
      'b1000000-0000-4000-8000-000000000002',
      first_id
    ),
    '22023',
    'a comment notification must use the comment own project'
  );
  perform test.expect_error(
    format(
      'select public.create_social_notification(%L, %L, %L, %L)',
      '33333333-3333-4333-8333-333333333333',
      'COMMENT',
      'b1000000-0000-4000-8000-000000000001',
      first_id
    ),
    '42501',
    'a comment notification cannot target a non-owner'
  );
end $$;
rollback;

begin;
select set_config('request.jwt.claim.sub', '55555555-5555-4555-8555-555555555555', true);
set local role authenticated;

do $$
declare
  affected integer;
begin
  perform test.assert(
    (select count(*) from public.notifications where id = 'b6000000-0000-4000-8000-000000000001') = 0,
    'a member cannot read another member notifications'
  );
  update public.notifications
  set read_at = now()
  where id = 'b6000000-0000-4000-8000-000000000001';
  get diagnostics affected = row_count;
  perform test.assert(affected = 0, 'a member cannot mark another member notification read');
end $$;
rollback;

begin;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
set local role authenticated;

do $$
declare
  affected integer;
begin
  perform test.assert(
    (select count(*) from public.notifications where id = 'b6000000-0000-4000-8000-000000000001') = 1,
    'a member can read their own notification'
  );
  update public.notifications
  set read_at = now()
  where id = 'b6000000-0000-4000-8000-000000000001';
  get diagnostics affected = row_count;
  perform test.assert(affected = 1, 'a member can mark their own notification read');
end $$;
rollback;

begin;
select set_config('request.jwt.claim.sub', '44444444-4444-4444-8444-444444444444', true);
set local role authenticated;

do $$
declare
  affected integer;
begin
  update public.notifications
  set read_at = now()
  where id = 'b6000000-0000-4000-8000-000000000002';
  get diagnostics affected = row_count;
  perform test.assert(affected = 0, 'a suspended member cannot update notifications');
end $$;
rollback;

begin;
set local role anon;

do $$
begin
  perform test.expect_error(
    $sql$select public.create_social_notification('55555555-5555-4555-8555-555555555555', 'FOLLOW')$sql$,
    '42501',
    'anon cannot execute the social notification RPC'
  );
end $$;
rollback;

begin;
select set_config('request.jwt.claim.sub', '44444444-4444-4444-8444-444444444444', true);
set local role authenticated;

do $$
begin
  perform test.expect_error(
    $sql$select public.create_social_notification('55555555-5555-4555-8555-555555555555', 'FOLLOW')$sql$,
    '42501',
    'a suspended account cannot execute the social notification RPC'
  );
end $$;
rollback;

-- ============================================================================
-- 4. Journal permissions and write-time trigger
-- ============================================================================

begin;
set local role anon;

do $$
begin
  perform test.assert(
    (select count(*) from public.articles where id = 'b7000000-0000-4000-8000-000000000001') = 1,
    'anon can read a published article'
  );
  perform test.assert(
    (select count(*) from public.articles where id = 'b7000000-0000-4000-8000-000000000002') = 0,
    'anon cannot read a draft article'
  );
  perform test.expect_error(
    $sql$insert into public.articles (title, slug, author_id, status) values ('Anon', 'anon-article', '55555555-5555-4555-8555-555555555555', 'draft')$sql$,
    '42501',
    'anon cannot insert an article'
  );
end $$;
rollback;

begin;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
set local role authenticated;

do $$
declare
  affected integer;
begin
  perform test.assert(
    (select count(*) from public.articles where id = 'b7000000-0000-4000-8000-000000000002') = 1,
    'an author can read their own draft'
  );
  perform test.assert(
    (select count(*) from public.articles where id = 'b7000000-0000-4000-8000-000000000003') = 0,
    'a non-staff author cannot read another draft'
  );
  perform test.expect_error(
    $sql$insert into public.articles (title, slug, author_id, status) values ('Member', 'member-article', '33333333-3333-4333-8333-333333333333', 'draft')$sql$,
    '42501',
    'a member without article permission cannot create an article'
  );
  update public.articles
  set title = 'Edited'
  where id = 'b7000000-0000-4000-8000-000000000002';
  get diagnostics affected = row_count;
  perform test.assert(affected = 0, 'a member without article permission cannot update an article');
  delete from public.articles
  where id = 'b7000000-0000-4000-8000-000000000002';
  get diagnostics affected = row_count;
  perform test.assert(affected = 0, 'a member without article permission cannot delete an article');
end $$;
rollback;

begin;
select set_config('request.jwt.claim.sub', '66666666-6666-4666-8666-666666666666', true);
set local role authenticated;

do $$
declare
  affected integer;
begin
  insert into public.articles (title, slug, author_id, status)
  values (
    'Writer draft',
    'security-writer-draft',
    '66666666-6666-4666-8666-666666666666',
    'draft'
  );

  perform test.expect_error(
    $sql$insert into public.articles (title, slug, author_id, status) values ('Published without permission', 'security-writer-published', '66666666-6666-4666-8666-666666666666', 'published')$sql$,
    '42501',
    'a writer without publish permission cannot publish on insert'
  );
  perform test.expect_error(
    $sql$insert into public.articles (title, slug, author_id, status, featured) values ('Featured without permission', 'security-writer-featured', '66666666-6666-4666-8666-666666666666', 'draft', true)$sql$,
    '42501',
    'a writer without manage permission cannot feature on insert'
  );
  perform test.expect_error(
    $sql$update public.articles set status = 'published' where slug = 'security-writer-draft'$sql$,
    '42501',
    'a writer without publish permission cannot publish an existing draft'
  );
  update public.articles
  set title = 'Hijacked'
  where id = 'b7000000-0000-4000-8000-000000000003';
  get diagnostics affected = row_count;
  perform test.assert(affected = 0, 'a writer cannot update another author draft');

  delete from public.articles
  where slug = 'security-writer-draft';
  get diagnostics affected = row_count;
  perform test.assert(affected = 1, 'a writer can delete their own draft');
end $$;
rollback;

begin;
select set_config('request.jwt.claim.sub', '88888888-8888-4888-8888-888888888888', true);
set local role authenticated;

do $$
declare
  affected integer;
begin
  insert into public.articles (title, slug, author_id, status)
  values (
    'Moderator draft',
    'security-moderator-draft',
    '88888888-8888-4888-8888-888888888888',
    'draft'
  );

  update public.articles
  set status = 'published'
  where slug = 'security-moderator-draft';
  get diagnostics affected = row_count;
  perform test.assert(affected = 1, 'a moderator with publish permission can publish their own draft');

  perform test.expect_error(
    $sql$update public.articles set featured = true where slug = 'security-moderator-draft'$sql$,
    '42501',
    'a moderator cannot feature an article'
  );

  perform test.assert(
    (select count(*) from public.articles where id = 'b7000000-0000-4000-8000-000000000003') = 1,
    'a moderator can read all drafts for moderation'
  );
  update public.articles
  set title = 'Moderated'
  where id = 'b7000000-0000-4000-8000-000000000003';
  get diagnostics affected = row_count;
  perform test.assert(affected = 0, 'a moderator cannot update another author draft');
  delete from public.articles
  where id = 'b7000000-0000-4000-8000-000000000003';
  get diagnostics affected = row_count;
  perform test.assert(affected = 0, 'a moderator cannot delete another author draft');

  insert into public.articles (title, slug, author_id, status)
  values (
    'Moderator draft to delete',
    'security-moderator-delete',
    '88888888-8888-4888-8888-888888888888',
    'draft'
  );
  delete from public.articles
  where slug = 'security-moderator-delete';
  get diagnostics affected = row_count;
  perform test.assert(affected = 1, 'a moderator can delete their own draft');
end $$;
rollback;

begin;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
set local role authenticated;

do $$
declare
  affected integer;
begin
  update public.articles
  set title = 'Admin edit'
  where id = 'b7000000-0000-4000-8000-000000000003';
  get diagnostics affected = row_count;
  perform test.assert(affected = 1, 'an admin can update any article');

  delete from public.articles
  where id = 'b7000000-0000-4000-8000-000000000001';
  get diagnostics affected = row_count;
  perform test.assert(affected = 1, 'an admin can delete a published article');

  perform test.expect_error(
    $sql$insert into public.articles (title, slug, author_id, status) values ('Forged author', 'security-forged-author', '55555555-5555-4555-8555-555555555555', 'draft')$sql$,
    '42501',
    'an admin cannot create an article under another author identity'
  );
end $$;
rollback;

begin;
select set_config('request.jwt.claim.sub', '44444444-4444-4444-8444-444444444444', true);
set local role authenticated;

do $$
begin
  perform test.expect_error(
    $sql$insert into public.articles (title, slug, author_id, status) values ('Suspended', 'security-suspended-article', '44444444-4444-4444-8444-444444444444', 'draft')$sql$,
    '42501',
    'a suspended author cannot insert an article'
  );
end $$;
rollback;

begin;
select set_config('request.jwt.claim.sub', '77777777-7777-4777-8777-777777777777', true);
set local role authenticated;

do $$
declare
  affected integer;
begin
  perform test.assert(
    (select count(*) from public.events where id = 'b8000000-0000-4000-8000-000000000002') = 1,
    'an event organizer can read their own draft event'
  );
  insert into public.events (
    created_by, title, slug, description, event_type, starts_at, ends_at, status
  ) values (
    '77777777-7777-4777-8777-777777777777',
    'Organizer draft',
    'security-organizer-draft',
    'An organizer-created draft.',
    'online',
    now() + interval '3 days',
    now() + interval '3 days 1 hour',
    'draft'
  );
  perform test.assert(
    (select count(*) from public.events where slug = 'security-organizer-draft') = 1,
    'an event organizer can create an event'
  );
  update public.events
  set title = 'Organizer edited'
  where slug = 'security-organizer-draft';
  get diagnostics affected = row_count;
  perform test.assert(affected = 1, 'an event organizer can update their own event');

  perform test.expect_error(
    $sql$insert into public.events (created_by, title, slug, description, event_type, starts_at, ends_at) values ('55555555-5555-4555-8555-555555555555', 'Forged event', 'security-forged-event', 'blocked', 'online', now(), now() + interval '1 hour')$sql$,
    '42501',
    'an event organizer cannot create an event under another identity'
  );
  delete from public.events
  where slug = 'security-organizer-draft';
  get diagnostics affected = row_count;
  perform test.assert(affected = 1, 'an event organizer can delete their own event');
end $$;
rollback;

begin;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
set local role authenticated;

do $$
declare
  affected integer;
begin
  perform test.assert(
    (select count(*) from public.events where id = 'b8000000-0000-4000-8000-000000000002') = 0,
    'a regular member cannot read a draft event'
  );
  perform test.expect_error(
    $sql$insert into public.events (created_by, title, slug, description, event_type, starts_at, ends_at) values ('33333333-3333-4333-8333-333333333333', 'Member event', 'security-member-event', 'blocked', 'online', now(), now() + interval '1 hour')$sql$,
    '42501',
    'a regular member cannot create an event'
  );
  update public.events
  set title = 'Hijacked event'
  where id = 'b8000000-0000-4000-8000-000000000001';
  get diagnostics affected = row_count;
  perform test.assert(affected = 0, 'a regular member cannot update an event');
end $$;
rollback;

begin;
set local role anon;

do $$
begin
  perform test.assert(
    (select count(*) from public.events where id = 'b8000000-0000-4000-8000-000000000001') = 1,
    'anon can read a published event'
  );
  perform test.assert(
    (select count(*) from public.events where id = 'b8000000-0000-4000-8000-000000000002') = 0,
    'anon cannot read a draft event'
  );
end $$;
rollback;

-- ============================================================================
-- 5. CMS permissions
-- ============================================================================

begin;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
set local role authenticated;

do $$
begin
  perform test.expect_error(
    $sql$insert into public.site_settings (key, value, type) values ('security_test_key', 'blocked', 'text')$sql$,
    '42501',
    'a regular member cannot change site settings'
  );
end $$;
rollback;

begin;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
set local role authenticated;

do $$
declare
  affected integer;
begin
  insert into public.site_settings (key, value, type)
  values ('security_test_key', 'allowed', 'text');
  perform test.assert(
    (select count(*) from public.site_settings where key = 'security_test_key') = 1,
    'an admin with site.manage can create a site setting'
  );
  update public.site_settings
  set value = 'updated'
  where key = 'security_test_key';
  get diagnostics affected = row_count;
  perform test.assert(affected = 1, 'an admin with site.manage can update a site setting');
end $$;
rollback;

begin;
set local role anon;

do $$
begin
  perform test.assert(
    (select count(*) from public.site_settings where key = 'site_name') = 1,
    'anon can read public site settings'
  );
  perform test.expect_error(
    $sql$insert into public.site_settings (key, value, type) values ('security_anon_key', 'blocked', 'text')$sql$,
    '42501',
    'anon cannot change site settings'
  );
end $$;
rollback;

-- ============================================================================
-- 6. Storage folder isolation
-- ============================================================================

begin;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
set local role authenticated;

do $$
declare
  affected integer;
begin
  insert into storage.objects (bucket_id, name, owner)
  values (
    'project-covers',
    '33333333-3333-4333-8333-333333333333/cover.png',
    '33333333-3333-4333-8333-333333333333'
  );
  perform test.assert(
    (select count(*) from storage.objects where bucket_id = 'project-covers' and name = '33333333-3333-4333-8333-333333333333/cover.png') = 1,
    'a member can upload a cover into their own folder'
  );
  update storage.objects
  set metadata = '{"test": true}'::jsonb
  where bucket_id = 'project-covers'
    and name = '33333333-3333-4333-8333-333333333333/cover.png';
  get diagnostics affected = row_count;
  perform test.assert(affected = 1, 'a member can update a cover in their own folder');

  perform test.expect_error(
    $sql$insert into storage.objects (bucket_id, name, owner) values ('project-covers', '55555555-5555-4555-8555-555555555555/stolen.png', '33333333-3333-4333-8333-333333333333')$sql$,
    '42501',
    'a member cannot upload into another member folder'
  );
  perform test.expect_error(
    $sql$insert into storage.objects (bucket_id, name, owner) values ('other-bucket', '33333333-3333-4333-8333-333333333333/cover.png', '33333333-3333-4333-8333-333333333333')$sql$,
    '42501',
    'a member cannot upload outside the project-covers bucket'
  );
  update storage.objects
  set metadata = '{"hijacked": true}'::jsonb
  where bucket_id = 'project-covers'
    and name = '55555555-5555-4555-8555-555555555555/other-cover.png';
  get diagnostics affected = row_count;
  perform test.assert(affected = 0, 'a member cannot update another member object');

  delete from storage.objects
  where bucket_id = 'project-covers'
    and name = '33333333-3333-4333-8333-333333333333/cover.png';
  get diagnostics affected = row_count;
  perform test.assert(affected = 1, 'a member can delete a cover in their own folder');
end $$;
rollback;

begin;
select set_config('request.jwt.claim.sub', '44444444-4444-4444-8444-444444444444', true);
set local role authenticated;

do $$
begin
  perform test.expect_error(
    $sql$insert into storage.objects (bucket_id, name, owner) values ('project-covers', '44444444-4444-4444-8444-444444444444/cover.png', '44444444-4444-4444-8444-444444444444')$sql$,
    '42501',
    'a suspended member cannot upload a cover'
  );
end $$;
rollback;

begin;
set local role anon;

do $$
begin
  perform test.expect_error(
    $sql$insert into storage.objects (bucket_id, name, owner) values ('project-covers', '33333333-3333-4333-8333-333333333333/anon.png', null)$sql$,
    '42501',
    'anon cannot upload a cover'
  );
end $$;
rollback;

-- ============================================================================
-- 7. Member administration RPC
-- ============================================================================

begin;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
set local role authenticated;

do $$
begin
  perform test.expect_error(
    $sql$select public.admin_update_member('22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333', null, 'mentor', 'req-1')$sql$,
    '42501',
    'the member administration RPC is service-role only'
  );
end $$;
rollback;

begin;
set local role service_role;

do $$
declare
  result jsonb;
  roles jsonb;
begin
  result := public.admin_update_member(
    '11111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333333',
    null,
    'mentor',
    'security-test-role'
  );
  roles := result -> 'roles';
  perform test.assert(
    roles @> '["mentor"]'::jsonb,
    'a super admin can change a member community role'
  );
  perform test.assert(
    (select count(*) from public.audit_logs where action = 'member.update' and resource_id = '33333333-3333-4333-8333-333333333333' and request_id = 'security-test-role') = 1,
    'member updates write an audit log'
  );

  result := public.admin_update_member(
    '11111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333333',
    'suspended',
    null,
    'security-test-suspend'
  );
  perform test.assert(
    result ->> 'accountStatus' = 'suspended',
    'a super admin can suspend a member account'
  );
  perform test.assert(
    public.is_active_account('33333333-3333-4333-8333-333333333333') = false,
    'a suspended member loses active-account status'
  );

  perform test.expect_error(
    $sql$select public.admin_update_member('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', null, 'mentor', 'security-test-hierarchy')$sql$,
    '42501',
    'a non-super admin cannot change a super admin'
  );
  perform test.expect_error(
    $sql$select public.admin_update_member('22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333', null, 'admin', 'security-test-admin-assign')$sql$,
    '42501',
    'a non-super admin cannot assign the admin role'
  );
  perform test.expect_error(
    $sql$select public.admin_update_member('11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', null, 'member', 'security-test-self')$sql$,
    '42501',
    'an administrator cannot change their own membership'
  );
  perform test.expect_error(
    $sql$select public.admin_update_member('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', 'pending', null, 'security-test-status')$sql$,
    '22023',
    'invalid member statuses are rejected'
  );
  perform test.expect_error(
    $sql$select public.admin_update_member('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', null, 'super_admin', 'security-test-role')$sql$,
    '22023',
    'invalid member roles are rejected'
  );
  perform test.expect_error(
    $sql$select public.admin_update_member('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', null, null, 'security-test-empty')$sql$,
    '22023',
    'an update requires a status or role'
  );
  perform test.expect_error(
    $sql$select public.admin_update_member('11111111-1111-4111-8111-111111111111', '99999999-9999-4999-8999-999999999999', 'active', null, 'security-test-missing')$sql$,
    'P0002',
    'a missing member returns not found'
  );
end $$;
rollback;

-- Demoting an admin must also clear the legacy user_admin_roles assignment,
-- otherwise the demoted member retains admin permissions.
begin;
set local role service_role;

do $$
declare
  affected integer;
begin
  perform test.assert(
    (select count(*) from public.user_admin_roles where user_id = '22222222-2222-4222-8222-222222222222') = 1,
    'the fixture admin has a legacy admin assignment'
  );

  perform public.admin_update_member(
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    null,
    'mentor',
    'security-test-legacy'
  );

  perform test.assert(
    (select count(*) from public.user_roles where profile_id = '22222222-2222-4222-8222-222222222222' and role = 'mentor') = 1,
    'the role change is persisted in user_roles'
  );
  perform test.assert(
    (select count(*) from public.user_admin_roles where user_id = '22222222-2222-4222-8222-222222222222') = 0,
    'the role change clears the legacy admin assignment'
  );
  perform test.assert(
    public.has_permission('22222222-2222-4222-8222-222222222222', 'users.manage') = false,
    'a demoted admin loses admin permissions'
  );

  delete from public.user_admin_roles
  where user_id = '22222222-2222-4222-8222-222222222222';
  get diagnostics affected = row_count;
end $$;
rollback;

-- A member can create teams and projects without leaving partial rows; owner
-- memberships are created by the database triggers. Visibility policies keep
-- private team/project data hidden from unrelated accounts.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);

insert into public.teams (id, owner_id, name, slug, visibility)
values (
  'c1000000-0000-4000-8000-000000000001',
  '33333333-3333-4333-8333-333333333333',
  'Private Team Fixture',
  'security-private-team-fixture',
  'private'
);

select test.assert(
  (select count(*) = 1
   from public.team_members
   where team_id = 'c1000000-0000-4000-8000-000000000001'
     and profile_id = '33333333-3333-4333-8333-333333333333'
     and role = 'owner'),
  'team creation atomically adds the owner membership'
);

insert into public.projects (id, owner_id, name, slug, description, visibility)
values (
  'c2000000-0000-4000-8000-000000000001',
  '33333333-3333-4333-8333-333333333333',
  'Members Project Fixture',
  'security-members-project-fixture',
  'A members-only project fixture.',
  'members'
);

select test.assert(
  (select count(*) = 1
   from public.project_members
   where project_id = 'c2000000-0000-4000-8000-000000000001'
     and profile_id = '33333333-3333-4333-8333-333333333333'
     and role = 'owner'),
  'project creation atomically adds the owner membership'
);

select test.expect_error(
  $sql$insert into public.teams (owner_id, name, slug, visibility) values ('55555555-5555-4555-8555-555555555555', 'Impersonated Team', 'security-impersonated-team', 'public')$sql$,
  '42501',
  'a member cannot create a team for another owner'
);

select test.expect_error(
  $sql$insert into public.team_members (team_id, profile_id, role) values ('c1000000-0000-4000-8000-000000000001', '55555555-5555-4555-8555-555555555555', 'owner')$sql$,
  '42501',
  'a team owner cannot assign ownership to another member'
);

select test.expect_error(
  $sql$select public.save_site_cms('{}'::jsonb, '[]'::jsonb, '[]'::jsonb)$sql$,
  '42501',
  'a regular member cannot update CMS content'
);
rollback;

-- A site manager saves all CMS fields in one database transaction.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);

select public.save_site_cms(
  '{"hero_title":"Persisted CMS test"}'::jsonb,
  '[{"slug":"security-cms-test","title":"CMS test","description":"Persisted section","cta_label":"","cta_href":"","enabled":true,"sort_order":100,"content":{"featuredArticleIds":["test-id"]}}]'::jsonb,
  '[{"platform":"security-test","label":"Test link","url":"https://example.test","enabled":true,"sort_order":100}]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb
);

select test.assert(
  (select value = 'Persisted CMS test' from public.site_settings where key = 'hero_title'),
  'CMS settings are persisted'
);
select test.assert(
  (select content -> 'featuredArticleIds' = '["test-id"]'::jsonb
   from public.site_sections where slug = 'security-cms-test'),
  'homepage section content is persisted'
);
select test.assert(
  (select label = 'Test link' and enabled
   from public.site_social_links where platform = 'security-test'),
  'site social links are persisted using the declared schema'
);
rollback;

select 'security_rls.sql: all assertions passed' as result;
