import "dotenv/config";
import express from "express";
import { registerToolServerRoutes } from "./_core/tool-server";
import { validateAndPrint } from "./_core/env-validation";

// Standalone MCP Tool Server (Phase-3).
//
// Same Docker image as Web/API, different entrypoint. Listens on its own
// port (TOOL_SERVER_PORT, default 5001) and exposes ONLY /tools/* + /healthz.
// No tRPC, no UI, no webhook, no static assets. Smaller blast radius.
//
// The embedded tool-server inside the Web/API process stays for now so
// existing callers don't break; flip BEAUTYOS_DISABLE_EMBEDDED_TOOL_SERVER=1
// on the Web side once Hermes / clients are pointed at this service.
//
// Network model (docker-compose):
//   - tool-server is on the beautyos-internal network only.
//   - No public port mapping. Only callers inside the compose network reach it.

const SERVER_START_TIME = new Date();

async function startToolServer() {
  validateAndPrint();

  const app = express();

  app.get("/healthz", (_req, res) => {
    res.status(200).json({
      status: "ok",
      service: "ai-beautyos-tool-server",
      commit: process.env.GIT_COMMIT || "unknown",
      startedAt: SERVER_START_TIME.toISOString(),
      uptimeSec: Math.round(process.uptime()),
    });
  });

  app.use("/tools", express.json({ limit: "1mb" }));
  registerToolServerRoutes(app);

  const port = parseInt(process.env.TOOL_SERVER_PORT || "5001", 10);
  const host = process.env.HOST || "0.0.0.0";

  app.listen(port, host, () => {
    console.log(`[tool-server] listening on http://${host}:${port}/`);
    console.log(`[tool-server] commit=${process.env.GIT_COMMIT || "unknown"}`);
  });
}

startToolServer().catch((err) => {
  console.error("[tool-server] fatal startup error:", err);
  process.exit(1);
});
