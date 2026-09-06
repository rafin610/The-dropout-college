#!/usr/bin/env node
/**
 * Check actual admin roles
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ddgklwyjvttjcclanism.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_WF4kNvDBQFyVkbP6Igf_wQ_WA-bYeLN';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('admin_roles')
    .select('*');
  
  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('Admin Roles in database:');
    console.log(JSON.stringify(data, null, 2));
  }

  const { data: perms, error: permsError } = await supabase
    .from('permissions')
    .select('*')
    .limit(5);
  
  if (permsError) {
    console.log('\nPermissions Error:', permsError.message);
  } else {
    console.log('\n\nPermissions in database (first 5):');
    console.log(JSON.stringify(perms, null, 2));
  }
}

check();
