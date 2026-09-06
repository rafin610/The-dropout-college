#!/usr/bin/env node
/**
 * Seed Script: Populate The DropOut College live database
 * Run with: node seed-database.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ddgklwyjvttjcclanism.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_WF4kNvDBQFyVkbP6Igf_wQ_WA-bYeLN';

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedDatabase() {
  console.log('🌱 Starting database seed...\n');

  try {
    // 1. Seed Site Settings
    console.log('📝 Seeding site settings...');
    const siteSettings = [
      { key: 'site_name', value: 'The DropOut College', type: 'text' },
      { key: 'site_description', value: 'A learning-focused community built around curiosity, knowledge sharing, guidance, collaboration, and personal growth.', type: 'text' },
      { key: 'hero_title', value: 'Make your next move together.', type: 'text' },
      { key: 'hero_subtitle', value: 'A home for the relentlessly curious', type: 'text' },
      { key: 'hero_description', value: 'The DropOut College is a learning-focused community where people come together to learn, ask questions, share ideas, and grow with like-minded people.', type: 'text' },
      { key: 'hero_cta_text', value: 'Join The DropOut College', type: 'text' },
      { key: 'hero_cta_href', value: 'https://discord.gg/3xfu5TMgF', type: 'url' },
      { key: 'who_we_are', value: 'We are creating an environment where people can come together, learn new things, ask questions, share knowledge, help each other, and grow together.', type: 'text' },
      { key: 'our_aim', value: 'To build a positive learning culture where curiosity is encouraged, beginners feel supported, useful knowledge is shared, and members grow through guidance and collaboration.', type: 'text' },
      { key: 'our_goal', value: 'To build a large, supportive ecosystem where anyone with the willingness to learn can find guidance, resources, people to learn with, and opportunities to share and collaborate.', type: 'text' },
      { key: 'footer_text', value: 'The DropOut College is a learning community for curious people who want to grow together through guidance, sharing, and collaboration.', type: 'text' },
      { key: 'community_invite_link', value: 'https://discord.gg/3xfu5TMgF', type: 'url' },
      { key: 'contact_email', value: 'hello@thedropoutcollege.com', type: 'email' },
      { key: 'discord_link', value: 'https://discord.gg/3xfu5TMgF', type: 'url' },
    ];

    for (const setting of siteSettings) {
      await supabase
        .from('site_settings')
        .upsert([setting], { onConflict: 'key' });
    }
    console.log('✅ Site settings seeded\n');

    // 2. Seed Site Sections
    console.log('📚 Seeding site sections...');
    const siteSections = [
      { slug: 'who-we-are', title: 'Who We Are', description: 'Learning-focused people building a positive environment for curiosity, guidance, and personal growth.', cta_label: 'Learn more', cta_href: '#who-we-are', enabled: true, sort_order: 1, content: { items: ['Curiosity', 'Learning', 'Knowledge sharing', 'Guidance', 'Growth'] } },
      { slug: 'our-aim', title: 'Our Aim', description: 'We want to create a supportive culture where people genuinely want to learn and improve together.', cta_label: 'Explore the community', cta_href: '/explore', enabled: true, sort_order: 2, content: { items: ['Curiosity', 'Beginner support', 'Resource sharing', 'Collaboration', 'Growth'] } },
      { slug: 'our-goal', title: 'Our Goal', description: 'We want to build a learning ecosystem where everyone can find guidance, resources, and people to learn and collaborate with.', cta_label: 'Join the community', cta_href: 'https://discord.gg/3xfu5TMgF', enabled: true, sort_order: 3, content: { items: ['Guidance', 'Resources', 'Collaboration', 'Motivation', 'Shared learning'] } },
      { slug: 'community-values', title: 'Community Values', description: 'The culture of The DropOut College is centered on curiosity, learning, and helping one another grow.', cta_label: 'Meet the community', cta_href: '/explore', enabled: true, sort_order: 4, content: { cards: ['Curiosity', 'Learning', 'Sharing', 'Helping', 'Collaboration', 'Growth'] } },
      { slug: 'why-join', title: 'Why Join Us', description: 'Because learning is more rewarding when it happens together with thoughtful, motivated people.', cta_label: 'Join now', cta_href: 'https://discord.gg/3xfu5TMgF', enabled: true, sort_order: 5, content: { cards: ['People to learn with', 'People to ask questions', 'People to share with', 'Supportive culture'] } },
    ];

    for (const section of siteSections) {
      await supabase
        .from('site_sections')
        .upsert([section], { onConflict: 'slug' });
    }
    console.log('✅ Site sections seeded\n');

    // 3. Seed Social Links
    console.log('🔗 Seeding social links...');
    const socialLinks = [
      { platform: 'discord', label: 'Discord', url: 'https://discord.gg/3xfu5TMgF', enabled: true, sort_order: 1 },
      { platform: 'github', label: 'GitHub', url: '', enabled: false, sort_order: 2 },
      { platform: 'instagram', label: 'Instagram', url: '', enabled: false, sort_order: 3 },
      { platform: 'facebook', label: 'Facebook', url: '', enabled: false, sort_order: 4 },
      { platform: 'youtube', label: 'YouTube', url: '', enabled: false, sort_order: 5 },
    ];

    for (const link of socialLinks) {
      await supabase
        .from('site_social_links')
        .upsert([link], { onConflict: 'platform' });
    }
    console.log('✅ Social links seeded\n');

    // 4. Seed Categories
    console.log('🏷️  Seeding categories...');
    const categories = [
      { id: 'cat-learn', slug: 'learn', name: 'Learn', description: 'Build practical knowledge with guided prompts, resources, and thoughtful feedback.', icon: '✦', color: '#d8ff62', is_active: true, sort_order: 1 },
      { id: 'cat-build', slug: 'build', name: 'Build', description: 'Ship projects, prototypes, and experiments with peers who move quickly.', icon: '▣', color: '#77e7e1', is_active: true, sort_order: 2 },
      { id: 'cat-connect', slug: 'connect', name: 'Connect', description: 'Find people, communities, and real opportunities for collaboration and growth.', icon: '◎', color: '#c4a4ff', is_active: true, sort_order: 3 },
    ];

    for (const cat of categories) {
      await supabase
        .from('categories')
        .upsert([cat], { onConflict: 'slug' });
    }
    console.log('✅ Categories seeded\n');

    // 5. Seed Admin Roles
    console.log('👤 Seeding admin roles and permissions...');
    const adminRoles = [
      { name: 'Super Admin', slug: 'super_admin', description: 'Full platform access' },
      { name: 'Admin', slug: 'admin', description: 'Manage platform content and members' },
      { name: 'Moderator', slug: 'moderator', description: 'Review and moderate community content' },
      { name: 'Event Manager', slug: 'event_manager', description: 'Create and manage events' },
    ];

    for (const role of adminRoles) {
      await supabase
        .from('admin_roles')
        .upsert([role], { onConflict: 'slug' });
    }

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

    for (const perm of permissions) {
      await supabase
        .from('permissions')
        .upsert([perm], { onConflict: 'key' });
    }

    console.log('✅ Admin roles and permissions seeded\n');

    console.log('🎉 Database seed complete!\n');
    console.log('Your website is now ready:');
    console.log('- ✅ Site settings populated');
    console.log('- ✅ Homepage content configured');
    console.log('- ✅ Social links set up');
    console.log('- ✅ Categories created');
    console.log('- ✅ Admin roles & permissions configured');
    console.log('\nVisit your site to see the changes take effect!');

  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    process.exit(1);
  }
}

seedDatabase();
