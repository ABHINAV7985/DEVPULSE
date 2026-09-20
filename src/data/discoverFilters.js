// Filters for the Discover feed.
//
// Each domain maps to the vocabulary of all three sources at once:
//   hn      — free-text terms for the Hacker News search index
//   devto   — Forem tag slugs
//   github  — GitHub topic slugs
//
// Keeping the mapping in one place is what makes the feed
// "developer domains only" rather than general tech news.

export const DOMAINS = [
  {
    id: "ai",
    label: "AI & Agents",
    hn: ["AI agents", "LLM", "Anthropic", "OpenAI", "Claude", "GPT"],
    devto: ["ai", "llm", "chatgpt"],
    github: ["ai", "llm", "agents"],
  },
  {
    id: "ml",
    label: "Machine Learning",
    hn: ["machine learning", "neural network", "PyTorch", "transformers"],
    devto: ["machinelearning", "datascience"],
    github: ["machine-learning", "deep-learning"],
  },
  {
    id: "web",
    label: "Web Development",
    hn: ["React", "Next.js", "web framework", "frontend", "CSS"],
    devto: ["webdev", "react", "javascript"],
    github: ["web-development", "frontend"],
  },
  {
    id: "backend",
    label: "Backend & APIs",
    hn: ["API design", "backend", "database", "Postgres", "GraphQL"],
    devto: ["api", "backend", "node"],
    github: ["api", "backend"],
  },
  {
    id: "mobile",
    label: "Mobile",
    hn: ["iOS", "Android", "Flutter", "React Native", "Swift"],
    devto: ["mobile", "flutter", "reactnative"],
    github: ["mobile", "flutter"],
  },
  {
    id: "devops",
    label: "DevOps & Cloud",
    hn: ["Kubernetes", "Docker", "AWS", "self-hosted", "CI/CD"],
    devto: ["devops", "kubernetes", "aws"],
    github: ["devops", "kubernetes"],
  },
  {
    id: "security",
    label: "Security",
    hn: ["security vulnerability", "CVE", "encryption", "exploit"],
    devto: ["security", "cybersecurity"],
    github: ["security", "cybersecurity"],
  },
  {
    id: "data",
    label: "Data & Databases",
    hn: ["database", "SQL", "data engineering", "analytics"],
    devto: ["database", "sql", "data"],
    github: ["database", "data-science"],
  },
  {
    id: "languages",
    label: "Languages & Tooling",
    hn: ["Rust", "Go language", "TypeScript", "compiler", "build tool"],
    devto: ["rust", "go", "typescript"],
    github: ["rust", "golang", "typescript"],
  },
  {
    id: "opensource",
    label: "Open Source",
    hn: ["open source", "Show HN", "released"],
    devto: ["opensource"],
    github: ["open-source"],
  },
];

// What kind of thing each card is. These map to which source
// (and which query shape) produces them.
export const KINDS = [
  { id: "article", label: "Articles", icon: "" },
  { id: "discussion", label: "Discussions", icon: "" },
  { id: "project", label: "GitHub projects", icon: "" },
  { id: "tool", label: "New tools", icon: "" },
  { id: "tutorial", label: "Tutorials", icon: "" },
  { id: "video", label: "Videos", icon: "" },
];

export const RANGES = [
  { id: "1", label: "Today" },
  { id: "7", label: "This week" },
  { id: "30", label: "This month" },
];

export const findDomain = (id) => DOMAINS.find((d) => d.id === id);
