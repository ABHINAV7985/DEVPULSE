// TechNews data client.
// Real articles only — this file never invents headlines, dates, or
// company mentions. Everything it returns traces back to a GNews API
// response. Docs: https://docs.gnews.io
//
// Follows the same proxy-first / cached / graceful-fallback shape as
// src/lib/github.js, so the app behaves consistently whether it's
// running on Vercel, Netlify, `vercel dev`/`netlify dev`, or plain
// `npm run dev`.

// TechNews data client. Production news API credentials stay server-side.
// The browser always talks to /api/technews.

const PROXY_BASE = "/api/technews";
const CACHE_TTL = 10 * 60 * 1000;
const memory = new Map();

function readCache(key) {
  const hit = memory.get(key);
  if (hit && Date.now() - hit.time < CACHE_TTL) return hit.value;
  return null;
}

function writeCache(key, value) {
  memory.set(key, { time: Date.now(), value });
}

export class TechNewsError extends Error {
  constructor(message, { status, configMissing = false } = {}) {
    super(message);
    this.status = status;
    this.configMissing = configMissing;
  }
}

async function tryProxy(path) {
  let res;
  try {
    res = await fetch(`${PROXY_BASE}?path=${encodeURIComponent(path)}`, {
      headers: { Accept: "application/json" },
    });
  } catch {
    return null;
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return null;
  }
  const body = await res.json().catch(() => ({}));

  if (res.status === 501 && body.configMissing) {
    throw new TechNewsError(
      "The TechNews API key isn't configured on the server. Add GNEWS_API_KEY in Vercel or Netlify.",
      { status: 501, configMissing: true }
    );
  }

  if (res.status === 403 || res.status === 429) {
    throw new TechNewsError("The news provider's rate limit was reached. Try again shortly.", {
      status: res.status,
    });
  }

  if (!res.ok) {
    throw new TechNewsError(body.message || `News provider returned ${res.status}.`, {
      status: res.status,
    });
  }

  return body;
}

async function get(path) {
  const cached = readCache(path);
  if (cached) return cached;

  const data = await tryProxy(path);

  if (data === null) {
    throw new TechNewsError(
      "The local TechNews API is unavailable. Make sure the Vite dev server is running with this project and GNEWS_API_KEY is set in .env.local.",
      { status: 503 }
    );
  }

  writeCache(path, data);
  return data;
}

/* ---------------------------------------------------------
   Normalizing
--------------------------------------------------------- */

function normalizeArticle(raw, tag) {
  if (!raw?.title || !raw?.url) return null;
  return {
    id: raw.url,
    title: raw.title,
    description: raw.description || "",
    content: raw.content || raw.description || "",
    url: raw.url,
    image: raw.image || null,
    publishedAt: raw.publishedAt || null,
    source: { name: raw.source?.name || "Unknown source", url: raw.source?.url || null },
    tag,
  };
}

function dedupe(articles) {
  const seen = new Set();
  const out = [];
  for (const a of articles) {
    const key = a.url || a.title;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(a);
  }
  return out;
}

function sortByDateDesc(articles) {
  return [...articles].sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
}

/* ---------------------------------------------------------
   Categories — mapped to real GNews queries/params, not
   fabricated content. "All" merges US + India tech headlines.
--------------------------------------------------------- */

export const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "ai", label: "AI" },
  { id: "global", label: "Global Tech" },
  { id: "india", label: "India Tech" },
  { id: "startups", label: "Startups" },
  { id: "markets", label: "Markets" },
  { id: "ev", label: "EV" },
  { id: "semiconductors", label: "Semiconductors" },
  { id: "cloud", label: "Cloud" },
  { id: "cybersecurity", label: "Cybersecurity" },
];

const SEARCH_QUERIES = {
  ai: '"artificial intelligence" OR "AI model" OR OpenAI OR ChatGPT OR Anthropic OR Gemini',
  startups: 'startup OR "seed funding" OR "series A" OR "series B" OR unicorn',
  markets: '"tech stocks" OR nasdaq OR shares OR earnings technology',
  ev: '"electric vehicle" OR EV OR "electric car" OR battery technology',
  semiconductors: "semiconductor OR chip OR chipmaker OR foundry",
  cloud: '"cloud computing" OR AWS OR Azure OR "Google Cloud"',
  cybersecurity: 'cybersecurity OR "data breach" OR ransomware OR hacking',
};

async function topHeadlines(country) {
  const data = await get(`/top-headlines?category=technology&lang=en&country=${country}&max=10`);
  const tag = country === "in" ? "India" : "Global";
  return (data.articles || []).map((a) => normalizeArticle(a, tag)).filter(Boolean);
}

async function searchNews(query, { max = 10 } = {}) {
  const data = await get(`/search?q=${encodeURIComponent(query)}&lang=en&sortby=publishedAt&max=${max}`);
  return (data.articles || []).map((a) => normalizeArticle(a)).filter(Boolean);
}

export async function fetchCategory(categoryId, { customQuery = "" } = {}) {
  if (customQuery.trim()) {
    return sortByDateDesc(dedupe(await searchNews(customQuery.trim())));
  }

  if (categoryId === "global") return sortByDateDesc(dedupe(await topHeadlines("us")));
  if (categoryId === "india") return sortByDateDesc(dedupe(await topHeadlines("in")));

  if (categoryId === "all" || !categoryId) {
    const [us, india] = await Promise.all([topHeadlines("us"), topHeadlines("in")]);
    return sortByDateDesc(dedupe([...us, ...india]));
  }

  const query = SEARCH_QUERIES[categoryId];
  if (query) return sortByDateDesc(dedupe(await searchNews(query)));

  return sortByDateDesc(dedupe(await topHeadlines("us")));
}

/* ---------------------------------------------------------
   Companies — a real, quoted-name search per company. The grid
   itself is a fixed list (a "browse" directory), not scraped.
--------------------------------------------------------- */

export const COMPANIES = [
  { id: "openai", name: "OpenAI", initials: "O", logoUrl: "https://cdn.simpleicons.org/openai/111827" },
  { id: "anthropic", name: "Anthropic", initials: "A", logoUrl: "https://cdn.simpleicons.org/anthropic/111827" },
  { id: "xai", name: "xAI / Grok", initials: "X", logoUrl: "https://cdn.simpleicons.org/xai/111827" },
  { id: "google", name: "Google", initials: "G", logoUrl: "https://cdn.simpleicons.org/google" },
  { id: "microsoft", name: "Microsoft", initials: "M", logoUrl: "https://cdn.simpleicons.org/microsoft" },
  { id: "tesla", name: "Tesla", initials: "T", logoUrl: "https://cdn.simpleicons.org/tesla" },
  { id: "nvidia", name: "NVIDIA", initials: "N", logoUrl: "https://cdn.simpleicons.org/nvidia" },
  { id: "apple", name: "Apple", initials: "A", logoUrl: "https://cdn.simpleicons.org/apple/111827" },
  { id: "meta", name: "Meta", initials: "M", logoUrl: "https://cdn.simpleicons.org/meta" },
  { id: "amazon", name: "Amazon", initials: "A", logoUrl: "https://cdn.simpleicons.org/amazon" },
  { id: "tcs", name: "TCS", initials: "TCS", logoUrl: "https://cdn.simpleicons.org/tcs" },
  { id: "infosys", name: "Infosys", initials: "IN", logoUrl: "https://cdn.simpleicons.org/infosys" },
  { id: "razorpay", name: "Razorpay", initials: "R", logoUrl: "https://cdn.simpleicons.org/razorpay" },
  { id: "phonepe", name: "PhonePe", initials: "Pe", logoUrl: "https://cdn.simpleicons.org/phonepe" },
];

const COMPANY_QUERIES = {
  xai: '"xAI" OR Grok',
  google: '"Google" OR "Google DeepMind"',
};

export function findCompany(id) {
  return COMPANIES.find((c) => c.id === id) || null;
}

export async function fetchCompanyNews(companyId) {
  const company = findCompany(companyId);
  if (!company) return [];
  const query = COMPANY_QUERIES[companyId] || `"${company.name}"`;
  return sortByDateDesc(dedupe(await searchNews(query, { max: 10 })));
}

/* ---------------------------------------------------------
   Trending — derived from the real "all" feed by counting real
   mentions, never a hardcoded list of numbers.
--------------------------------------------------------- */

const TREND_WATCHLIST = [
  { id: "openai", name: "OpenAI", keywords: ["openai", "chatgpt", "sam altman"] },
  { id: "nvidia", name: "NVIDIA", keywords: ["nvidia", "jensen huang"] },
  { id: "microsoft", name: "Microsoft", keywords: ["microsoft", "azure", "copilot"] },
  { id: "tesla", name: "Tesla", keywords: ["tesla"] },
  { id: "anthropic", name: "Anthropic", keywords: ["anthropic", "claude ai"] },
  { id: "google", name: "Google", keywords: ["google", "deepmind", "gemini"] },
  { id: "apple", name: "Apple", keywords: ["apple", "iphone"] },
  { id: "meta", name: "Meta", keywords: ["meta platforms", "meta ai", "zuckerberg"] },
  { id: "amazon", name: "Amazon", keywords: ["amazon", "aws"] },
  {
    id: "indian-startups",
    name: "Indian Startups",
    keywords: ["indian startup", "indian unicorn", "bengaluru startup", "indian saas"],
  },
];

export function deriveTrending(articles, { limit = 5 } = {}) {
  const scored = TREND_WATCHLIST.map((entry) => {
    const matches = articles.filter((a) => {
      const haystack = `${a.title} ${a.description}`.toLowerCase();
      return entry.keywords.some((k) => haystack.includes(k));
    });
    const latest = sortByDateDesc(matches)[0] || null;
    return { ...entry, count: matches.length, latest };
  });

  return scored
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/* ---------------------------------------------------------
   Topic pages — real search, used for both trending topics and
   company deep-dives.
--------------------------------------------------------- */

export async function fetchArticleByTitle(title) {
  const cleanTitle = String(title || "").trim().slice(0, 180);
  if (!cleanTitle) return null;

  const articles = await searchNews(`"${cleanTitle}"`, { max: 8 });
  if (!articles.length) return null;

  const normalized = cleanTitle.toLowerCase();
  return (
    articles.find((a) => a.title.toLowerCase() === normalized) ||
    articles.find((a) => a.title.toLowerCase().includes(normalized.slice(0, 80))) ||
    articles[0]
  );
}

export async function fetchTopicArticles(topicName) {
  return sortByDateDesc(dedupe(await searchNews(`"${topicName}"`, { max: 8 })));
}

/* ---------------------------------------------------------
   Time formatting — always computed from the article's real
   publishedAt, never a fixed string.
--------------------------------------------------------- */

export function formatRelativeTime(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
