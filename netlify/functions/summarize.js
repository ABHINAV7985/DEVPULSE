import { proxySummarize } from "../../api/_summarizeProxy.js";

function clientIdFromEvent(event) {
  const headers = event.headers || {};
  const forwarded = headers["x-forwarded-for"] || headers["client-ip"] || "anonymous";
  return String(forwarded).split(",")[0].trim() || "anonymous";
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ message: "Method not allowed." }) };
  }

  try {
    const { topic, articles } = JSON.parse(event.body || "{}");
    const result = await proxySummarize({
      topic,
      articles,
      clientId: clientIdFromEvent(event),
    });

    return {
      statusCode: result.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify(result.body),
    };
  } catch {
    return { statusCode: 502, body: JSON.stringify({ message: "Summarization proxy failed." }) };
  }
}
