create table public.admin_roles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  slug text unique not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  description text not null
);

create table public.admin_role_permissions (
  role_id uuid references public.admin_roles(id) on delete cascade,
  permission_id uuid references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table public.user_admin_roles (
  user_id uuid references public.users(id) on delete cascade,
  role_id uuid references public.admin_roles(id) on delete cascade,
  assigned_by uuid references public.users(id),
  assigned_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create table public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.users(id) on delete set null,
  resource_type text not null,
  resource_id uuid not null,
  reason text not null,
  description text,
  status text not null default 'open' check (status in ('open', 'in_review', 'resolved', 'dismissed')),
  assigned_to uuid references public.users(id) on delete set null,
  resolution text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  before_data jsonb,
  after_data jsonb,
  request_id text,
  created_at timestamptz not null default now()
);

create index user_admin_roles_user_id_idx on public.user_admin_roles(user_id);
create index moderation_reports_status_created_idx on public.moderation_reports(status, created_at desc);
create index audit_logs_resource_idx on public.audit_logs(resource_type, resource_id);
create index audit_logs_created_at_idx on public.audit_logs(created_at desc);

alter table public.admin_roles enable row level security;
alter table public.permissions enable row level security;
alter table public.admin_role_permissions enable row level security;
alter table public.user_admin_roles enable row level security;
alter table public.moderation_reports enable row level security;
alter table public.audit_logs enable row level security;

create policy "users read their admin assignments" on public.user_admin_roles for select using (auth.uid() = user_id);
create policy "authenticated users read admin role definitions" on public.admin_roles for select to authenticated using (true);
create policy "authenticated users read permission definitions" on public.permissions for select to authenticated using (true);
create policy "authenticated users read role permissions" on public.admin_role_permissions for select to authenticated using (true);

insert into public.admin_roles (name, slug, description) values
  ('Super Admin', 'super_admin', 'Full platform access'),
  ('Admin', 'admin', 'Manage platform content and members'),
  ('Moderator', 'moderator', 'Review and moderate community content'),
  ('Event Manager', 'event_manager', 'Create and manage events');

insert into public.permissions (key, description) values
  ('dashboard.read', 'View admin dashboard'),
  ('users.manage', 'Manage member accounts'),
  ('categories.manage', 'Manage categories and skills'),
  ('projects.moderate', 'Review and feature projects'),
  ('events.manage', 'Manage events and participants'),
  ('badges.manage', 'Manage and assign badges'),
  ('reports.manage', 'Resolve moderation reports'),
  ('discord.manage', 'Manage Discord integration'),
  ('roles.manage', 'Manage administrator roles'),
  ('audit_logs.read', 'Read audit logs');

insert into public.admin_role_permissions (role_id, permission_id)
select roles.id, permissions.id
from public.admin_roles roles cross join public.permissions permissions
where roles.slug = 'super_admin';

insert into public.admin_role_permissions (role_id, permission_id)
select roles.id, permissions.id
from public.admin_roles roles join public.permissions permissions on permissions.key in ('dashboard.read', 'users.manage', 'categories.manage', 'projects.moderate', 'events.manage', 'badges.manage', 'reports.manage', 'discord.manage', 'audit_logs.read')
where roles.slug = 'admin';

insert into public.admin_role_permissions (role_id, permission_id)
select roles.id, permissions.id
from public.admin_roles roles join public.permissions permissions on permissions.key in ('dashboard.read', 'projects.moderate', 'reports.manage')
where roles.slug = 'moderator';

insert into public.admin_role_permissions (role_id, permission_id)
select roles.id, permissions.id
from public.admin_roles roles join public.permissions permissions on permissions.key in ('dashboard.read', 'events.manage')
where roles.slug = 'event_manager';