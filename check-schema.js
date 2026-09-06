#!/usr/bin/env node
/**
 * Verify: Check actual database schema
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ddgklwyjvttjcclanism.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_WF4kNvDBQFyVkbP6Igf_wQ_WA-bYeLN';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('🔍 Checking database schema...\n');

  try {
    // Get table info
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(100);

    if (error) {
      console.log('Direct query failed, trying alternative...\n');
      
      // Try checking if a basic table exists
      const { data: testData, error: testError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);
      
      if (testError) {
        console.log('❌ Cannot access profiles table');
      } else {
        console.log('✅ profiles table exists');
      }

      // Try site_settings with no column filter
      const { data: settingsData, error: settingsError } = await supabase
        .from('site_settings')
        .select('*')
        .limit(1);
      
      if (settingsError) {
        console.log('❌ site_settings table error:', settingsError.message);
      } else {
        console.log('✅ site_settings table exists, count:', settingsData?.length || 0);
        if (settingsData?.length > 0) {
          console.log('   First row:', settingsData[0]);
        }
      }

      return;
    }

    console.log('📊 Public tables:');
    data?.forEach(t => console.log(`   - ${t.table_name}`));

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkSchema();
