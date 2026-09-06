-- ============================================================================
-- Seed: Sample Community Data
-- ============================================================================

-- Note: These are sample/demo records. In production, profiles and teams 
-- should be created through the app's auth/signup flow.

-- Sample Categories (if not already present)
insert into public.categories (id, slug, name, description, icon, color, is_active, sort_order) values
  ('cat-learn', 'learn', 'Learn', 'Build practical knowledge with guided prompts, resources, and thoughtful feedback.', '✦', '#d8ff62', true, 1),
  ('cat-build', 'build', 'Build', 'Ship projects, prototypes, and experiments with peers who move quickly.', '▣', '#77e7e1', true, 2),
  ('cat-connect', 'connect', 'Connect', 'Find people, communities, and real opportunities for collaboration and growth.', '◎', '#c4a4ff', true, 3)
on conflict (slug) do nothing;

-- Sample Skills
insert into public.skills (id, category_id, slug, name, is_active) values
  (gen_random_uuid(), (select id from public.categories where slug = 'learn'), 'web-design', 'Web Design', true),
  (gen_random_uuid(), (select id from public.categories where slug = 'learn'), 'product-thinking', 'Product Thinking', true),
  (gen_random_uuid(), (select id from public.categories where slug = 'build'), 'javascript', 'JavaScript', true),
  (gen_random_uuid(), (select id from public.categories where slug = 'build'), 'react', 'React', true),
  (gen_random_uuid(), (select id from public.categories where slug = 'connect'), 'community-building', 'Community Building', true),
  (gen_random_uuid(), (select id from public.categories where slug = 'connect'), 'mentoring', 'Mentoring', true)
on conflict do nothing;

-- Ensure admin_roles and permissions are set up (from migration 0002)
insert into public.admin_roles (name, slug, description) values
  ('Super Admin', 'super_admin', 'Full platform access'),
  ('Admin', 'admin', 'Manage platform content and members'),
  ('Moderator', 'moderator', 'Review and moderate community content'),
  ('Event Manager', 'event_manager', 'Create and manage events')
on conflict (slug) do nothing;

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
  ('audit_logs.read', 'Read audit logs')
on conflict (key) do nothing;

-- Connect admin roles to permissions (if not already done)
insert into public.admin_role_permissions (role_id, permission_id)
select 
  (select id from public.admin_roles where slug = 'super_admin'),
  id
from public.permissions
on conflict do nothing;

insert into public.admin_role_permissions (role_id, permission_id)
select 
  (select id from public.admin_roles where slug = 'admin'),
  id
from public.permissions
where key in ('dashboard.read', 'users.manage', 'categories.manage', 'projects.moderate', 'events.manage', 'badges.manage', 'reports.manage', 'discord.manage', 'audit_logs.read')
on conflict do nothing;

insert into public.admin_role_permissions (role_id, permission_id)
select 
  (select id from public.admin_roles where slug = 'moderator'),
  id
from public.permissions
where key in ('dashboard.read', 'projects.moderate', 'reports.manage')
on conflict do nothing;

insert into public.admin_role_permissions (role_id, permission_id)
select 
  (select id from public.admin_roles where slug = 'event_manager'),
  id
from public.permissions
where key in ('dashboard.read', 'events.manage')
on conflict do nothing;
