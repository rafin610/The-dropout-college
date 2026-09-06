-- ============================================================================
-- ASSIGN SUPER ADMIN: ahmedrafin014@gmail.com
-- ============================================================================

-- Step 1: Get the user ID from auth.users
-- Run this first to find your user ID:
SELECT id, email FROM auth.users WHERE email = 'ahmedrafin014@gmail.com';

-- Step 2: Copy your user ID from the result above, then run this:
-- Replace YOUR_USER_ID with the actual UUID from Step 1
-- INSERT INTO public.user_admin_roles (user_id, role_id)
-- SELECT 
--   'YOUR_USER_ID',
--   (SELECT id FROM public.admin_roles WHERE slug = 'super_admin')
-- ON CONFLICT (user_id, role_id) DO NOTHING;

-- Step 3: Verify the role was assigned:
-- SELECT u.email, ar.name 
-- FROM public.user_admin_roles uar
-- JOIN auth.users u ON u.id = uar.user_id
-- JOIN public.admin_roles ar ON ar.id = uar.role_id;
