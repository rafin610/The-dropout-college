-- ============================================================================
-- COMPLETE SITE SEED: All Data for The DropOut College
-- Run this in Supabase SQL Editor to populate the live database
-- ============================================================================

-- ============================================================================
-- 1. SITE SETTINGS (Homepage & Branding)
-- ============================================================================
insert into public.site_settings (key, value, type) values
  ('site_name', 'The DropOut College', 'text'),
  ('site_description', 'A learning-focused community built around curiosity, knowledge sharing, guidance, collaboration, and personal growth.', 'text'),
  ('hero_title', 'Make your next move together.', 'text'),
  ('hero_subtitle', 'A home for the relentlessly curious', 'text'),
  ('hero_description', 'The DropOut College is a learning-focused community where people come together to learn, ask questions, share ideas, and grow with like-minded people.', 'text'),
  ('hero_cta_text', 'Join The DropOut College', 'text'),
  ('hero_cta_href', 'https://discord.gg/3xfu5TMgF', 'url'),
  ('who_we_are', 'We are creating an environment where people can come together, learn new things, ask questions, share knowledge, help each other, and grow together.', 'text'),
  ('our_aim', 'To build a positive learning culture where curiosity is encouraged, beginners feel supported, useful knowledge is shared, and members grow through guidance and collaboration.', 'text'),
  ('our_goal', 'To build a large, supportive ecosystem where anyone with the willingness to learn can find guidance, resources, people to learn with, and opportunities to share and collaborate.', 'text'),
  ('footer_text', 'The DropOut College is a learning community for curious people who want to grow together through guidance, sharing, and collaboration.', 'text'),
  ('community_invite_link', 'https://discord.gg/3xfu5TMgF', 'url'),
  ('contact_email', 'hello@thedropoutcollege.com', 'email'),
  ('contact_phone', '+1 (000) 000-0000', 'text'),
  ('discord_link', 'https://discord.gg/3xfu5TMgF', 'url'),
  ('github_link', '', 'url'),
  ('facebook_link', '', 'url'),
  ('instagram_link', '', 'url'),
  ('youtube_link', '', 'url')
on conflict (key) do update set value = EXCLUDED.value;

-- ============================================================================
-- 2. SITE SECTIONS (Content Blocks)
-- ============================================================================
insert into public.site_sections (slug, title, description, cta_label, cta_href, enabled, sort_order, content) values
  ('who-we-are', 'Who We Are', 'Learning-focused people building a positive environment for curiosity, guidance, and personal growth.', 'Learn more', '#who-we-are', true, 1, '{"items": ["Curiosity", "Learning", "Knowledge sharing", "Guidance", "Growth"]}'),
  ('our-aim', 'Our Aim', 'We want to create a supportive culture where people genuinely want to learn and improve together.', 'Explore the community', '/explore', true, 2, '{"items": ["Curiosity", "Beginner support", "Resource sharing", "Collaboration", "Growth"]}'),
  ('our-goal', 'Our Goal', 'We want to build a learning ecosystem where everyone can find guidance, resources, and people to learn and collaborate with.', 'Join the community', 'https://discord.gg/3xfu5TMgF', true, 3, '{"items": ["Guidance", "Resources", "Collaboration", "Motivation", "Shared learning"]}'),
  ('community-values', 'Community Values', 'The culture of The DropOut College is centered on curiosity, learning, and helping one another grow.', 'Meet the community', '/explore', true, 4, '{"cards": ["Curiosity", "Learning", "Sharing", "Helping", "Collaboration", "Growth"]}'),
  ('why-join', 'Why Join Us', 'Because learning is more rewarding when it happens together with thoughtful, motivated people.', 'Join now', 'https://discord.gg/3xfu5TMgF', true, 5, '{"cards": ["People to learn with", "People to ask questions", "People to share with", "Supportive culture"]}')
on conflict (slug) do update set
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  cta_label = EXCLUDED.cta_label,
  cta_href = EXCLUDED.cta_href,
  content = EXCLUDED.content;

-- ============================================================================
-- 3. SOCIAL LINKS
-- ============================================================================
insert into public.site_social_links (platform, label, url, enabled, sort_order) values
  ('discord', 'Discord', 'https://discord.gg/3xfu5TMgF', true, 1),
  ('github', 'GitHub', '', true, 2),
  ('instagram', 'Instagram', '', true, 3),
  ('facebook', 'Facebook', '', true, 4),
  ('youtube', 'YouTube', '', true, 5)
on conflict (platform) do update set
  label = EXCLUDED.label,
  url = EXCLUDED.url,
  enabled = EXCLUDED.enabled;

-- ============================================================================
-- 4. CATEGORIES (Community Types)
-- ============================================================================
insert into public.categories (id, slug, name, description, icon, color, is_active, sort_order) values
  ('cat-learn', 'learn', 'Learn', 'Build practical knowledge with guided prompts, resources, and thoughtful feedback.', '✦', '#d8ff62', true, 1),
  ('cat-build', 'build', 'Build', 'Ship projects, prototypes, and experiments with peers who move quickly.', '▣', '#77e7e1', true, 2),
  ('cat-connect', 'connect', 'Connect', 'Find people, communities, and real opportunities for collaboration and growth.', '◎', '#c4a4ff', true, 3)
on conflict (slug) do nothing;

-- ============================================================================
-- 5. ADMIN SETUP (Roles & Permissions)
-- ============================================================================

-- Admin Roles
insert into public.admin_roles (name, slug, description) values
  ('Super Admin', 'super_admin', 'Full platform access'),
  ('Admin', 'admin', 'Manage platform content and members'),
  ('Moderator', 'moderator', 'Review and moderate community content'),
  ('Event Manager', 'event_manager', 'Create and manage events')
on conflict (slug) do nothing;

-- Permissions
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

-- Connect Super Admin to all permissions
insert into public.admin_role_permissions (role_id, permission_id)
select 
  (select id from public.admin_roles where slug = 'super_admin'),
  id
from public.permissions
on conflict do nothing;

-- Connect Admin to most permissions
insert into public.admin_role_permissions (role_id, permission_id)
select 
  (select id from public.admin_roles where slug = 'admin'),
  id
from public.permissions
where key in ('dashboard.read', 'users.manage', 'categories.manage', 'projects.moderate', 'events.manage', 'badges.manage', 'reports.manage', 'discord.manage', 'audit_logs.read')
on conflict do nothing;

-- Connect Moderator to moderation permissions
insert into public.admin_role_permissions (role_id, permission_id)
select 
  (select id from public.admin_roles where slug = 'moderator'),
  id
from public.permissions
where key in ('dashboard.read', 'projects.moderate', 'reports.manage')
on conflict do nothing;

-- Connect Event Manager to event permissions
insert into public.admin_role_permissions (role_id, permission_id)
select 
  (select id from public.admin_roles where slug = 'event_manager'),
  id
from public.permissions
where key in ('dashboard.read', 'events.manage')
on conflict do nothing;

-- ============================================================================
-- DONE: Database is now seeded with all site content
-- The public homepage should now display with real content
-- The admin panel has full role-based access control ready
-- ============================================================================
