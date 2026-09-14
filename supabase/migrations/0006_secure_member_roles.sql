-- Keep role assignment server-controlled and make the existing admin role able
-- to manage the member-role selector exposed in the Control Room.

alter table public.user_roles enable row level security;

drop policy if exists "users can read their own community roles" on public.user_roles;
create policy "users can read their own community roles" on public.user_roles
  for select using (auth.uid() = profile_id);

-- There is intentionally no insert, update, or delete policy for authenticated
-- clients. Role changes go through the server route using the service-role key.

insert into public.admin_role_permissions (role_id, permission_id)
select admin_roles.id, permissions.id
from public.admin_roles
join public.permissions on permissions.key = 'roles.manage'
where admin_roles.slug = 'admin'
on conflict do nothing;

-- Useful for role-based permission checks and the member table join.
create index if not exists user_roles_profile_id_role_idx on public.user_roles (profile_id, role);
