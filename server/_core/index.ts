import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerWeworkWebhookRoutes } from "../wework-webhook";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { restApi } from "../routers/rest-api";
import { validateAndPrint } from "./env-validation";
import { registerLangchainBackendProxy } from "./langchain-proxy";
// import { registerTestRoute } from "./test-route";
import { runBirthdayHolidayReminders } from "../jobs/birthday-holiday";

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

async function startServer() {
  // 在启动前验证环境变量
  validateAndPrint();

  const app = express();
  const server = createServer(app);
  
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

  // 将落地页调用的 FastAPI 契约转发到 Python 后端（默认 127.0.0.1:8000）
  registerLangchainBackendProxy(app);

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  const host = process.env.HOST || "0.0.0.0";
  server.listen(port, host, () => {
    console.log(`Server running on http://localhost:${port}/`);
    if (host === "0.0.0.0") {
      console.log(`  (局域网访问需用本机 IP，如 http://<本机IP>:${port}/)`);
    }
    // 进程内定时：每日执行生日/节日提醒触发器（首次延后 1 分钟，之后每 24 小时）
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    setTimeout(() => {
      runBirthdayHolidayReminders().catch((e) =>
        console.error("[cron] birthday-holiday run error:", e instanceof Error ? e.message : e)
      );
    }, 60 * 1000);
    setInterval(() => {
      runBirthdayHolidayReminders().catch((e) =>
        console.error("[cron] birthday-holiday run error:", e instanceof Error ? e.message : e)
      );
    }, MS_PER_DAY);
  });
}

startServer().catch(console.error);
