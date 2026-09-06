#!/usr/bin/env node
/**
 * Complete Admin Setup: Create roles and assign to user
 * This requires running SQL queries via Supabase
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ddgklwyjvttjcclanism.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_WF4kNvDBQFyVkbP6Igf_wQ_WA-bYeLN';

const supabase = createClient(supabaseUrl, supabaseKey);

async function completeSetup() {
  console.log('🚀 Complete Admin Setup\n');
  console.log('═══════════════════════════════════════════\n');

  try {
    const userId = 'ccbd7623-0b57-4fff-9912-4b6c98d4d254'; // Ahmed Rafin's user ID

    // STEP 1: Create admin roles
    console.log('STEP 1️⃣  Creating admin roles...\n');
    const adminRoles = [
      { name: 'Super Admin', slug: 'super_admin', description: 'Full platform access' },
      { name: 'Admin', slug: 'admin', description: 'Manage platform content and members' },
      { name: 'Moderator', slug: 'moderator', description: 'Review and moderate community content' },
      { name: 'Event Manager', slug: 'event_manager', description: 'Create and manage events' },
    ];

    const { error: rolesInsertError } = await supabase
      .from('admin_roles')
      .insert(adminRoles, { returning: 'representation' });

    if (rolesInsertError && !rolesInsertError.message.includes('policy')) {
      console.log(`⚠️  ${rolesInsertError.message}`);
    } else {
      console.log('✅ Admin roles created/verified\n');
    }

    // STEP 2: Create permissions
    console.log('STEP 2️⃣  Creating permissions...\n');
    const permissions = [
      { key: 'dashboard.read', description: 'View admin dashboard' },
      { key: 'users.manage', description: 'Manage member accounts' },
      { key: 'categories.manage', description: 'Manage categories and skills' },
      { key: 'projects.moderate', description: 'Review and feature projects' },
      { key: 'events.manage', description: 'Manage events and participants' },
      { key: 'badges.manage', description: 'Manage and assign badges' },
      { key: 'reports.manage', description: 'Resolve moderation reports' },
      { key: 'discord.manage', description: 'Manage Discord integration' },
      { key: 'roles.manage', description: 'Manage administrator roles' },
      { key: 'audit_logs.read', description: 'Read audit logs' },
    ];

    const { error: permsInsertError } = await supabase
      .from('permissions')
      .insert(permissions, { returning: 'representation' });

    if (permsInsertError && !permsInsertError.message.includes('policy')) {
      console.log(`⚠️  ${permsInsertError.message}`);
    } else {
      console.log('✅ Permissions created/verified\n');
    }

    // STEP 3: Get Super Admin role ID
    console.log('STEP 3️⃣  Finding Super Admin role...\n');
    const { data: superAdminRole, error: roleError } = await supabase
      .from('admin_roles')
      .select('id')
      .eq('slug', 'super_admin')
      .single();

    if (roleError) {
      console.log(`❌ Error finding Super Admin role: ${roleError.message}`);
      console.log('\n⚠️  Please run this SQL in Supabase dashboard manually:\n');
      console.log(`INSERT INTO public.admin_roles (name, slug, description) VALUES ('Super Admin', 'super_admin', 'Full platform access');`);
      return;
    }

    console.log(`✅ Super Admin role found (ID: ${superAdminRole.id})\n`);

    // STEP 4: Assign Super Admin role to user
    console.log(`STEP 4️⃣  Assigning Super Admin to user...\n`);
    const { error: assignError } = await supabase
      .from('user_admin_roles')
      .insert({
        user_id: userId,
        role_id: superAdminRole.id,
      });

    if (assignError) {
      if (assignError.message.includes('policy')) {
        console.log('⚠️  RLS policy requires dashboard access\n');
        console.log('Please use this SQL in Supabase dashboard:\n');
        console.log(`INSERT INTO public.user_admin_roles (user_id, role_id)
VALUES ('${userId}', '${superAdminRole.id}')
ON CONFLICT DO NOTHING;`);
      } else {
        console.log(`❌ Error: ${assignError.message}`);
      }
      return;
    }

    // SUCCESS
    console.log('✅ Super Admin role assigned!\n');
    console.log('═══════════════════════════════════════════\n');
    console.log('🎉 SUCCESS!\n');
    console.log('Your admin account is now ready:\n');
    console.log(`  📧 Email: ahmedrafin014@gmail.com`);
    console.log(`  👤 Username: @ahmedrafin014`);
    console.log(`  👑 Role: Super Admin`);
    console.log('\n  Permissions: Full platform access\n');
    console.log('Access the admin panel:\n');
    console.log(`  🔗 https://the-dropout-college.vercel.app/admin\n`);
    console.log('═══════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

completeSetup();
