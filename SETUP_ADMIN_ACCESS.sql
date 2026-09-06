-- ============================================================================
-- SETUP: Admin Access for Testing
-- Run this in Supabase SQL Editor to grant admin access
-- ============================================================================

-- Step 1: View all users in the system
-- Uncomment to see who's registered:
-- SELECT id, email, created_at FROM auth.users;

-- Step 2: Assign Super Admin role to a user (replace USER_ID_HERE with actual user ID)
-- Example: INSERT INTO public.user_admin_roles (user_id, role_id)
-- SELECT 'YOUR_USER_ID_FROM_AUTH_USERS', id FROM public.admin_roles WHERE slug = 'super_admin';

-- Step 3: If you have a user already, use this query to grant them admin access:
-- Replace YOUR_USER_ID with the actual UUID from auth.users table
-- INSERT INTO public.user_admin_roles (user_id, role_id)
-- SELECT 'YOUR_USER_ID', id FROM public.admin_roles WHERE slug = 'super_admin'
-- ON CONFLICT (user_id, role_id) DO NOTHING;

-- Step 4: Verify admin was assigned
-- SELECT u.email, ar.name FROM public.user_admin_roles uar
-- JOIN auth.users u ON u.id = uar.user_id
-- JOIN public.admin_roles ar ON ar.id = uar.role_id;
