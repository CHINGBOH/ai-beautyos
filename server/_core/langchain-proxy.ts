import type { Express, Request, Response } from "express";
import { handleMedicalChat } from "./medical-chat-route";
import { createLead } from "../db";

/**
 * 浏览器只访问落地页端口（如 3000），由本中间件把 FastAPI 契约转发到 LangChain 后端。
 * 与 docker-compose 里 Nginx 将 /api/* 指到 backend:8000 的模式一致。
 */
const UPSTREAM = (
  process.env.LANGCHAIN_BACKEND_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

function upstreamPath(req: Request): string {
  const u = new URL(req.originalUrl || req.url, "http://127.0.0.1");
  return `${u.pathname}${u.search}`;
}

async function forwardToLangchain(req: Request, res: Response): Promise<void> {
  const target = `${UPSTREAM}${upstreamPath(req)}`;
  const method = req.method.toUpperCase();
  const hasBody = !["GET", "HEAD"].includes(method);

  const headers: Record<string, string> = {};
  if (hasBody) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const upstreamResponse = await fetch(target, {
      method,
      headers,
      body: hasBody ? JSON.stringify(req.body ?? {}) : undefined,
    });

    const buffer = Buffer.from(await upstreamResponse.arrayBuffer());
    res.status(upstreamResponse.status);
    const contentType = upstreamResponse.headers.get("content-type");
    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }
    res.send(buffer);
  } catch (err) {
    console.error("[langchain-proxy] forward failed:", target, err);
    res.status(502).json({
      detail: `无法连接 LangChain 后端 (${UPSTREAM})。请在 my-langchain-ui/backend 启动：uvicorn main:app --host 0.0.0.0 --port 8000，并在 backend/.env 配置 OPENROUTER_API_KEY。`,
    });
  }
}

export function registerLangchainBackendProxy(app: Express): void {
  // 落地页预约 - 已实现数据库持久化
  app.post("/api/landing/appointments", async (req, res) => {
    const { name, phone, service_type, appointment_time, notes } =
      req.body || {};
    if (!name || !phone) {
      res.status(400).json({ detail: "姓名和手机号不能为空" });
      return;
    }
    try {
      // 创建 leads 记录
      const result = await createLead({
        name: String(name),
        phone: String(phone),
        source: "landing-page",
        interestedServices: service_type ? String(service_type) : null,
        message: appointment_time
          ? `预约时间: ${appointment_time}, 预约项目: ${service_type || "待确认"}`
          : service_type
            ? `预约项目：${service_type}`
            : null,
        status: "new",
        followUpDate: appointment_time
          ? new Date(appointment_time).toISOString()
          : null,
      });
      console.log("[appointment] 新预约已写入 DB:", {
        id: result?.id,
        name,
        phone,
        service_type,
      });
      res.status(200).json({
        success: true,
        message: "预约成功！我们会尽快联系您。",
        lead_id: result?.id ?? null,
      });
    } catch (err) {
      console.error("[appointment] 写入 DB 失败:", err);
      res.status(500).json({ detail: "预约失败，请稍后重试" });
    }
  });

  // 获取客户列表
  app.get("/api/customers", async (req, res) => {
    const { limit = 50, offset = 0, tier, status } = req.query;
    try {
      const { getAllCustomers } = await import("../db");
      const customers = await getAllCustomers(
        tier as string | undefined,
        status as string | undefined,
        Number(limit) || 50,
        Number(offset) || 0
      );
      res.status(200).json(customers);
    } catch (err) {
      console.error("[customers] 查询失败:", err);
      res.status(500).json({ detail: "获取客户列表失败" });
    }
  });

  // 获取客户详情
  app.get("/api/customers/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ detail: "无效的客户ID" });
      return;
    }
    try {
      const { getCustomerById } = await import("../db");
      const customer = await getCustomerById(id);
      if (!customer) {
        res.status(404).json({ detail: "客户不存在" });
        return;
      }
      res.status(200).json(customer);
    } catch (err) {
      console.error("[customers] 查询失败:", err);
      res.status(500).json({ detail: "获取客户详情失败" });
    }
  });

  // 获取待处理的预约/线索列表
  app.get("/api/leads", async (req, res) => {
    try {
      const { getAllLeads } = await import("../db");
      const leads = await getAllLeads();
      res.status(200).json(leads);
    } catch (err) {
      console.error("[leads] 查询失败:", err);
      res.status(500).json({ detail: "获取线索列表失败" });
    }
  });

  // 获取即将到期的预约
  app.get("/api/appointments/upcoming", async (req, res) => {
    const { limit = 20 } = req.query;
    try {
      const { getUpcomingAppointments } = await import("../db");
      const appointments = await getUpcomingAppointments(Number(limit) || 20);
      res.status(200).json(appointments);
    } catch (err) {
      console.error("[appointments] 查询失败:", err);
      res.status(500).json({ detail: "获取预约列表失败" });
    }
  });

  // 对话相关 API (Node.js 端实现)
  app.get("/api/conversations", async (req, res) => {
    const { limit = 50, offset = 0 } = req.query;
    try {
      const { getAllConversations } = await import("../db");
      const conversations = await getAllConversations();
      res.status(200).json(conversations);
    } catch (err) {
      console.error("[conversations] 查询失败:", err);
      res.status(500).json({ detail: "获取对话列表失败" });
    }
  });

  app.get("/api/conversations/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ detail: "无效的对话ID" });
      return;
    }
    try {
      const { getMessagesByConversationId } = await import("../db");
      const messages = await getMessagesByConversationId(id);
      res.status(200).json(messages);
    } catch (err) {
      console.error("[conversation_detail] 查询失败:", err);
      res.status(500).json({ detail: "获取对话详情失败" });
    }
  });

  app.post("/api/medical_chat", (req, res) => {
    void handleMedicalChat(req, res);
  });

  app.get("/api/health", async (_req, res) => {
    try {
      const upstreamResponse = await fetch(`${UPSTREAM}/health`);
      const body = await upstreamResponse.text();
      res.status(upstreamResponse.status);
      const ct = upstreamResponse.headers.get("content-type");
      if (ct) res.setHeader("Content-Type", ct);
      res.send(body);
    } catch (err) {
      res.status(502).json({
        detail: `无法连接 LangChain 后端 (${UPSTREAM})`,
      });
    }
  });

  // 服务项目 API - 从数据库获取
  app.get("/api/landing/services", async (req, res) => {
    try {
      const { getAllMedicalProjects } = await import("../db");
      const projects = await getAllMedicalProjects(true);
      res.status(200).json(projects);
    } catch (err) {
      console.error("[services] 查询失败:", err);
      res.status(500).json({ detail: "获取服务项目列表失败" });
    }
  });

  app.get("/api/landing/services/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ detail: "无效的服务项目ID" });
      return;
    }
    try {
      const { getMedicalProjectById } = await import("../db");
      const project = await getMedicalProjectById(id);
      if (!project) {
        res.status(404).json({ detail: "服务项目不存在" });
        return;
      }
      res.status(200).json(project);
    } catch (err) {
      console.error("[service_detail] 查询失败:", err);
      res.status(500).json({ detail: "获取服务项目详情失败" });
    }
  });

  // 其他未匹配的 API 请求转发到 FastAPI 后端
  app.use("/api/landing", (req, res) => {
    void forwardToLangchain(req, res);
  });

  // 将所有剩余 /api/* 请求透传到上游后端（Go 后端等）
  app.use("/api", (req, res) => {
    void forwardToLangchain(req, res);
  });
}
