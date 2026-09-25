import { proxySummarize } from "./_summarizeProxy.js";

function clientIdFromRequest(req) {
  const forwarded = req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "anonymous";
  return String(forwarded).split(",")[0].trim() || "anonymous";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed." });
    return;
  }

  try {
    const { topic, articles } = req.body || {};
    const result = await proxySummarize({
      topic,
      articles,
      clientId: clientIdFromRequest(req),
    });

    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.status(result.status).json(result.body);
  } catch {
    res.status(500).json({ message: "Free summarization failed." });
  }
}
