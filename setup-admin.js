#!/usr/bin/env node
/**
 * Setup Admin User: Create a test admin account
 * This creates an admin user that can access the admin panel
 * Run with: node setup-admin.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ddgklwyjvttjcclanism.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_WF4kNvDBQFyVkbP6Igf_wQ_WA-bYeLN';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupAdmin() {
  console.log('👤 Setting up admin user...\n');

  try {
    // Get current user (requires auth)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('⚠️  No authenticated user found.\n');
      console.log('To access the admin panel, you need to:');
      console.log('1. Sign up on the site: https://the-dropout-college.vercel.app/login');
      console.log('2. Then run this script while authenticated\n');
      console.log('For testing locally, you can manually assign admin roles via SQL:\n');
      console.log(`INSERT INTO public.user_admin_roles (user_id, role_id)
SELECT 
  '<YOUR_USER_ID>',
  (SELECT id FROM public.admin_roles WHERE slug = 'super_admin')
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_admin_roles 
  WHERE user_id = '<YOUR_USER_ID>'
);\n`);
      return;
    }

    console.log(`✅ Authenticated as: ${user.email}\n`);
    console.log(`📝 Assigning Super Admin role to ${user.id}...\n`);

    // Get the super admin role
    const { data: roles, error: rolesError } = await supabase
      .from('admin_roles')
      .select('id')
      .eq('slug', 'super_admin')
      .single();

    if (rolesError) {
      console.error('❌ Error fetching admin role:', rolesError.message);
      return;
    }

    // Assign the role to the user
    const { error: assignError } = await supabase
      .from('user_admin_roles')
      .upsert([
        {
          user_id: user.id,
          role_id: roles.id,
          assigned_at: new Date().toISOString(),
        }
      ], { onConflict: 'user_id,role_id' });

    if (assignError) {
      console.error('❌ Error assigning role:', assignError.message);
      return;
    }

    console.log('✅ Super Admin role assigned!\n');
    console.log(`You can now access: https://the-dropout-college.vercel.app/admin\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setupAdmin();
