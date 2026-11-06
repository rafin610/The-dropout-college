export type SiteSettingKey =
  | "site_name"
  | "site_description"
  | "hero_title"
  | "hero_subtitle"
  | "hero_description"
  | "hero_badge_text"
  | "hero_primary_cta_label"
  | "hero_primary_cta_href"
  | "hero_secondary_cta_label"
  | "hero_secondary_cta_href"
  | "hero_cta_text"
  | "hero_cta_href"
  | "who_we_are"
  | "our_aim"
  | "our_goal"
  | "our_story"
  | "our_vision"
  | "our_mission"
  | "our_philosophy"
  | "footer_text"
  | "community_invite_link"
  | "contact_email"
  | "contact_phone"
  | "discord_link"
  | "github_link"
  | "facebook_link"
  | "instagram_link"
  | "youtube_link";

export type SiteSettingsMap = Partial<Record<SiteSettingKey, string>>;

export const AHMED_RAFIN_PORTFOLIO_URL = "https://ahmedrafin.vercel.app/";
export const DISCORD_INVITE_URL = "https://discord.gg/rEkkzPbM4p";

export type Announcement = {
  id: string;
  title: string;
  content: string;
  type: "news" | "event" | "challenge" | "update";
  date: string;
  linkText?: string;
  linkUrl?: string;
  published: boolean;
};

export type FounderProfile = {
  id: string;
  name: string;
  role: string;
  tagline: string;
  location: string;
  portraitUrl: string;
  bio: string;
  quote: string;
  portfolioUrl: string;
  githubUrl: string;
  skills: string[];
  journey: Array<{ period: string; title: string; description: string }>;
  projects: Array<{ name: string; description: string; tags: string[]; link?: string }>;
  socialLinks?: Array<{ platform: string; label: string; url: string }>;
  sortOrder: number;
  visible: boolean;
};

export type SiteSection = {
  id?: string;
  slug: string;
  title: string;
  description: string;
  cta_label: string;
  cta_href: string;
  enabled: boolean;
  sort_order: number;
  content?: Record<string, unknown>;
};

export type SocialLink = {
  id?: string;
  platform: string;
  label: string;
  url: string;
  enabled: boolean;
  sort_order: number;
};

export const defaultFounders: FounderProfile[] = [
  {
    id: "ahmed-rafin",
    name: "Ahmed Rafin",
    role: "Co-Founder & CEO",
    tagline: "Self-Taught Developer & AI Builder",
    location: "Bangladesh",
    portraitUrl: "/images/founders/ahmed-rafin.jpg",
    bio: "Self-taught developer from Bangladesh building web products, exploring AI, and learning through real-world projects. Rather than waiting to learn everything from conventional lecture halls, Ahmed focuses on rapid prototyping, modern frontend architectures, and autonomous builder workflows.",
    quote: "I learn best by building real things. Instead of waiting until I know everything, I build, face problems, solve them, and improve along the way.",
    portfolioUrl: AHMED_RAFIN_PORTFOLIO_URL,
    githubUrl: "https://github.com/rafin610",
    skills: ["React", "TypeScript", "Next.js", "Tailwind CSS", "Node.js", "Supabase", "PostgreSQL", "Local AI / Ollama", "AI-assisted Dev", "Prompt Engineering"],
    journey: [
      { period: "Curiosity", title: "Breaking Things Apart", description: "Taking apart old computer hardware and wondering what happens behind the screen whenever a button is clicked." },
      { period: "Exploration", title: "The Global Web", description: "Discovering blogs, open-source communities, and realizing anyone with an internet connection can build for the world." },
      { period: "Discipline", title: "Esports & Team Strategy", description: "Learning tactical coordination, rapid decision making, and leadership under intense pressure through competitive gaming." },
      { period: "Execution", title: "Self-Taught Coding", description: "Mastering HTML, CSS, JavaScript, React, Supabase, and modern full-stack workflows through hands-on project creation." },
      { period: "Acceleration", title: "AI-Assisted Building", description: "Integrating local LLMs, MCP servers, and agentic workflows to learn faster and build platforms like Odhyay and The DropOut College." },
    ],
    projects: [
      { name: "The DropOut College", description: "Co-Founder & CEO of a community platform for self-driven learners and builders.", tags: ["Community", "Next.js", "Supabase"], link: "https://the-dropout-college.vercel.app/" },
      { name: "Odhyay", description: "Bangla digital reading platform with typography controls and offline caching.", tags: ["React", "TypeScript", "Vite", "Tailwind"], link: "https://odhyay.vercel.app/" },
      { name: "DropClip", description: "Lightweight desktop video utility built with Python and distributed via GitHub releases.", tags: ["Python", "Desktop", "CLI"], link: "https://github.com/nirobmia-40/DropClip" },
    ],
    socialLinks: [
      { platform: "github", label: "GitHub", url: "https://github.com/rafin610" },
      { platform: "twitter", label: "X", url: "https://x.com/RafinAhmed78831" },
      { platform: "facebook", label: "Facebook", url: "https://www.facebook.com/profile.php?id=100035494603229" },
    ],
    sortOrder: 1,
    visible: true,
  },
  {
    id: "nirob-mia",
    name: "Nirob Mia",
    role: "Co-Founder & CEO",
    tagline: "Independent Learner, Digital Builder & Entrepreneur",
    location: "Dhaka, Bangladesh",
    portraitUrl: "/images/founders/nirob-mia.png",
    bio: "Independent learner and creative digital builder exploring modern software, multimedia storytelling, and real-world commerce. Nirob brings practical experience from operating small businesses, producing digital video content, and engineering accessible web products.",
    quote: "Curiosity is the foundation. Execution is the bridge. True mastery comes from building real things, making mistakes, and iterating with genuine curiosity.",
    portfolioUrl: "https://nirob-portfolio-ten.vercel.app/",
    githubUrl: "https://github.com/nirobmia-40",
    skills: ["Web Development", "HTML5 & CSS3", "Tailwind CSS", "JavaScript (ES6+)", "React & Next.js", "Content Creation", "Video Storytelling", "Entrepreneurship", "Product Strategy", "E-Commerce Operations"],
    journey: [
      { period: "Commerce", title: "Real-World Business Operations", description: "Direct hands-on experience managing stationery retail operations, customer evaluation, and local supply chain logistics." },
      { period: "Media", title: "YouTube Content & Digital Storytelling", description: "Exploring video pacing, visual composition, and digital communication to captivate audiences and explain concepts clearly." },
      { period: "Code", title: "Frontend Architecture & UI Systems", description: "Deepening practical capabilities in modern CSS, responsive layouts, Next.js, and product prototyping." },
      { period: "Venture", title: "Co-Founding The DropOut College", description: "Creating a learning environment that celebrates self-directed builders and practical real-world execution." },
    ],
    projects: [
      { name: "The DropOut College", description: "Co-Founder & CEO of the alternative education ecosystem for self-taught creators.", tags: ["Community", "Alternative Education", "Web"], link: "https://the-dropout-college.vercel.app/" },
      { name: "Odhyay", description: "Digital reading platform making educational chapters and literature intuitive and accessible.", tags: ["Next.js", "TypeScript", "Tailwind"], link: "https://odhyay.vercel.app/" },
      { name: "Akhra Stationary", description: "E-commerce and stationery venture exploring physical product lines and customer experience.", tags: ["E-Commerce", "Operations", "Branding"] },
      { name: "Clip Cutter", description: "Creative workflow utility for video creators to isolate highlights and prepare shorts.", tags: ["Video Workflow", "Creative Tech"] },
    ],
    socialLinks: [
      { platform: "github", label: "GitHub", url: "https://github.com/nirobmia-40" },
    ],
    sortOrder: 2,
    visible: true,
  },
];

export const defaultAnnouncements: Announcement[] = [
  {
    id: "ann-1",
    title: "Welcome to The DropOut College 2.0",
    content: "We've redesigned the platform into a community discovery hub. Explore live projects, read original essays in The DropOut Journal, and connect with fellow creators.",
    type: "news",
    date: "November 2026",
    linkText: "Explore Community",
    linkUrl: "/explore",
    published: true,
  },
  {
    id: "ann-2",
    title: "The DropOut Journal Writing Studio",
    content: "Independent thinking and published knowledge. Our long-form editorial space is live for community essays, breakdowns, and technical articles.",
    type: "update",
    date: "October 2026",
    linkText: "Read Journals",
    linkUrl: "/journal",
    published: true,
  },
  {
    id: "ann-3",
    title: "Build in Public: Share Your Project",
    content: "Building something new? Upload your project, share demos, receive feedback, and find collaborators across coding, AI, and creative design.",
    type: "challenge",
    date: "Active",
    linkText: "Explore Projects",
    linkUrl: "/projects",
    published: true,
  },
];

export const defaultSiteSettings: SiteSettingsMap = {
  site_name: "The DropOut College",
  site_description: "A learning-focused community built around curiosity, knowledge sharing, guidance, collaboration, and personal growth.",
  hero_title: "Where relentless learners build together.",
  hero_subtitle: "The Community for Self-Driven Creators",
  hero_description: "The DropOut College is a creative learning collective where independent developers, designers, writers, and curious builders share knowledge, ship projects, and grow together.",
  hero_badge_text: "Discover the Community",
  hero_primary_cta_label: "Explore Community",
  hero_primary_cta_href: "/explore",
  hero_secondary_cta_label: "Explore Projects",
  hero_secondary_cta_href: "/projects",
  who_we_are: "The DropOut College is a learning-focused community built for independent minds, self-taught builders, and curious explorers who want to master practical skills outside traditional classrooms.",
  our_aim: "To build a positive, supportive culture where curiosity is celebrated, beginners receive real guidance, useful knowledge is shared freely, and creators ship real-world work.",
  our_goal: "To establish a flourishing alternative learning ecosystem where anyone with the drive to learn can discover peers, exchange feedback, and collaborate on ambitious ideas.",
  our_story: "The DropOut College was founded by self-taught builders Ahmed Rafin and Nirob Mia. Experiencing firsthand the limitations of passive lecture-based learning, they set out to create a dedicated community space where learning happens through building real products, sharing essays, and mentoring one another.",
  our_vision: "A world where practical skills, creative curiosity, and proof of work matter more than passive credentials — empowering independent builders everywhere.",
  our_mission: "To provide self-directed learners with the environment, community feedback, editorial platform, and collaborative momentum needed to master modern technology and build lasting careers.",
  our_philosophy: "Learning is active, not passive. You master coding by writing code; you master design by crafting interfaces; you master writing by publishing essays. When curious minds build together in public, growth becomes inevitable.",
  footer_text: "The DropOut College is an editorial community for curious creators who grow together through guidance, sharing, and real collaboration.",
  community_invite_link: DISCORD_INVITE_URL,
  contact_email: "hello@thedropoutcollege.com",
  contact_phone: "+1 (000) 000-0000",
  discord_link: DISCORD_INVITE_URL,
  github_link: "https://github.com/rafin610/The-dropout-college",
  facebook_link: "https://www.facebook.com/profile.php?id=61593723286324",
  instagram_link: "https://www.instagram.com/thedrop0utcollege/",
  youtube_link: "https://www.youtube.com/@TheDropOutCollege-v4k",
};

export const defaultHomepageSections: SiteSection[] = [
  { id: "hero", slug: "hero", title: "Hero Discovery", description: "Main community intro, value proposition, and primary call to actions.", cta_label: "Explore Community", cta_href: "/explore", enabled: true, sort_order: 1, content: {} },
  { id: "journal-carousel", slug: "journal-carousel", title: "Featured Journal Carousel", description: "Editorial carousel highlighting published magazine essays and deep-dives.", cta_label: "Read Journal", cta_href: "/journal", enabled: true, sort_order: 2, content: { autoplay: true, featuredArticleIds: [] } },
  { id: "featured-projects", slug: "featured-projects", title: "Featured Community Projects", description: "Curated showcase of real projects and prototypes shipped by members.", cta_label: "Explore Projects", cta_href: "/projects", enabled: true, sort_order: 3, content: { featuredProjectIds: [] } },
  { id: "featured-members", slug: "featured-members", title: "Featured Creators & Members", description: "Spotlight on passionate community builders, developers, and creators.", cta_label: "Browse People", cta_href: "/explore", enabled: true, sort_order: 4, content: { featuredMemberIds: [] } },
  { id: "community-activity", slug: "community-activity", title: "Latest Community Activity", description: "Live feed of recent project launches, journal articles, and community updates.", cta_label: "Join Discord", cta_href: DISCORD_INVITE_URL, enabled: true, sort_order: 5, content: {} },
  { id: "community-stats", slug: "community-stats", title: "Community Statistics", description: "Real database-verified metrics celebrating community growth and outputs.", cta_label: "", cta_href: "", enabled: true, sort_order: 6, content: {} },
  { id: "community-noticeboard", slug: "community-noticeboard", title: "Community Noticeboard", description: "Announcements, upcoming sessions, community challenges, and alerts.", cta_label: "View All", cta_href: "#", enabled: true, sort_order: 7, content: { announcements: defaultAnnouncements } },
  { id: "final-cta", slug: "final-cta", title: "Final Community CTA", description: "Compelling closing invitation to join the learning collective.", cta_label: "Join The DropOut College", cta_href: "/login", enabled: true, sort_order: 8, content: {} },
  { id: "founders", slug: "founders", title: "Founder & CEO Profiles", description: "Professional profiles of founders Ahmed Rafin and Nirob Mia.", cta_label: "About Founders", cta_href: "/about#founders", enabled: true, sort_order: 9, content: { founders: defaultFounders } },
];
