// Shared logic for proxying GitHub API requests through a serverless
// function, so a token can be attached server-side and never reach
// the browser bundle. Both api/github.js (Vercel) and
// netlify/functions/github.js call this.

const GITHUB_BASE = "https://api.github.com";

// Only ever forward requests under these prefixes. Keeps this proxy
// from becoming an open relay to arbitrary GitHub API paths.
const ALLOWED_PREFIXES = ["/search/repositories", "/repos/"];

export async function proxyGithubRequest(path) {
  if (!path || !ALLOWED_PREFIXES.some((p) => path.startsWith(p))) {
    return {
      status: 400,
      body: { message: "Path not allowed." },
    };
  }

  const token = process.env.GITHUB_TOKEN;

  const headers = { Accept: "application/vnd.github+json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(GITHUB_BASE + path, { headers });
  const body = await res.json().catch(() => ({}));

  return { status: res.status, body };
}
