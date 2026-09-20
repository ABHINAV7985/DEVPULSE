// Filter definitions for the GitHub explorer.
// Each entry maps a label shown in the UI to the GitHub topic used in search.

export const DOMAINS = [
  { id: "ai", label: "AI", topic: "artificial-intelligence" },
  { id: "ml", label: "Machine Learning", topic: "machine-learning" },
  { id: "fullstack", label: "Full Stack", topic: "fullstack" },
  { id: "web", label: "Web Development", topic: "web-development" },
  { id: "mobile", label: "Mobile", topic: "mobile" },
  { id: "devops", label: "DevOps", topic: "devops" },
  { id: "security", label: "Cybersecurity", topic: "security" },
  { id: "data", label: "Data Science", topic: "data-science" },
  { id: "game", label: "Game Development", topic: "game-development" },
];

export const TECHNOLOGIES = [
  { id: "react", label: "React", topic: "react" },
  { id: "nextjs", label: "Next.js", topic: "nextjs" },
  { id: "node", label: "Node.js", topic: "nodejs" },
  { id: "python", label: "Python", topic: "python" },
  { id: "django", label: "Django", topic: "django" },
  { id: "fastapi", label: "FastAPI", topic: "fastapi" },
  { id: "java", label: "Java", topic: "java" },
  { id: "spring", label: "Spring", topic: "spring-boot" },
  { id: "flutter", label: "Flutter", topic: "flutter" },
  { id: "reactnative", label: "React Native", topic: "react-native" },
  { id: "go", label: "Go", topic: "golang" },
  { id: "rust", label: "Rust", topic: "rust" },
];

export const SORTS = [
  { id: "trending" , label: "Trending" },
  { id: "stars",  label: "Most Stars" },
  { id: "growth", label: "Fastest Growing" },
  { id: "new", label: "Recently Created" },
  { id: "updated",  label: "Recently Updated" },
];

export const findDomain = (id) => DOMAINS.find((d) => d.id === id);
export const findTech = (id) => TECHNOLOGIES.find((t) => t.id === id);
