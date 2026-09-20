// Netlify function.
// Deployed automatically to /.netlify/functions/github, which
// public/_redirects maps to /api/github so the frontend code
// doesn't need to know which host it's running on.

import { proxyGithubRequest } from "../../api/_proxy.js";

export async function handler(event) {
  const path = event.queryStringParameters?.path;

  try {
    const { status, body } = await proxyGithubRequest(path);
    return {
      statusCode: status,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    };
  } catch (err) {
    return {
      statusCode: 502,
      body: JSON.stringify({ message: "Proxy request to GitHub failed." }),
    };
  }
}
