-- ============================================================================
-- 0014_homepage_cms_and_founders.sql
-- The DropOut College — Homepage Discovery, Editorial CMS & Founder Profiles
-- ============================================================================

-- 1. Add schema compatibility columns to public.site_sections
ALTER TABLE public.site_sections 
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS description text DEFAULT '',
  ADD COLUMN IF NOT EXISTS cta_label text DEFAULT '',
  ADD COLUMN IF NOT EXISTS cta_href text DEFAULT '',
  ADD COLUMN IF NOT EXISTS enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS content jsonb DEFAULT '{}'::jsonb;

UPDATE public.site_sections SET slug = key WHERE slug IS NULL;
UPDATE public.site_sections SET enabled = is_enabled WHERE enabled IS NULL;
UPDATE public.site_sections SET content = config WHERE content IS NULL OR content = '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS site_sections_slug_idx ON public.site_sections (slug);

-- 2. Add editorial copy columns to public.site_settings
ALTER TABLE public.site_settings 
  ADD COLUMN IF NOT EXISTS hero_title text,
  ADD COLUMN IF NOT EXISTS hero_subtitle text,
  ADD COLUMN IF NOT EXISTS hero_description text,
  ADD COLUMN IF NOT EXISTS hero_badge_text text,
  ADD COLUMN IF NOT EXISTS hero_primary_cta_label text,
  ADD COLUMN IF NOT EXISTS hero_primary_cta_href text,
  ADD COLUMN IF NOT EXISTS hero_secondary_cta_label text,
  ADD COLUMN IF NOT EXISTS hero_secondary_cta_href text,
  ADD COLUMN IF NOT EXISTS who_we_are text,
  ADD COLUMN IF NOT EXISTS our_aim text,
  ADD COLUMN IF NOT EXISTS our_goal text,
  ADD COLUMN IF NOT EXISTS our_story text,
  ADD COLUMN IF NOT EXISTS our_vision text,
  ADD COLUMN IF NOT EXISTS our_mission text,
  ADD COLUMN IF NOT EXISTS our_philosophy text,
  ADD COLUMN IF NOT EXISTS discord_link text,
  ADD COLUMN IF NOT EXISTS github_link text,
  ADD COLUMN IF NOT EXISTS facebook_link text,
  ADD COLUMN IF NOT EXISTS instagram_link text,
  ADD COLUMN IF NOT EXISTS youtube_link text,
  ADD COLUMN IF NOT EXISTS contact_phone text;

-- 3. Populate default settings values on existing row
UPDATE public.site_settings SET
  hero_title = COALESCE(hero_title, 'Where relentless learners build together.'),
  hero_subtitle = COALESCE(hero_subtitle, 'The Community for Self-Driven Creators'),
  hero_description = COALESCE(hero_description, 'The DropOut College is a creative learning collective where independent developers, designers, writers, and curious builders share knowledge, ship projects, and grow together.'),
  hero_badge_text = COALESCE(hero_badge_text, 'Community Discovery'),
  hero_primary_cta_label = COALESCE(hero_primary_cta_label, 'Explore Community'),
  hero_primary_cta_href = COALESCE(hero_primary_cta_href, '/explore'),
  hero_secondary_cta_label = COALESCE(hero_secondary_cta_label, 'Explore Projects'),
  hero_secondary_cta_href = COALESCE(hero_secondary_cta_href, '/projects'),
  who_we_are = COALESCE(who_we_are, 'The DropOut College is a learning-focused community built for independent minds, self-taught builders, and curious explorers who want to master practical skills outside traditional classrooms.'),
  our_aim = COALESCE(our_aim, 'To build a positive, supportive culture where curiosity is celebrated, beginners receive real guidance, useful knowledge is shared freely, and creators ship real-world work.'),
  our_goal = COALESCE(our_goal, 'To establish a flourishing alternative learning ecosystem where anyone with the drive to learn can discover peers, exchange feedback, and collaborate on ambitious ideas.'),
  our_story = COALESCE(our_story, 'The DropOut College was founded on the belief that real competence comes from curiosity, hands-on building, and collaborative growth rather than credentials alone. We created a space where self-taught builders can share work, find guidance, and build meaningful things together.'),
  our_vision = COALESCE(our_vision, 'A world where practical skills, creative curiosity, and proof of work matter more than passive credentials — empowering independent builders everywhere.'),
  our_mission = COALESCE(our_mission, 'To provide self-directed learners with the environment, community feedback, editorial platform, and collaborative momentum needed to master modern technology and build lasting careers.'),
  our_philosophy = COALESCE(our_philosophy, 'Learning is an active pursuit, not a passive spectator sport. Build real things, share your findings, ask genuine questions, and improve continuously.'),
  discord_link = COALESCE(discord_link, community_invite_link, 'https://discord.gg/3xfu5TMgF');

-- 4. Upsert Discovery Sections
INSERT INTO public.site_sections (
  key, slug, title, description, cta_label, cta_href, is_enabled, enabled, sort_order, config, content
)
VALUES
  (
    'journal-carousel',
    'journal-carousel',
    'The DropOut Journal',
    'Ideas, technical deep dives, reflections, and field notes from builders and learners in the community.',
    'Explore All Journals',
    '/journal',
    true,
    true,
    1,
    '{"autoplay": true, "interval": 5500, "pinnedArticleIds": []}'::jsonb,
    '{"autoplay": true, "interval": 5500, "pinnedArticleIds": []}'::jsonb
  ),
  (
    'featured-projects',
    'featured-projects',
    'Featured Projects',
    'Independent platforms, tools, and creations designed and shipped by members of The DropOut College.',
    'View All Projects',
    '/projects',
    true,
    true,
    2,
    '{"pinnedProjectIds": []}'::jsonb,
    '{"pinnedProjectIds": []}'::jsonb
  ),
  (
    'featured-members',
    'featured-members',
    'Featured Creators & Members',
    'Get to know the relentlessly curious engineers, designers, and creators who make up our ecosystem.',
    'Meet the Community',
    '/members',
    true,
    true,
    3,
    '{"pinnedUserIds": []}'::jsonb,
    '{"pinnedUserIds": []}'::jsonb
  ),
  (
    'community-activity',
    'community-activity',
    'Live Community Pulse',
    'What is happening across The DropOut College right now.',
    'View All Activity',
    '/community',
    true,
    true,
    4,
    '{}'::jsonb,
    '{}'::jsonb
  ),
  (
    'community-stats',
    'community-stats',
    'Community by the Numbers',
    'Real-time metrics demonstrating our growing creative ecosystem.',
    '',
    '',
    true,
    true,
    5,
    '{}'::jsonb,
    '{}'::jsonb
  ),
  (
    'community-noticeboard',
    'community-noticeboard',
    'Noticeboard & Updates',
    'Community news, upcoming hack days, workshops, challenges, and important platform updates.',
    '',
    '',
    true,
    true,
    6,
    '{"announcements": [
      {
        "id": "notice-1",
        "title": "Welcome to the New Community Discovery Experience",
        "content": "The DropOut College has transitioned to a new editorial discovery experience highlighting real builder projects, community journals, and peer collaborations.",
        "type": "news",
        "date": "November 2026",
        "linkText": "Explore Journals",
        "linkUrl": "/journal",
        "published": true
      },
      {
        "id": "notice-2",
        "title": "DropOut Journal Writing Studio is Live",
        "content": "Share your technical journeys, lessons from building in public, and project post-mortems with the global community.",
        "type": "update",
        "date": "November 2026",
        "linkText": "Open Studio",
        "linkUrl": "/journal/studio",
        "published": true
      },
      {
        "id": "notice-3",
        "title": "Community Project Showcase Open",
        "content": "Showcase your web apps, mobile tools, hardware builds, and creative media. Receive feedback and find peer collaborators.",
        "type": "challenge",
        "date": "November 2026",
        "linkText": "Submit Project",
        "linkUrl": "/projects/new",
        "published": true
      }
    ]}'::jsonb,
    '{"announcements": [
      {
        "id": "notice-1",
        "title": "Welcome to the New Community Discovery Experience",
        "content": "The DropOut College has transitioned to a new editorial discovery experience highlighting real builder projects, community journals, and peer collaborations.",
        "type": "news",
        "date": "November 2026",
        "linkText": "Explore Journals",
        "linkUrl": "/journal",
        "published": true
      },
      {
        "id": "notice-2",
        "title": "DropOut Journal Writing Studio is Live",
        "content": "Share your technical journeys, lessons from building in public, and project post-mortems with the global community.",
        "type": "update",
        "date": "November 2026",
        "linkText": "Open Studio",
        "linkUrl": "/journal/studio",
        "published": true
      },
      {
        "id": "notice-3",
        "title": "Community Project Showcase Open",
        "content": "Showcase your web apps, mobile tools, hardware builds, and creative media. Receive feedback and find peer collaborators.",
        "type": "challenge",
        "date": "November 2026",
        "linkText": "Submit Project",
        "linkUrl": "/projects/new",
        "published": true
      }
    ]}'::jsonb
  ),
  (
    'final-cta',
    'final-cta',
    'Join The DropOut College',
    'Whether you are building your first website, designing products, or exploring deep technical domains — you do not have to learn in isolation.',
    'Join Discord Community',
    'https://discord.gg/3xfu5TMgF',
    true,
    true,
    7,
    '{}'::jsonb,
    '{}'::jsonb
  ),
  (
    'founders',
    'founders',
    'Founders & Leadership',
    'Meet the co-founders and leadership driving The DropOut College forward.',
    'Learn More About Us',
    '/about',
    true,
    true,
    8,
    '{"founders": [
      {
        "id": "ahmed-rafin",
        "name": "Ahmed Rafin",
        "role": "Co-Founder & CEO",
        "tagline": "Self-Taught Developer & AI Builder",
        "location": "Bangladesh",
        "portraitUrl": "/images/founders/ahmed-rafin.jpg",
        "bio": "Self-taught developer from Bangladesh building web products, exploring AI, and learning through real-world projects. Rather than waiting to learn everything from conventional lecture halls, Ahmed focuses on rapid prototyping, modern frontend architectures, and autonomous builder workflows.",
        "quote": "I learn best by building real things. Instead of waiting until I know everything, I build, face problems, solve them, and improve along the way.",
        "portfolioUrl": "https://ahmedrafin.netlify.app/",
        "githubUrl": "https://github.com/rafin610",
        "skills": ["React", "TypeScript", "Next.js", "Tailwind CSS", "Node.js", "Supabase", "PostgreSQL", "Local AI / Ollama", "AI-assisted Dev", "Prompt Engineering"],
        "journey": [
          {"period": "Curiosity", "title": "Breaking Things Apart", "description": "Taking apart old computer hardware and wondering what happens behind the screen whenever a button is clicked."},
          {"period": "Exploration", "title": "The Global Web", "description": "Discovering blogs, open-source communities, and realizing anyone with an internet connection can build for the world."},
          {"period": "Discipline", "title": "Esports & Team Strategy", "description": "Learning tactical coordination, rapid decision making, and leadership under intense pressure through competitive gaming."},
          {"period": "Execution", "title": "Self-Taught Coding", "description": "Mastering HTML, CSS, JavaScript, React, Supabase, and modern full-stack workflows through hands-on project creation."},
          {"period": "Acceleration", "title": "AI-Assisted Building", "description": "Integrating local LLMs, MCP servers, and agentic workflows to learn faster and build platforms like Odhyay and The DropOut College."}
        ],
        "projects": [
          {"name": "The DropOut College", "description": "Co-Founder & CEO of a community platform for self-driven learners and builders.", "tags": ["Community", "Next.js", "Supabase"], "link": "https://the-dropout-college.vercel.app/"},
          {"name": "Odhyay", "description": "Bangla digital reading platform with typography controls and offline caching.", "tags": ["React", "TypeScript", "Vite", "Tailwind"], "link": "https://odhyay.vercel.app/"},
          {"name": "DropClip", "description": "Lightweight desktop video utility built with Python and distributed via GitHub releases.", "tags": ["Python", "Desktop", "CLI"], "link": "https://github.com/nirobmia-40/DropClip"}
        ],
        "socialLinks": [
          {"platform": "github", "label": "GitHub", "url": "https://github.com/rafin610"},
          {"platform": "twitter", "label": "X", "url": "https://x.com/RafinAhmed78831"},
          {"platform": "facebook", "label": "Facebook", "url": "https://www.facebook.com/profile.php?id=100035494603229"}
        ],
        "sortOrder": 1,
        "visible": true
      },
      {
        "id": "nirob-mia",
        "name": "Nirob Mia",
        "role": "Co-Founder & CEO",
        "tagline": "Independent Learner, Digital Builder & Entrepreneur",
        "location": "Dhaka, Bangladesh",
        "portraitUrl": "/images/founders/nirob-mia.png",
        "bio": "Independent learner and creative digital builder exploring modern software, multimedia storytelling, and real-world commerce. Nirob brings practical experience from operating small businesses, producing digital video content, and engineering accessible web products.",
        "quote": "Curiosity is the foundation. Execution is the bridge. True mastery comes from building real things, making mistakes, and iterating with genuine curiosity.",
        "portfolioUrl": "https://nirob-portfolio-ten.vercel.app/",
        "githubUrl": "https://github.com/nirobmia-40",
        "skills": ["Web Development", "HTML5 & CSS3", "Tailwind CSS", "JavaScript (ES6+)", "React & Next.js", "Content Creation", "Video Storytelling", "Entrepreneurship", "Product Strategy", "E-Commerce Operations"],
        "journey": [
          {"period": "Commerce", "title": "Real-World Business Operations", "description": "Direct hands-on experience managing stationery retail operations, customer evaluation, and local supply chain logistics."},
          {"period": "Media", "title": "YouTube Content & Digital Storytelling", "description": "Exploring video pacing, visual composition, and digital communication to captivate audiences and explain concepts clearly."},
          {"period": "Code", "title": "Frontend Architecture & UI Systems", "description": "Deepening practical capabilities in modern CSS, responsive layouts, Next.js, and product prototyping."},
          {"period": "Venture", "title": "Co-Founding The DropOut College", "description": "Creating a learning environment that celebrates self-directed builders and practical real-world execution."}
        ],
        "projects": [
          {"name": "The DropOut College", "description": "Co-Founder & CEO of the alternative education ecosystem for self-taught creators.", "tags": ["Community", "Alternative Education", "Web"], "link": "https://the-dropout-college.vercel.app/"},
          {"name": "Odhyay", "description": "Digital reading platform making educational chapters and literature intuitive and accessible.", "tags": ["Next.js", "TypeScript", "Tailwind"], "link": "https://odhyay.vercel.app/"},
          {"name": "Akhra Stationary", "description": "E-commerce and stationery venture exploring physical product lines and customer experience.", "tags": ["E-Commerce", "Operations", "Branding"]},
          {"name": "Clip Cutter", "description": "Creative workflow utility for video creators to isolate highlights and prepare shorts.", "tags": ["Video Workflow", "Creative Tech"]}
        ],
        "socialLinks": [
          {"platform": "github", "label": "GitHub", "url": "https://github.com/nirobmia-40"},
          {"platform": "linkedin", "label": "LinkedIn", "url": "https://www.linkedin.com/in/nirob-mia-6a053128b/"},
          {"platform": "youtube", "label": "YouTube", "url": "https://www.youtube.com/@NirobMia-40"}
        ],
        "sortOrder": 2,
        "visible": true
      }
    ]}'::jsonb,
    '{"founders": [
      {
        "id": "ahmed-rafin",
        "name": "Ahmed Rafin",
        "role": "Co-Founder & CEO",
        "tagline": "Self-Taught Developer & AI Builder",
        "location": "Bangladesh",
        "portraitUrl": "/images/founders/ahmed-rafin.jpg",
        "bio": "Self-taught developer from Bangladesh building web products, exploring AI, and learning through real-world projects. Rather than waiting to learn everything from conventional lecture halls, Ahmed focuses on rapid prototyping, modern frontend architectures, and autonomous builder workflows.",
        "quote": "I learn best by building real things. Instead of waiting until I know everything, I build, face problems, solve them, and improve along the way.",
        "portfolioUrl": "https://ahmedrafin.netlify.app/",
        "githubUrl": "https://github.com/rafin610",
        "skills": ["React", "TypeScript", "Next.js", "Tailwind CSS", "Node.js", "Supabase", "PostgreSQL", "Local AI / Ollama", "AI-assisted Dev", "Prompt Engineering"],
        "journey": [
          {"period": "Curiosity", "title": "Breaking Things Apart", "description": "Taking apart old computer hardware and wondering what happens behind the screen whenever a button is clicked."},
          {"period": "Exploration", "title": "The Global Web", "description": "Discovering blogs, open-source communities, and realizing anyone with an internet connection can build for the world."},
          {"period": "Discipline", "title": "Esports & Team Strategy", "description": "Learning tactical coordination, rapid decision making, and leadership under intense pressure through competitive gaming."},
          {"period": "Execution", "title": "Self-Taught Coding", "description": "Mastering HTML, CSS, JavaScript, React, Supabase, and modern full-stack workflows through hands-on project creation."},
          {"period": "Acceleration", "title": "AI-Assisted Building", "description": "Integrating local LLMs, MCP servers, and agentic workflows to learn faster and build platforms like Odhyay and The DropOut College."}
        ],
        "projects": [
          {"name": "The DropOut College", "description": "Co-Founder & CEO of a community platform for self-driven learners and builders.", "tags": ["Community", "Next.js", "Supabase"], "link": "https://the-dropout-college.vercel.app/"},
          {"name": "Odhyay", "description": "Bangla digital reading platform with typography controls and offline caching.", "tags": ["React", "TypeScript", "Vite", "Tailwind"], "link": "https://odhyay.vercel.app/"},
          {"name": "DropClip", "description": "Lightweight desktop video utility built with Python and distributed via GitHub releases.", "tags": ["Python", "Desktop", "CLI"], "link": "https://github.com/nirobmia-40/DropClip"}
        ],
        "socialLinks": [
          {"platform": "github", "label": "GitHub", "url": "https://github.com/rafin610"},
          {"platform": "twitter", "label": "X", "url": "https://x.com/RafinAhmed78831"},
          {"platform": "facebook", "label": "Facebook", "url": "https://www.facebook.com/profile.php?id=100035494603229"}
        ],
        "sortOrder": 1,
        "visible": true
      },
      {
        "id": "nirob-mia",
        "name": "Nirob Mia",
        "role": "Co-Founder & CEO",
        "tagline": "Independent Learner, Digital Builder & Entrepreneur",
        "location": "Dhaka, Bangladesh",
        "portraitUrl": "/images/founders/nirob-mia.png",
        "bio": "Independent learner and creative digital builder exploring modern software, multimedia storytelling, and real-world commerce. Nirob brings practical experience from operating small businesses, producing digital video content, and engineering accessible web products.",
        "quote": "Curiosity is the foundation. Execution is the bridge. True mastery comes from building real things, making mistakes, and iterating with genuine curiosity.",
        "portfolioUrl": "https://nirob-portfolio-ten.vercel.app/",
        "githubUrl": "https://github.com/nirobmia-40",
        "skills": ["Web Development", "HTML5 & CSS3", "Tailwind CSS", "JavaScript (ES6+)", "React & Next.js", "Content Creation", "Video Storytelling", "Entrepreneurship", "Product Strategy", "E-Commerce Operations"],
        "journey": [
          {"period": "Commerce", "title": "Real-World Business Operations", "description": "Direct hands-on experience managing stationery retail operations, customer evaluation, and local supply chain logistics."},
          {"period": "Media", "title": "YouTube Content & Digital Storytelling", "description": "Exploring video pacing, visual composition, and digital communication to captivate audiences and explain concepts clearly."},
          {"period": "Code", "title": "Frontend Architecture & UI Systems", "description": "Deepening practical capabilities in modern CSS, responsive layouts, Next.js, and product prototyping."},
          {"period": "Venture", "title": "Co-Founding The DropOut College", "description": "Creating a learning environment that celebrates self-directed builders and practical real-world execution."}
        ],
        "projects": [
          {"name": "The DropOut College", "description": "Co-Founder & CEO of the alternative education ecosystem for self-taught creators.", "tags": ["Community", "Alternative Education", "Web"], "link": "https://the-dropout-college.vercel.app/"},
          {"name": "Odhyay", "description": "Digital reading platform making educational chapters and literature intuitive and accessible.", "tags": ["Next.js", "TypeScript", "Tailwind"], "link": "https://odhyay.vercel.app/"},
          {"name": "Akhra Stationary", "description": "E-commerce and stationery venture exploring physical product lines and customer experience.", "tags": ["E-Commerce", "Operations", "Branding"]},
          {"name": "Clip Cutter", "description": "Creative workflow utility for video creators to isolate highlights and prepare shorts.", "tags": ["Video Workflow", "Creative Tech"]}
        ],
        "socialLinks": [
          {"platform": "github", "label": "GitHub", "url": "https://github.com/nirobmia-40"},
          {"platform": "linkedin", "label": "LinkedIn", "url": "https://www.linkedin.com/in/nirob-mia-6a053128b/"},
          {"platform": "youtube", "label": "YouTube", "url": "https://www.youtube.com/@NirobMia-40"}
        ],
        "sortOrder": 2,
        "visible": true
      }
    ]}'::jsonb
  )
ON CONFLICT (key) DO UPDATE SET
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  config = EXCLUDED.config,
  content = EXCLUDED.content,
  updated_at = NOW();

-- 5. Stored Procedure for atomic CMS updates
CREATE OR REPLACE FUNCTION public.save_site_cms(
  p_settings jsonb,
  p_sections jsonb,
  p_social_links jsonb,
  p_announcements jsonb DEFAULT NULL,
  p_founders jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- 1. Update site_settings if p_settings is provided
  IF p_settings IS NOT NULL AND jsonb_typeof(p_settings) = 'object' THEN
    UPDATE public.site_settings
    SET
      site_name = COALESCE(p_settings->>'site_name', site_name),
      site_description = COALESCE(p_settings->>'site_description', site_description),
      hero_title = COALESCE(p_settings->>'hero_title', hero_title),
      hero_subtitle = COALESCE(p_settings->>'hero_subtitle', hero_subtitle),
      hero_description = COALESCE(p_settings->>'hero_description', hero_description),
      hero_badge_text = COALESCE(p_settings->>'hero_badge_text', hero_badge_text),
      hero_primary_cta_label = COALESCE(p_settings->>'hero_primary_cta_label', hero_primary_cta_label),
      hero_primary_cta_href = COALESCE(p_settings->>'hero_primary_cta_href', hero_primary_cta_href),
      hero_secondary_cta_label = COALESCE(p_settings->>'hero_secondary_cta_label', hero_secondary_cta_label),
      hero_secondary_cta_href = COALESCE(p_settings->>'hero_secondary_cta_href', hero_secondary_cta_href),
      who_we_are = COALESCE(p_settings->>'who_we_are', who_we_are),
      our_aim = COALESCE(p_settings->>'our_aim', our_aim),
      our_goal = COALESCE(p_settings->>'our_goal', our_goal),
      our_story = COALESCE(p_settings->>'our_story', our_story),
      our_vision = COALESCE(p_settings->>'our_vision', our_vision),
      our_mission = COALESCE(p_settings->>'our_mission', our_mission),
      our_philosophy = COALESCE(p_settings->>'our_philosophy', our_philosophy),
      footer_description = COALESCE(p_settings->>'footer_text', footer_description),
      community_invite_link = COALESCE(p_settings->>'community_invite_link', p_settings->>'discord_link', community_invite_link),
      contact_email = COALESCE(p_settings->>'contact_email', contact_email),
      contact_phone = COALESCE(p_settings->>'contact_phone', contact_phone),
      discord_link = COALESCE(p_settings->>'discord_link', p_settings->>'community_invite_link', discord_link),
      github_link = COALESCE(p_settings->>'github_link', github_link),
      facebook_link = COALESCE(p_settings->>'facebook_link', facebook_link),
      instagram_link = COALESCE(p_settings->>'instagram_link', instagram_link),
      youtube_link = COALESCE(p_settings->>'youtube_link', youtube_link),
      updated_at = NOW();
  END IF;

  -- 2. Upsert site_sections if p_sections is provided
  IF p_sections IS NOT NULL AND jsonb_typeof(p_sections) = 'array' THEN
    INSERT INTO public.site_sections (
      key, slug, title, description, cta_label, cta_href, is_enabled, enabled, sort_order, config, content, updated_at
    )
    SELECT
      sec.slug,
      sec.slug,
      COALESCE(sec.title, ''),
      COALESCE(sec.description, ''),
      COALESCE(sec.cta_label, ''),
      COALESCE(sec.cta_href, ''),
      COALESCE(sec.enabled, true),
      COALESCE(sec.enabled, true),
      COALESCE(sec.sort_order, 0),
      COALESCE(sec.content, '{}'::jsonb),
      COALESCE(sec.content, '{}'::jsonb),
      NOW()
    FROM jsonb_to_recordset(p_sections) AS sec(
      slug text,
      title text,
      description text,
      cta_label text,
      cta_href text,
      enabled boolean,
      sort_order integer,
      content jsonb
    )
    ON CONFLICT (key) DO UPDATE SET
      slug = EXCLUDED.slug,
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      cta_label = EXCLUDED.cta_label,
      cta_href = EXCLUDED.cta_href,
      is_enabled = EXCLUDED.is_enabled,
      enabled = EXCLUDED.enabled,
      sort_order = EXCLUDED.sort_order,
      config = EXCLUDED.config,
      content = EXCLUDED.content,
      updated_at = NOW();
  END IF;

  -- 3. Upsert announcements in community-noticeboard
  IF p_announcements IS NOT NULL AND jsonb_typeof(p_announcements) = 'array' THEN
    UPDATE public.site_sections
    SET
      config = jsonb_set(COALESCE(config, '{}'::jsonb), '{announcements}', p_announcements),
      content = jsonb_set(COALESCE(content, '{}'::jsonb), '{announcements}', p_announcements),
      updated_at = NOW()
    WHERE key = 'community-noticeboard' OR slug = 'community-noticeboard';
  END IF;

  -- 4. Upsert founders in founders section
  IF p_founders IS NOT NULL AND jsonb_typeof(p_founders) = 'array' THEN
    UPDATE public.site_sections
    SET
      config = jsonb_set(COALESCE(config, '{}'::jsonb), '{founders}', p_founders),
      content = jsonb_set(COALESCE(content, '{}'::jsonb), '{founders}', p_founders),
      updated_at = NOW()
    WHERE key = 'founders' OR slug = 'founders';
  END IF;

  -- 5. Upsert social links
  IF p_social_links IS NOT NULL AND jsonb_typeof(p_social_links) = 'array' THEN
    INSERT INTO public.site_social_links (
      platform, url, is_active, sort_order, updated_at
    )
    SELECT
      soc.platform,
      COALESCE(soc.url, ''),
      COALESCE(soc.enabled, true),
      COALESCE(soc.sort_order, 0),
      NOW()
    FROM jsonb_to_recordset(p_social_links) AS soc(
      platform text,
      url text,
      enabled boolean,
      sort_order integer
    )
    ON CONFLICT (platform) DO UPDATE SET
      url = EXCLUDED.url,
      is_active = EXCLUDED.is_active,
      sort_order = EXCLUDED.sort_order,
      updated_at = NOW();
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_site_cms(jsonb, jsonb, jsonb, jsonb, jsonb) TO authenticated, service_role;
