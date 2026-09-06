create table public.site_settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value text not null default '',
  type text not null default 'text' check (type in ('text', 'url', 'email', 'number', 'boolean')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.site_sections (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null default '',
  description text not null default '',
  cta_label text default '',
  cta_href text default '',
  enabled boolean not null default true,
  sort_order integer not null default 0,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.site_social_links (
  id uuid primary key default gen_random_uuid(),
  platform text unique not null,
  label text not null,
  url text not null default '',
  enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;
alter table public.site_sections enable row level security;
alter table public.site_social_links enable row level security;

create policy "site settings are readable by anyone" on public.site_settings for select using (true);
create policy "site sections are readable by anyone" on public.site_sections for select using (true);
create policy "site social links are readable by anyone" on public.site_social_links for select using (true);

create policy "admins manage site settings" on public.site_settings for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "admins manage site sections" on public.site_sections for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "admins manage social links" on public.site_social_links for all using (auth.uid() is not null) with check (auth.uid() is not null);

insert into public.site_settings (key, value, type) values
  ('site_name', 'The DropOut College', 'text'),
  ('site_description', 'A learning-focused community built around curiosity, knowledge sharing, guidance, collaboration, and personal growth.', 'text'),
  ('hero_title', 'Make your next move together.', 'text'),
  ('hero_subtitle', 'A home for the relentlessly curious', 'text'),
  ('hero_description', 'The DropOut College is a learning-focused community where people come together to learn, ask questions, share ideas, and grow with like-minded people.', 'text'),
  ('hero_cta_text', 'Join The DropOut College', 'text'),
  ('hero_cta_href', 'https://discord.gg/3xfu5TMgF', 'url'),
  ('who_we_are', 'We are creating an environment where people can come together, learn new things, ask questions, share knowledge, help each other, and grow together.', 'text'),
  ('our_aim', 'To build a positive learning culture where curiosity is encouraged, beginners feel supported, useful knowledge is shared, and members grow through guidance and collaboration.', 'text'),
  ('our_goal', 'To build a large, supportive ecosystem where anyone with the willingness to learn can find guidance, resources, people to learn with, and opportunities to share and collaborate.', 'text'),
  ('footer_text', 'The DropOut College is a learning community for curious people who want to grow together through guidance, sharing, and collaboration.', 'text'),
  ('community_invite_link', 'https://discord.gg/3xfu5TMgF', 'url'),
  ('contact_email', 'hello@thedropoutcollege.com', 'email'),
  ('contact_phone', '+1 (000) 000-0000', 'text'),
  ('discord_link', 'https://discord.gg/3xfu5TMgF', 'url'),
  ('github_link', '', 'url'),
  ('facebook_link', '', 'url'),
  ('instagram_link', '', 'url'),
  ('youtube_link', '', 'url')
  on conflict (key) do nothing;

insert into public.site_sections (slug, title, description, cta_label, cta_href, enabled, sort_order, content) values
  ('who-we-are', 'Who We Are', 'Learning-focused people building a positive environment for curiosity, guidance, and personal growth.', 'Learn more', '#who-we-are', true, 1, '{"items": ["Curiosity", "Learning", "Knowledge sharing", "Guidance", "Growth"]}'),
  ('our-aim', 'Our Aim', 'We want to create a supportive culture where people genuinely want to learn and improve together.', 'Explore the community', '/explore', true, 2, '{"items": ["Curiosity", "Beginner support", "Resource sharing", "Collaboration", "Growth"]}'),
  ('our-goal', 'Our Goal', 'We want to build a learning ecosystem where everyone can find guidance, resources, and people to learn and collaborate with.', 'Join the community', 'https://discord.gg/3xfu5TMgF', true, 3, '{"items": ["Guidance", "Resources", "Collaboration", "Motivation", "Shared learning"]}'),
  ('community-values', 'Community Values', 'The culture of The DropOut College is centered on curiosity, learning, and helping one another grow.', 'Meet the community', '/explore', true, 4, '{"cards": ["Curiosity","Learning","Sharing","Helping","Collaboration","Growth"]}'),
  ('why-join', 'Why Join Us', 'Because learning is more rewarding when it happens together with thoughtful, motivated people.', 'Join now', 'https://discord.gg/3xfu5TMgF', true, 5, '{"cards": ["People to learn with","People to ask questions","People to share with","Supportive culture"]}')
  on conflict (slug) do nothing;

insert into public.site_social_links (platform, label, url, enabled, sort_order) values
  ('discord', 'Discord', 'https://discord.gg/3xfu5TMgF', true, 1),
  ('github', 'GitHub', '', true, 2),
  ('instagram', 'Instagram', '', true, 3),
  ('facebook', 'Facebook', '', true, 4),
  ('youtube', 'YouTube', '', true, 5)
  on conflict (platform) do nothing;
