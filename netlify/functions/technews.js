import { proxyTechNewsRequest } from "../../api/_technewsProxy.js";

function clientIdFromEvent(event) {
  const headers = event.headers || {};
  const forwarded = headers["x-forwarded-for"] || headers["client-ip"] || "anonymous";
  return String(forwarded).split(",")[0].trim() || "anonymous";
}

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Method not allowed." }),
    };
  }

  try {
    const path = event.queryStringParameters?.path;
    const result = await proxyTechNewsRequest(path, {
      clientId: clientIdFromEvent(event),
    });

    return {
      statusCode: result.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      },
      body: JSON.stringify(result.body),
    };
  } catch {
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Proxy request to GNews failed." }),
    };
  }
}
