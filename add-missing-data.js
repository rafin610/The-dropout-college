#!/usr/bin/env node
/**
 * Add Missing Data: Categories, Admin Roles, Permissions
 */

const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ddgklwyjvttjcclanism.supabase.co';
// Try to use service role key for admin operations
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_WF4kNvDBQFyVkbP6Igf_wQ_WA-bYeLN';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addMissingData() {
  console.log('🌱 Adding missing data with proper UUIDs...\n');

  try {
    // 1. Add Categories with UUID
    console.log('🏷️  Adding categories...');
    const categories = [
      { id: uuidv4(), slug: 'learn', name: 'Learn', description: 'Build practical knowledge with guided prompts, resources, and thoughtful feedback.', icon: '✦', color: '#d8ff62', is_active: true, sort_order: 1 },
      { id: uuidv4(), slug: 'build', name: 'Build', description: 'Ship projects, prototypes, and experiments with peers who move quickly.', icon: '▣', color: '#77e7e1', is_active: true, sort_order: 2 },
      { id: uuidv4(), slug: 'connect', name: 'Connect', description: 'Find people, communities, and real opportunities for collaboration and growth.', icon: '◎', color: '#c4a4ff', is_active: true, sort_order: 3 },
    ];

    const { error: catError } = await supabase
      .from('categories')
      .insert(categories);

    if (catError) {
      console.log(`   ⚠️  ${catError.message}`);
      // Check if categories exist
      const { data: existing } = await supabase
        .from('categories')
        .select('name');
      
      if (existing && existing.length > 0) {
        console.log(`   ℹ️  Categories already exist (${existing.length} found)`);
      }
    } else {
      console.log(`   ✅ Added ${categories.length} categories`);
    }

    // 2. Add Admin Roles
    console.log('\n👤 Adding admin roles...');
    const adminRoles = [
      { name: 'Super Admin', slug: 'super_admin', description: 'Full platform access' },
      { name: 'Admin', slug: 'admin', description: 'Manage platform content and members' },
      { name: 'Moderator', slug: 'moderator', description: 'Review and moderate community content' },
      { name: 'Event Manager', slug: 'event_manager', description: 'Create and manage events' },
    ];

    const { error: rolesError } = await supabase
      .from('admin_roles')
      .insert(adminRoles);

    if (rolesError) {
      console.log(`   ⚠️  ${rolesError.message}`);
      // Check if roles exist
      const { data: existing } = await supabase
        .from('admin_roles')
        .select('name');
      
      if (existing && existing.length > 0) {
        console.log(`   ℹ️  Admin roles already exist (${existing.length} found)`);
      }
    } else {
      console.log(`   ✅ Added ${adminRoles.length} admin roles`);
    }

    // 3. Add Permissions
    console.log('\n🔐 Adding permissions...');
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

    const { error: permsError } = await supabase
      .from('permissions')
      .insert(permissions);

    if (permsError) {
      console.log(`   ⚠️  ${permsError.message}`);
      // Check if permissions exist
      const { data: existing } = await supabase
        .from('permissions')
        .select('key');
      
      if (existing && existing.length > 0) {
        console.log(`   ℹ️  Permissions already exist (${existing.length} found)`);
      }
    } else {
      console.log(`   ✅ Added ${permissions.length} permissions`);
    }

    console.log('\n✅ Database setup complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addMissingData();
