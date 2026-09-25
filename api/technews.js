import { proxyTechNewsRequest } from "./_technewsProxy.js";

function clientIdFromRequest(req) {
  const forwarded = req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "anonymous";
  return String(forwarded).split(",")[0].trim() || "anonymous";
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed." });
    return;
  }

  try {
    const path = req.query.path;
    const { status, body } = await proxyTechNewsRequest(path, {
      clientId: clientIdFromRequest(req),
    });

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    res.status(status).json(body);
  } catch {
    res.status(502).json({ message: "Proxy request to GNews failed." });
  }
}
