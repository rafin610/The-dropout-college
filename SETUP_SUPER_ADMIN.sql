-- ============================================================================
-- SETUP SUPER ADMIN: Ahmed Rafin (ahmedrafin014@gmail.com)
-- Run this SQL in Supabase Dashboard > SQL Editor
-- ============================================================================

-- Your User ID: ccbd7623-0b57-4fff-9912-4b6c98d4d254

-- ============================================================================
-- STEP 1: Create Admin Roles
-- ============================================================================
INSERT INTO public.admin_roles (name, slug, description) VALUES
  ('Super Admin', 'super_admin', 'Full platform access'),
  ('Admin', 'admin', 'Manage platform content and members'),
  ('Moderator', 'moderator', 'Review and moderate community content'),
  ('Event Manager', 'event_manager', 'Create and manage events')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- STEP 2: Create Permissions
-- ============================================================================
INSERT INTO public.permissions (key, description) VALUES
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
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- STEP 3: Assign Super Admin to You
-- ============================================================================
INSERT INTO public.user_admin_roles (user_id, role_id)
SELECT 
  'ccbd7623-0b57-4fff-9912-4b6c98d4d254',  -- Your User ID
  id 
FROM public.admin_roles 
WHERE slug = 'super_admin'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 4: Verify Your Admin Status
-- ============================================================================
SELECT 
  u.username, 
  u.display_name,
  ar.name as role,
  ar.slug
FROM public.user_admin_roles uar
JOIN public.profiles u ON u.id = uar.user_id
JOIN public.admin_roles ar ON ar.id = uar.role_id
WHERE u.username = 'ahmedrafin014';

-- Expected result: Ahmed Rafin | Super Admin (super_admin)
