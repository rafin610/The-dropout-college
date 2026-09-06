#!/usr/bin/env node
/**
 * Verify: Get actual data from Supabase
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ddgklwyjvttjcclanism.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_WF4kNvDBQFyVkbP6Igf_wQ_WA-bYeLN';

const supabase = createClient(supabaseUrl, supabaseKey);

async function getActualData() {
  console.log('📊 ACTUAL DATA IN SUPABASE:\n');

  try {
    // 1. Site Settings
    console.log('📝 SITE SETTINGS:');
    const { data: settings } = await supabase.from('site_settings').select('*');
    console.log(`   Found: ${settings?.length || 0} records`);
    if (settings?.length) {
      console.log(`   Site Name: ${settings[0].site_name}`);
      console.log(`   Discord Link: ${settings[0].community_invite_link}`);
    }

    // 2. Site Sections
    console.log('\n📚 SITE SECTIONS:');
    const { data: sections } = await supabase.from('site_sections').select('*');
    console.log(`   Found: ${sections?.length || 0} records`);
    sections?.slice(0, 3).forEach(s => {
      console.log(`   - ${s.slug || s.title}: "${(s.title || '').substring(0, 40)}..."`);
    });

    // 3. Social Links
    console.log('\n🔗 SOCIAL LINKS:');
    const { data: links } = await supabase.from('site_social_links').select('*');
    console.log(`   Found: ${links?.length || 0} records`);
    links?.slice(0, 3).forEach(l => {
      console.log(`   - ${l.platform}: ${l.url || '(no URL)'}`);
    });

    // 4. Categories
    console.log('\n🏷️  CATEGORIES:');
    const { data: cats } = await supabase.from('categories').select('*');
    console.log(`   Found: ${cats?.length || 0} records`);
    cats?.slice(0, 3).forEach(c => {
      console.log(`   - ${c.name} (${c.slug})`);
    });

    // 5. Admin Roles
    console.log('\n👤 ADMIN ROLES:');
    const { data: roles } = await supabase.from('admin_roles').select('*');
    console.log(`   Found: ${roles?.length || 0} records`);
    roles?.forEach(r => {
      console.log(`   - ${r.name} (${r.slug})`);
    });

    // 6. Permissions
    console.log('\n🔐 PERMISSIONS:');
    const { data: perms } = await supabase.from('permissions').select('*');
    console.log(`   Found: ${perms?.length || 0} records`);
    perms?.slice(0, 5).forEach(p => {
      console.log(`   - ${p.key}`);
    });

    // 7. Profiles
    console.log('\n👥 PROFILES (Users):');
    const { data: profiles } = await supabase.from('profiles').select('*');
    console.log(`   Found: ${profiles?.length || 0} records`);
    profiles?.slice(0, 3).forEach(p => {
      console.log(`   - ${p.display_name} (@${p.username})`);
    });

    console.log('\n✅ All data retrieved successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

getActualData();
