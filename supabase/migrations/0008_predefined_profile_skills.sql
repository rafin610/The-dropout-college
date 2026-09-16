-- Centralize the initial profile skill selector in the existing skills model.
alter table public.skills
  add column if not exists sort_order integer not null default 0;

update public.skills
set is_active = false
where slug in ('web-design', 'product-thinking', 'javascript', 'react', 'community-building', 'mentoring');

insert into public.skills (slug, name, is_active, sort_order) values
  ('web-development', 'Web Development', true, 10),
  ('software-development', 'Software Development', true, 20),
  ('ai-machine-learning', 'AI / Machine Learning', true, 30),
  ('python', 'Python', true, 40),
  ('cyber-security', 'Cyber Security', true, 50),
  ('data-science', 'Data Science', true, 60),
  ('ui-ux-design', 'UI/UX Design', true, 70),
  ('video-editing', 'Video Editing', true, 80),
  ('content-creation', 'Content Creation', true, 90),
  ('digital-marketing', 'Digital Marketing', true, 100),
  ('gaming-esports', 'Gaming / Esports', true, 110),
  ('writing', 'Writing', true, 120),
  ('public-speaking', 'Public Speaking', true, 130),
  ('learning-education', 'Learning / Education', true, 140),
  ('entrepreneurship-business', 'Entrepreneurship / Business', true, 150),
  ('research', 'Research', true, 160),
  ('photography', 'Photography', true, 170),
  ('music', 'Music', true, 180)
on conflict (slug) do update
set name = excluded.name,
    is_active = excluded.is_active,
    sort_order = excluded.sort_order;

create index if not exists skills_active_sort_order_idx on public.skills (is_active, sort_order, name);

drop policy if exists "active skills are readable" on public.skills;
create policy "active skills and displayed skills are readable" on public.skills
  for select using (
    is_active = true
    or exists (
      select 1
      from public.profile_skills
      where profile_skills.skill_id = skills.id
    )
  );