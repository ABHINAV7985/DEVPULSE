// GitHub REST API client.
// Docs: https://docs.github.com/en/rest

import { findDomain, findTech } from "../data/filters";

const GITHUB_BASE = "https://api.github.com";
const PROXY_BASE = "/api/github";

// Optional, local-dev-only fallback. Put VITE_GITHUB_TOKEN in .env to
// raise the rate limit when running plain `npm run dev` (no serverless
// function). VITE_ variables are bundled into the browser JS, so this
// is fine on your own machine but must never be set for a deployed
// build — see README for the production setup (api/github.js +
// GITHUB_TOKEN, which stays server-side).
const DEV_TOKEN = import.meta.env?.VITE_GITHUB_TOKEN;

const MAX_QUERIES = 6;
const CACHE_TTL = 5 * 60 * 1000;

// Once we learn whether /api/github is actually running (Vercel,
// Netlify, or `vercel dev`/`netlify dev` locally) vs. absent (plain
// `npm run dev`, or a static host with no functions), remember it for
// the rest of the session instead of re-probing on every request.
let proxyAvailable = null;

/* ---------------------------------------------------------
   Cache — keeps the rate limit usable while filters change
--------------------------------------------------------- */

const memory = new Map();

function readCache(key) {
  const hit = memory.get(key);
  if (hit && Date.now() - hit.time < CACHE_TTL) return hit.value;
  return null;
}

function writeCache(key, value) {
  memory.set(key, { time: Date.now(), value });
}

/* ---------------------------------------------------------
   Fetch helper
--------------------------------------------------------- */

export class GitHubError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function rateLimitError(res) {
  const remaining = res.headers?.get?.("x-ratelimit-remaining");
  if (remaining === "0") {
    const reset = Number(res.headers.get("x-ratelimit-reset")) * 1000;
    const mins = Math.max(1, Math.ceil((reset - Date.now()) / 60000));
    return new GitHubError(
      `GitHub rate limit reached. Try again in about ${mins} minute${mins > 1 ? "s" : ""}, or set up the proxy token — see README.`,
      403
    );
  }
  return new GitHubError("GitHub refused the request.", 403);
}

// Tries the serverless proxy. Returns null (rather than throwing) when
// no proxy is running, so the caller can fall back to a direct call.
async function tryProxy(path) {
  if (proxyAvailable === false) return null;

  let res;
  try {
    res = await fetch(`${PROXY_BASE}?path=${encodeURIComponent(path)}`);
  } catch {
    proxyAvailable = false;
    return null;
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    // A static host with no function returns index.html (200) or a
    // plain 404 page here, not JSON — that means "no proxy," not
    // "GitHub said no."
    proxyAvailable = false;
    return null;
  }

  proxyAvailable = true;

  if (res.status === 403 || res.status === 429) throw rateLimitError(res);
  if (res.status === 404) throw new GitHubError("Not found on GitHub.", 404);
  if (!res.ok) throw new GitHubError(`GitHub returned ${res.status}.`, res.status);

  return res.json();
}

async function directCall(path) {
  const headers = { Accept: "application/vnd.github+json" };
  if (DEV_TOKEN) headers.Authorization = `Bearer ${DEV_TOKEN}`;

  const res = await fetch(GITHUB_BASE + path, { headers });

  if (res.status === 403 || res.status === 429) throw rateLimitError(res);
  if (res.status === 404) throw new GitHubError("Not found on GitHub.", 404);
  if (!res.ok) throw new GitHubError(`GitHub returned ${res.status}.`, res.status);

  return res.json();
}

async function get(path, { cache = true } = {}) {
  if (cache) {
    const hit = readCache(path);
    if (hit) return hit;
  }

  const viaProxy = await tryProxy(path);
  const data = viaProxy !== null ? viaProxy : await directCall(path);

  if (cache) writeCache(path, data);
  return data;
}

/* ---------------------------------------------------------
   Query building
--------------------------------------------------------- */

const daysAgo = (n) => {
  const d = new Date(Date.now() - n * 86400000);
  return d.toISOString().slice(0, 10);
};

// GitHub treats several `topic:` qualifiers as AND, so selecting
// two domains runs two searches and the results are merged.
function buildQueries({ domains, techs, text, sort }) {
  const domainTopics = domains.map((id) => findDomain(id)?.topic).filter(Boolean);
  const techTopics = techs.map((id) => findTech(id)?.topic).filter(Boolean);

  const combos = [];
  const left = domainTopics.length ? domainTopics : [null];
  const right = techTopics.length ? techTopics : [null];

  for (const d of left) {
    for (const t of right) {
      combos.push([d, t].filter(Boolean));
    }
  }

  const window = {
    trending: `pushed:>=${daysAgo(30)} stars:>=200`,
    stars: "stars:>=100",
    growth: `created:>=${daysAgo(540)} stars:>=150`,
    new: `created:>=${daysAgo(120)} stars:>=20`,
    updated: `pushed:>=${daysAgo(7)} stars:>=100`,
  }[sort];

  const order = {
    trending: "sort=stars&order=desc",
    stars: "sort=stars&order=desc",
    growth: "sort=stars&order=desc",
    new: "sort=stars&order=desc",
    updated: "sort=updated&order=desc",
  }[sort];

  return combos.slice(0, MAX_QUERIES).map((topics) => {
    const parts = [
      text ? text.trim() : "",
      ...topics.map((t) => `topic:${t}`),
      window,
      "is:public",
      "archived:false",
    ].filter(Boolean);

    return `/search/repositories?q=${encodeURIComponent(parts.join(" "))}&${order}&per_page=30`;
  });
}

/* ---------------------------------------------------------
   Ranking
--------------------------------------------------------- */

export function starsPerDay(repo) {
  const ageDays = Math.max(
    1,
    (Date.now() - new Date(repo.created_at).getTime()) / 86400000
  );
  return repo.stargazers_count / ageDays;
}

function rank(repos, sort) {
  const list = [...repos];

  if (sort === "growth") {
    return list.sort((a, b) => starsPerDay(b) - starsPerDay(a));
  }
  if (sort === "new") {
    return list.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  }
  if (sort === "updated") {
    return list.sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));
  }
  if (sort === "trending") {
    // Recent push activity weighted against raw star count.
    return list.sort((a, b) => trendScore(b) - trendScore(a));
  }
  return list.sort((a, b) => b.stargazers_count - a.stargazers_count);
}

export function trendScore(repo) {
  const daysSincePush = Math.max(
    0.5,
    (Date.now() - new Date(repo.pushed_at).getTime()) / 86400000
  );
  return (starsPerDay(repo) * 30) / Math.log2(daysSincePush + 2);
}

/* ---------------------------------------------------------
   Public calls
--------------------------------------------------------- */

export async function searchRepos({
  domains = [],
  techs = [],
  text = "",
  sort = "trending",
  page = 1,
}) {
  const queries = buildQueries({ domains, techs, text, sort }).map(
    (q) => `${q}&page=${page}`
  );

  const results = await Promise.all(
    queries.map((q) =>
      get(q).catch((err) => {
        if (err.status === 403) throw err;
        return { items: [], total_count: 0 };
      })
    )
  );

  const seen = new Map();
  let total = 0;

  for (const r of results) {
    total = Math.max(total, r.total_count || 0);
    for (const repo of r.items || []) {
      if (!seen.has(repo.id)) seen.set(repo.id, repo);
    }
  }

  const items = rank([...seen.values()], sort);

  return {
    items,
    total,
    hasMore: results.some((r) => (r.items || []).length === 30),
  };
}

export const getRepo = (owner, name) => get(`/repos/${owner}/${name}`);

export const getLanguages = (owner, name) =>
  get(`/repos/${owner}/${name}/languages`).catch(() => ({}));

export const getContributors = (owner, name) =>
  get(`/repos/${owner}/${name}/contributors?per_page=8`).catch(() => []);

export const getReleases = (owner, name) =>
  get(`/repos/${owner}/${name}/releases/latest`).catch(() => null);

export async function getReadme(owner, name) {
  try {
    const data = await get(`/repos/${owner}/${name}/readme`);
    if (!data?.content) return "";
    const binary = atob(data.content.replace(/\n/g, ""));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return "";
  }
}

export async function getRelated(repo) {
  const topic = (repo.topics || [])[0] || repo.language?.toLowerCase();
  if (!topic) return [];

  const q = encodeURIComponent(
    `topic:${topic} stars:>=200 archived:false is:public`
  );

  try {
    const data = await get(
      `/search/repositories?q=${q}&sort=stars&order=desc&per_page=7`
    );
    return (data.items || []).filter((r) => r.id !== repo.id).slice(0, 5);
  } catch {
    return [];
  }
}
