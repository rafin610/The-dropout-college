#!/usr/bin/env node
/**
 * Assign Super Admin Role to ahmedrafin014@gmail.com
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ddgklwyjvttjcclanism.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_WF4kNvDBQFyVkbP6Igf_wQ_WA-bYeLN';

const supabase = createClient(supabaseUrl, supabaseKey);

async function assignSuperAdmin() {
  console.log('👤 Assigning Super Admin role...\n');

  try {
    // Step 1: Find the user by username
    console.log('🔍 Looking for user: ahmedrafin014');
    const { data: users, error: userError } = await supabase
      .from('profiles')
      .select('id, display_name, username')
      .eq('username', 'ahmedrafin014')
      .limit(1);

    if (userError) {
      console.log('   ❌ Error finding user:', userError.message);
      return;
    }

    if (!users || users.length === 0) {
      console.log('   ❌ User not found');
      console.log('\n   Please sign up first at: https://the-dropout-college.vercel.app/login');
      console.log('   Username should be: ahmedrafin014');
      return;
    }

    const profile = users[0];
    const userId = profile.id;
    console.log(`   ✅ Found user: ${profile.display_name} (@${profile.username})`);
    console.log(`   User ID: ${userId}\n`);

    // Step 2: Check if admin roles exist
    console.log('🔐 Checking admin roles...');
    const { data: adminRoles, error: rolesError } = await supabase
      .from('admin_roles')
      .select('id, name, slug')
      .eq('slug', 'super_admin')
      .single();

    if (rolesError) {
      console.log('   ⚠️  Admin roles table not ready');
      console.log('   Please run this SQL in Supabase dashboard first:\n');
      console.log(`INSERT INTO public.admin_roles (name, slug, description) VALUES
  ('Super Admin', 'super_admin', 'Full platform access'),
  ('Admin', 'admin', 'Manage platform content and members'),
  ('Moderator', 'moderator', 'Review and moderate community content'),
  ('Event Manager', 'event_manager', 'Create and manage events');`);
      return;
    }

    console.log(`   ✅ Found Super Admin role (ID: ${adminRoles.id})\n`);

    // Step 3: Assign role to user
    console.log('🎯 Assigning Super Admin role to user...');
    const { error: assignError } = await supabase
      .from('user_admin_roles')
      .insert([
        {
          user_id: userId,
          role_id: adminRoles.id,
          assigned_at: new Date().toISOString(),
        }
      ]);

    if (assignError) {
      console.log(`   ❌ Error: ${assignError.message}`);
      return;
    }

    console.log('   ✅ Super Admin role assigned!\n');
    console.log('🎉 You can now access the admin panel:\n');
    console.log('   URL: https://the-dropout-college.vercel.app/admin');
    console.log(`   Email: ahmedrafin014@gmail.com`);
    console.log(`   Role: Super Admin`);
    console.log('\n   Permissions:');
    console.log('   ✓ View admin dashboard');
    console.log('   ✓ Manage member accounts');
    console.log('   ✓ Manage categories and skills');
    console.log('   ✓ Full platform access');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

assignSuperAdmin();
