import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerWeworkWebhookRoutes } from "../wework-webhook";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic } from "./static";
import { restApi } from "../routers/rest-api"; // 导入
import { validateAndPrint } from "./env-validation";
import { registerMetricsRoute, startMetricsCollection } from "./metrics";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

const SERVER_START_TIME = new Date();

async function startServer() {
  // 在启动前验证环境变量
  validateAndPrint();

  // Start sampling event-loop lag as early as possible so /metrics reflects
  // real boot-time delay too.
  startMetricsCollection();

  const app = express();
  const server = createServer(app);

  // Health check — must be registered BEFORE any body parser / auth / vite
  // middleware so probes never hit application logic.
  // Liveness only: returns 200 as long as the event loop is alive. Do not
  // perform DB checks here (use a separate /readyz if/when needed).
  app.get("/healthz", (_req, res) => {
    res.status(200).json({
      status: "ok",
      service: "ai-beautyos",
      commit: process.env.GIT_COMMIT || "unknown",
      startedAt: SERVER_START_TIME.toISOString(),
      uptimeSec: Math.round(process.uptime()),
    });
  });

  // Process metrics — RSS, heap, event loop lag. Cheap, no DB hit. See
  // docs/deployment/runtime-governance.md for the SLO / alert thresholds.
  registerMetricsRoute(app, SERVER_START_TIME);

  // 企业微信Webhook回调（需要在JSON解析之前，因为企业微信发送的是XML）
  // 使用text parser处理所有XML请求（包括text/xml和application/xml）
  app.use("/api/wework/webhook", express.text({ type: ["text/xml", "application/xml", "text/plain"] }));
  registerWeworkWebhookRoutes(app);
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // 挂载REST API
  app.use("/api/rest", restApi);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000", 10);

  // Strict bind in production / container deployments — health probes and
  // reverse proxies must be able to rely on the configured PORT. In dev we
  // keep the port-scanning fallback for convenience.
  let port = preferredPort;
  if (process.env.NODE_ENV !== "production") {
    port = await findAvailablePort(preferredPort);
    if (port !== preferredPort) {
      console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
    }
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
