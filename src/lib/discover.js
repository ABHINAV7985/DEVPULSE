// Discover feed.
//
// Pulls from three sources that are free, need no API key, and send
// CORS headers, so everything works straight from the browser:
//
//   Hacker News (Algolia)  https://hn.algolia.com/api/v1
//   Dev.to (Forem)         https://dev.to/api
//   GitHub                 via src/lib/github.js (proxied when deployed)
//
// Reddit is deliberately absent: Reddit shut down unauthenticated
// .json endpoints in May 2026 and closed self-service API signups in
// November 2025, so there is no free way to read it from a browser.
// The community panel links out to relevant threads instead of
// pretending to have live Reddit data.

import { DOMAINS, findDomain } from "../data/discoverFilters";
import { searchRepos, starsPerDay } from "./github";

const HN = "https://hn.algolia.com/api/v1";
const DEVTO = "https://dev.to/api";

const CACHE_TTL = 5 * 60 * 1000;
const memory = new Map();

async function cached(key, loader) {
  const hit = memory.get(key);
  if (hit && Date.now() - hit.time < CACHE_TTL) return hit.value;

  const value = await loader();
  memory.set(key, { time: Date.now(), value });
  return value;
}

const secondsAgo = (days) =>
  Math.floor((Date.now() - days * 86400000) / 1000);

/* ---------------------------------------------------------
   Normalised card shape
   Every source is mapped onto this so the UI stays simple.
--------------------------------------------------------- */

function card({
  id,
  kind,
  title,
  summary,
  url,
  image,
  source,
  author,
  createdAt,
  tags = [],
  metrics = [],
  score = 0,
  reason = "",
  ...extra
}) {
  return {
    id,
    kind,
    title,
    summary,
    url,
    image,
    source,
    author,
    createdAt,
    tags,
    metrics,
    score,
    reason,
    // Source-specific extras (internalPath, discussionUrl) ride along
    // so the card component can render the right secondary links.
    ...extra,
  };
}

/* ---------------------------------------------------------
   Hacker News
--------------------------------------------------------- */

// Show HN posts are launches — treat them as tools, not articles.
const hnKind = (hit) => {
  const tags = hit._tags || [];
  if (tags.includes("show_hn") || /^show hn/i.test(hit.title || "")) return "tool";
  if ((hit.num_comments || 0) > (hit.points || 0) * 0.6) return "discussion";
  return "article";
};

async function fetchHackerNews({ domains, days, limit = 30 }) {
  const picked = domains.length ? domains : DOMAINS.map((d) => d.id);

  // One query per domain keeps results on-topic; HN's relevance
  // ranking degrades badly if every term is OR'd into one string.
  const queries = picked.slice(0, 4).map((id) => {
    const terms = findDomain(id)?.hn || [];
    return { id, query: terms.slice(0, 3).join(" ") };
  });

  const results = await Promise.all(
    queries.map(({ query }) =>
      cached(`hn:${query}:${days}`, async () => {
        const filters = `created_at_i>${secondsAgo(Number(days))},points>10`;

        const url =
          `${HN}/search?query=${encodeURIComponent(query)}` +
          `&tags=story` +
          `&numericFilters=${encodeURIComponent(filters)}` +
          `&hitsPerPage=${limit}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`Hacker News returned ${res.status}.`);
        return res.json();
      }).catch(() => ({ hits: [] }))
    )
  );

  const out = [];

  for (const r of results) {
    for (const hit of r.hits || []) {
      if (!hit.title || !hit.objectID) continue;

      const points = hit.points || 0;
      const comments = hit.num_comments || 0;
      const discussion = `https://news.ycombinator.com/item?id=${hit.objectID}`;

      out.push(
        card({
          id: `hn-${hit.objectID}`,
          kind: hnKind(hit),
          title: hit.title.replace(/^Show HN:\s*/i, ""),
          summary: hit.story_text
            ? stripHtml(hit.story_text).slice(0, 220)
            : "",
          url: hit.url || discussion,
          image: null,
          source: "Hacker News",
          author: hit.author,
          createdAt: hit.created_at,
          tags: (hit._tags || []).filter(
            (t) => !t.startsWith("author_") && !t.startsWith("story_")
          ),
          metrics: [
            { label: "points", value: points },
            { label: "comments", value: comments },
          ],
          score: points + comments * 2,
          reason: reasonForHn(points, comments),
          discussionUrl: discussion,
        })
      );
    }
  }

  return out;
}

const stripHtml = (s) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

function reasonForHn(points, comments) {
  if (comments > points) {
    return `Debated more than upvoted — ${comments} comments on ${points} points, which usually means the thread disagrees.`;
  }
  if (points > 400) {
    return `Front-paged hard at ${points} points, well past the ~300 mark where HN stories break out.`;
  }
  if (comments > 100) {
    return `${comments} comments — an active thread rather than a quiet upvote.`;
  }
  return `${points} points and ${comments} comments in the selected window.`;
}

/* ---------------------------------------------------------
   Dev.to
--------------------------------------------------------- */

const TUTORIAL_TAGS = ["tutorial", "beginners", "howto", "learning"];
const VIDEO_TAGS = ["video", "watercooler", "youtube"];

function devtoKind(article) {
  const tags = article.tag_list || [];
  if (tags.some((t) => VIDEO_TAGS.includes(t))) return "video";
  if (tags.some((t) => TUTORIAL_TAGS.includes(t))) return "tutorial";
  return "article";
}

async function fetchDevto({ domains, days, limit = 30 }) {
  const picked = domains.length ? domains : DOMAINS.map((d) => d.id);

  const tags = [
    ...new Set(picked.flatMap((id) => findDomain(id)?.devto || [])),
  ].slice(0, 4);

  const results = await Promise.all(
    tags.map((tag) =>
      cached(`devto:${tag}:${days}`, async () => {
        const url =
          `${DEVTO}/articles?tag=${encodeURIComponent(tag)}` +
          `&top=${days}&per_page=${limit}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`Dev.to returned ${res.status}.`);
        return res.json();
      }).catch(() => [])
    )
  );

  const out = [];

  for (const list of results) {
    for (const a of list || []) {
      if (!a.title || !a.id) continue;

      const reactions = a.positive_reactions_count || 0;
      const comments = a.comments_count || 0;

      out.push(
        card({
          id: `devto-${a.id}`,
          kind: devtoKind(a),
          title: a.title,
          summary: a.description || "",
          url: a.url,
          image: a.cover_image || a.social_image || null,
          source: "DEV Community",
          author: a.user?.name || a.user?.username,
          createdAt: a.published_at,
          tags: a.tag_list || [],
          metrics: [
            { label: "reactions", value: reactions },
            { label: "comments", value: comments },
            ...(a.reading_time_minutes
              ? [{ label: "min read", value: a.reading_time_minutes }]
              : []),
          ],
          score: reactions + comments * 3,
          reason: reasonForDevto(reactions, comments, a.reading_time_minutes),
        })
      );
    }
  }

  return out;
}

function reasonForDevto(reactions, comments, minutes) {
  if (reactions > 300) {
    return `${reactions} reactions puts this in DEV's top tier for the period.`;
  }
  if (comments > 30) {
    return `${comments} comments — readers are arguing with it, not just bookmarking it.`;
  }
  if (minutes && minutes > 12) {
    return `A ${minutes}-minute deep dive that still pulled ${reactions} reactions.`;
  }
  return `${reactions} reactions and ${comments} comments on DEV.`;
}

/* ---------------------------------------------------------
   GitHub
--------------------------------------------------------- */

async function fetchGithub({ domains, days }) {
  const picked = domains.length ? domains : ["ai", "web"];

  // Reuse the existing repo search so the proxy/token path is shared.
  const topics = [
    ...new Set(picked.flatMap((id) => findDomain(id)?.github || [])),
  ].slice(0, 2);

  const results = await Promise.all(
    topics.map((topic) =>
      cached(`gh:${topic}:${days}`, () =>
        searchRepos({
          domains: [],
          techs: [],
          text: `topic:${topic}`,
          sort: Number(days) <= 7 ? "trending" : "growth",
        })
      ).catch(() => ({ items: [] }))
    )
  );

  const out = [];

  for (const r of results) {
    for (const repo of (r.items || []).slice(0, 12)) {
      const perDay = starsPerDay(repo);
      const [owner, name] = repo.full_name.split("/");

      out.push(
        card({
          id: `gh-${repo.id}`,
          kind: "project",
          title: repo.name,
          summary: repo.description || "",
          url: repo.html_url,
          // GitHub renders a free social card for every public repo.
          image: `https://opengraph.githubassets.com/1/${owner}/${name}`,
          source: "GitHub",
          author: owner,
          createdAt: repo.created_at,
          tags: repo.topics || [],
          metrics: [
            { label: "stars", value: repo.stargazers_count },
            { label: "forks", value: repo.forks_count },
          ],
          score: Math.round(perDay * 40),
          reason: reasonForRepo(repo, perDay),
          internalPath: `/github/${owner}/${name}`,
        })
      );
    }
  }

  return out;
}

function reasonForRepo(repo, perDay) {
  const ageDays = Math.floor(
    (Date.now() - new Date(repo.created_at)) / 86400000
  );

  if (ageDays < 120) {
    return `Only ${ageDays} days old and already at ${repo.stargazers_count.toLocaleString()} stars (${perDay.toFixed(1)}/day).`;
  }
  if (perDay > 20) {
    return `Gaining roughly ${perDay.toFixed(0)} stars a day since launch.`;
  }
  return `${repo.stargazers_count.toLocaleString()} stars, last pushed ${new Date(repo.pushed_at).toLocaleDateString()}.`;
}

/* ---------------------------------------------------------
   Combined feed
--------------------------------------------------------- */

export async function loadFeed({ domains = [], kinds = [], days = "7" }) {
  const [hn, devto, github] = await Promise.all([
    fetchHackerNews({ domains, days }).catch(() => []),
    fetchDevto({ domains, days }).catch(() => []),
    fetchGithub({ domains, days }).catch(() => []),
  ]);

  let all = [...hn, ...devto, ...github];

  if (!all.length) {
    throw new Error(
      "No sources responded. Check your connection, or try a wider time range."
    );
  }

  // Drop duplicates that appear on both HN and DEV.
  const seen = new Set();
  all = all.filter((c) => {
    const key = (c.url || c.title).toLowerCase().replace(/\/$/, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (kinds.length) all = all.filter((c) => kinds.includes(c.kind));

  // Normalise scores per source so GitHub stars don't bury HN points.
  const maxBySource = {};
  for (const c of all) {
    maxBySource[c.source] = Math.max(maxBySource[c.source] || 1, c.score);
  }

  return all
    .map((c) => ({ ...c, relative: c.score / (maxBySource[c.source] || 1) }))
    .sort((a, b) => b.relative - a.relative);
}

/* ---------------------------------------------------------
   Community panel
   Live counts where a free API exists, links where it doesn't.
--------------------------------------------------------- */

export async function loadCommunity({ domains = [] }) {
  const picked = domains.length ? domains : ["ai"];
  const domain = findDomain(picked[0]);
  const query = (domain?.hn || ["programming"])[0];

  const threads = await cached(`hn-talk:${query}`, async () => {
    const filters = `created_at_i>${secondsAgo(3)},num_comments>40`;

    const url =
      `${HN}/search?query=${encodeURIComponent(query)}` +
      `&tags=story&numericFilters=${encodeURIComponent(filters)}` +
      `&hitsPerPage=6`;

    const res = await fetch(url);
    if (!res.ok) throw new Error("Hacker News unavailable.");
    return res.json();
  }).catch(() => ({ hits: [] }));

  return {
    domainLabel: domain?.label || "Programming",
    threads: (threads.hits || []).map((h) => ({
      id: h.objectID,
      title: h.title,
      comments: h.num_comments || 0,
      points: h.points || 0,
      url: `https://news.ycombinator.com/item?id=${h.objectID}`,
    })),
    // Static outbound links — these platforms have no free read API,
    // so the panel points at them rather than faking a feed.
    places: [
      {
        name: "DEV Community",
        blurb: `Open discussions tagged ${domain?.devto?.[0] || "webdev"}`,
        url: `https://dev.to/t/${domain?.devto?.[0] || "webdev"}`,
      },
      {
        name: "Lobsters",
        blurb: "Smaller, higher signal-to-noise link aggregator",
        url: "https://lobste.rs/",
      },
      {
        name: "Reddit",
        blurb: "No free API since 2026 — opens in a new tab",
        url: `https://www.reddit.com/r/${redditSub(picked[0])}/`,
      },
    ],
  };
}

const redditSub = (id) =>
  ({
    ai: "MachineLearning",
    ml: "MachineLearning",
    web: "webdev",
    backend: "backend",
    mobile: "androiddev",
    devops: "devops",
    security: "netsec",
    data: "dataengineering",
    languages: "programming",
    opensource: "opensource",
  })[id] || "programming";
