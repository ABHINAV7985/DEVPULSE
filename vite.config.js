import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { proxyTechNewsRequest } from "./api/_technewsProxy.js";

function localApiPlugin(mode) {
  const env = loadEnv(mode, process.cwd(), "");

  // Keep the GNews key on the local Vite server only.
  if (env.GNEWS_API_KEY && !process.env.GNEWS_API_KEY) {
    process.env.GNEWS_API_KEY = env.GNEWS_API_KEY;
  }

  return {
    name: "devpulse-local-api",

    configureServer(server) {
      server.middlewares.use("/api/technews", async (req, res) => {
        if (req.method !== "GET") {
          res.statusCode = 405;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ message: "Method not allowed." }));
          return;
        }

        try {
          const requestUrl = new URL(
            req.url || "/",
            "http://localhost"
          );
          const path = requestUrl.searchParams.get("path") || "";

          const forwarded =
            req.headers["x-forwarded-for"] ||
            req.socket?.remoteAddress ||
            "local";

          const clientId =
            String(forwarded).split(",")[0].trim() || "local";

          const result = await proxyTechNewsRequest(path, {
            clientId,
          });

          res.statusCode = result.status;
          res.setHeader("Content-Type", "application/json");
          res.setHeader(
            "Cache-Control",
            "public, max-age=300, stale-while-revalidate=600"
          );
          res.end(JSON.stringify(result.body));
        } catch {
          res.statusCode = 502;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              message: "Proxy request to GNews failed.",
            })
          );
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), localApiPlugin(mode)],
}));
