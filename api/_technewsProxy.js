const GNEWS_BASE = "https://gnews.io/api/v4";
const ALLOWED_PATHS = new Set(["/top-headlines", "/search"]);
const RATE_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;

const requestBuckets = new Map();

function getRateKey(clientId = "anonymous") {
  return String(clientId).slice(0, 120);
}

function allowRequest(clientId) {
  const key = getRateKey(clientId);
  const now = Date.now();
  const bucket = requestBuckets.get(key);

  if (!bucket || now - bucket.startedAt >= RATE_WINDOW_MS) {
    requestBuckets.set(key, { startedAt: now, count: 1 });
    return true;
  }

  if (bucket.count >= MAX_REQUESTS_PER_WINDOW) return false;
  bucket.count += 1;
  return true;
}

const ALLOWED_QUERY_PARAMS = new Set([
  "q",
  "category",
  "lang",
  "country",
  "max",
  "sortby",
  "from",
  "to",
]);

function validatePath(path) {
  if (typeof path !== "string" || path.length < 1 || path.length > 1400) {
    return false;
  }

  // The frontend sends GNews endpoint paths such as:
  //   /search?q=...
  //   /top-headlines?category=technology&...
  if (!path.startsWith("/") || path.startsWith("//")) {
    return false;
  }

  let parsed;
  try {
    parsed = new URL(path, "https://devpulse.local");
  } catch {
    return false;
  }

  if (!ALLOWED_PATHS.has(parsed.pathname)) return false;

  for (const key of parsed.searchParams.keys()) {
    if (!ALLOWED_QUERY_PARAMS.has(key)) return false;
  }

  const max = parsed.searchParams.get("max");
  if (max && (!/^\d+$/.test(max) || Number(max) < 1 || Number(max) > 10)) {
    return false;
  }

  return true;
}


export async function proxyTechNewsRequest(path, { clientId = "anonymous" } = {}) {
  if (!validatePath(path)) {
    return { status: 400, body: { message: "News request path is not allowed." } };
  }

  if (!allowRequest(clientId)) {
    return { status: 429, body: { message: "Too many news requests. Try again shortly." } };
  }

  const key = process.env.GNEWS_API_KEY;
  if (!key) {
    return {
      status: 501,
      body: {
        message: "GNEWS_API_KEY is not configured on the server.",
        configMissing: true,
      },
    };
  }

  let res;
  try {
    const separator = path.includes("?") ? "&" : "?";
    res = await fetch(`${GNEWS_BASE}${path}${separator}apikey=${encodeURIComponent(key)}`, {
      headers: { Accept: "application/json" },
    });
  } catch {
    return { status: 502, body: { message: "Could not reach the news provider." } };
  }

  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}
