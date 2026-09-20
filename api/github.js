// Vercel serverless function.
// Runs on Vercel automatically for any request to /api/github.
// Locally, `vercel dev` runs this too — plain `npm run dev` (just Vite)
// does not, so src/lib/github.js falls back to a direct browser call
// in that case.

import { proxyGithubRequest } from "./_proxy.js";

export default async function handler(req, res) {
  const path = req.query.path;

  try {
    const { status, body } = await proxyGithubRequest(path);
    res.status(status).json(body);
  } catch (err) {
    res.status(502).json({ message: "Proxy request to GitHub failed." });
  }
}
