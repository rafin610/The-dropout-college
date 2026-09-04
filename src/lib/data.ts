export const categories = [
  { name: "Programming", icon: "</>", description: "Build products, tools, and systems with ambitious peers.", members: "2.4k", tone: "lime" },
  { name: "AI Lab", icon: "✦", description: "Explore models, agents, and the next wave of intelligence.", members: "1.8k", tone: "cyan" },
  { name: "Design", icon: "◈", description: "Shape interfaces and visual identities people remember.", members: "1.2k", tone: "coral" },
  { name: "Video", icon: "▶", description: "Direct, edit, and publish work with a sharp point of view.", members: "860", tone: "violet" },
  { name: "Content", icon: "✎", description: "Turn ideas into stories, communities, and momentum.", members: "1.1k", tone: "orange" },
  { name: "Esports", icon: "⌁", description: "Compete, analyze, and find your next squad.", members: "940", tone: "blue" },
  { name: "Cybersecurity", icon: "⌑", description: "Think adversarially and protect what matters.", members: "640", tone: "green" },
  { name: "Business", icon: "↗", description: "Find co-founders, validate ideas, and ship faster.", members: "720", tone: "yellow" },
  { name: "Technology", icon: "⌘", description: "Stay curious across the frontier of tech.", members: "1.5k", tone: "pink" },
];

export const members = [
  { name: "Maya Chen", handle: "@mayacodes", skill: "AI engineer", category: "AI Lab", initials: "MC", color: "#d8ff62", bio: "Building small, useful agents for creative teams.", online: true },
  { name: "Noah Williams", handle: "@northstar", skill: "Product designer", category: "Design", initials: "NW", color: "#ff836d", bio: "Designing calm interfaces for complex systems.", online: true },
  { name: "Ari Okafor", handle: "@ariok", skill: "Creative technologist", category: "Technology", initials: "AO", color: "#77e7e1", bio: "Making the future feel a little more human.", online: false },
  { name: "Sofia Reyes", handle: "@sofiar", skill: "Founder & editor", category: "Content", initials: "SR", color: "#c4a4ff", bio: "Telling stories about people who build things.", online: true },
];

export const projects = [
  { name: "Lumen OS", description: "An open source workspace for turning research into clear decisions.", category: "AI Lab", status: "In build", color: "#d8ff62", tags: ["Next.js", "Python", "OpenAI"], team: ["MC", "NW", "AO"], metric: "12 contributors" },
  { name: "Afterimage", description: "A visual archive for the places and people shaping internet culture.", category: "Content", status: "Live", color: "#ff836d", tags: ["Editorial", "Motion", "Web"], team: ["SR", "NW"], metric: "3.2k views" },
  { name: "Signal / Noise", description: "A weekly intelligence brief for builders who hate the hype cycle.", category: "Technology", status: "Recruiting", color: "#77e7e1", tags: ["Research", "Writing", "Community"], team: ["AO", "SR", "MC"], metric: "2 roles open" },
  { name: "Arcade 04", description: "A competitive game lab turning friendly rivalries into better play.", category: "Esports", status: "Live", color: "#c4a4ff", tags: ["Valorant", "Analysis", "League"], team: ["MC", "AO"], metric: "48 players" },
];

export const events = [
  { date: "18", month: "SEP", title: "Build night: tiny agents", type: "Workshop", meta: "Thursday · 19:00 UTC", accent: "lime" },
  { date: "26", month: "SEP", title: "The Signal Sprint", type: "Competition", meta: "48 hour build challenge", accent: "coral" },
  { date: "03", month: "OCT", title: "Design critique club", type: "Community session", meta: "Bring one thing in progress", accent: "cyan" },
  { date: "12", month: "OCT", title: "Dropout Arena #01", type: "Esports tournament", meta: "5v5 · open registration", accent: "violet" },
];

export const stats = [
  ["04.8k", "members"], ["286", "active creators"], ["72", "projects shipped"], ["18", "events this season"], ["31", "teams forming"],
];