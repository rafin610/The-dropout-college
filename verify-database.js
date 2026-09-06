#!/usr/bin/env node
/**
 * Verify: Check what data was seeded into Supabase
 * Run with: node verify-database.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ddgklwyjvttjcclanism.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_WF4kNvDBQFyVkbP6Igf_wQ_WA-bYeLN';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyDatabase() {
  console.log('🔍 Verifying database content...\n');

  try {
    // 1. Check Site Settings
    console.log('📝 SITE SETTINGS:');
    const { data: settings, error: settingsError } = await supabase
      .from('site_settings')
      .select('key, value')
      .limit(5);
    
    if (settingsError) {
      console.log('   ❌ Error:', settingsError.message);
    } else {
      console.log(`   ✅ Found ${settings?.length || 0} settings`);
      settings?.slice(0, 3).forEach(s => console.log(`      - ${s.key}: ${s.value.substring(0, 50)}${s.value.length > 50 ? '...' : ''}`));
    }

    // 2. Check Site Sections
    console.log('\n📚 SITE SECTIONS:');
    const { data: sections, error: sectionsError } = await supabase
      .from('site_sections')
      .select('slug, title')
      .order('sort_order');
    
    if (sectionsError) {
      console.log('   ❌ Error:', sectionsError.message);
    } else {
      console.log(`   ✅ Found ${sections?.length || 0} sections`);
      sections?.forEach(s => console.log(`      - ${s.slug}: "${s.title}"`));
    }

    // 3. Check Social Links
    console.log('\n🔗 SOCIAL LINKS:');
    const { data: links, error: linksError } = await supabase
      .from('site_social_links')
      .select('platform, label, url, enabled')
      .order('sort_order');
    
    if (linksError) {
      console.log('   ❌ Error:', linksError.message);
    } else {
      console.log(`   ✅ Found ${links?.length || 0} social links`);
      links?.forEach(l => console.log(`      - ${l.platform}: ${l.label}${l.enabled ? ' ✓' : ' ✗'}`));
    }

    // 4. Check Categories
    console.log('\n🏷️  CATEGORIES:');
    const { data: categories, error: catsError } = await supabase
      .from('categories')
      .select('slug, name, color')
      .eq('is_active', true)
      .order('sort_order');
    
    if (catsError) {
      console.log('   ❌ Error:', catsError.message);
    } else {
      console.log(`   ✅ Found ${categories?.length || 0} categories`);
      categories?.forEach(c => console.log(`      - ${c.name} (${c.slug}) ${c.color}`));
    }

    // 5. Check Admin Roles
    console.log('\n👤 ADMIN ROLES:');
    const { data: roles, error: rolesError } = await supabase
      .from('admin_roles')
      .select('name, slug');
    
    if (rolesError) {
      console.log('   ❌ Error:', rolesError.message);
    } else {
      console.log(`   ✅ Found ${roles?.length || 0} admin roles`);
      roles?.forEach(r => console.log(`      - ${r.name} (${r.slug})`));
    }

    // 6. Check Permissions
    console.log('\n🔐 PERMISSIONS:');
    const { data: perms, error: permsError } = await supabase
      .from('permissions')
      .select('key, description');
    
    if (permsError) {
      console.log('   ❌ Error:', permsError.message);
    } else {
      console.log(`   ✅ Found ${perms?.length || 0} permissions`);
      perms?.forEach(p => console.log(`      - ${p.key}`));
    }

    // 7. Check Role-Permission Mappings
    console.log('\n🔗 ROLE-PERMISSION MAPPINGS:');
    const { data: mappings, error: mappingsError } = await supabase
      .from('admin_role_permissions')
      .select('admin_roles(name), permissions(key)')
      .limit(10);
    
    if (mappingsError) {
      console.log('   ❌ Error:', mappingsError.message);
    } else {
      console.log(`   ✅ Found ${mappings?.length || 0} role-permission mappings`);
    }

    console.log('\n✅ Database verification complete!');
    console.log('\n📊 Summary:');
    console.log(`   • Site Settings: ${settings?.length || 0}`);
    console.log(`   • Site Sections: ${sections?.length || 0}`);
    console.log(`   • Social Links: ${links?.length || 0}`);
    console.log(`   • Categories: ${categories?.length || 0}`);
    console.log(`   • Admin Roles: ${roles?.length || 0}`);
    console.log(`   • Permissions: ${perms?.length || 0}`);
    console.log(`   • Role-Permission Mappings: ${mappings?.length || 0}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyDatabase();
