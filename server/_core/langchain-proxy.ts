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


const fallbackLandingServices = [
  { id: "skin", name: "皮肤管理", description: "从基础护理到深度修复，改善暗沉、敏感、毛孔和屏障问题。", icon: "Sparkles", services: [
    { id: "101", name: "超皮秒祛斑", fullName: "超皮秒色素管理", description: "通过皮秒级激光脉冲击碎色素颗粒，适合雀斑、晒斑、色沉等问题。", shortDescription: "淡斑提亮，肤色更均匀", indications: ["雀斑", "晒斑", "色沉", "肤色暗沉"], contraindications: ["孕期", "光敏感", "治疗区感染"], treatmentDuration: "30-45分钟", recoveryTime: "1-3天", painLevel: 3, priceMin: 2980, priceMax: 6800, priceUnit: "次", effects: ["淡化色斑", "提亮肤色", "改善肤质"], risks: ["短暂泛红", "轻微结痂", "反黑风险需防晒管理"], preCare: "治疗前避免暴晒，停用刺激性护肤品。", postCare: "严格防晒，按医嘱补水修复。", technology: "皮秒激光", equipment: "进口皮秒设备", recommendedCourses: "3次为一疗程" },
  ] },
  { id: "injection", name: "注射美容", description: "面部精细化注射，改善凹陷、轮廓和动态纹。", icon: "Shield", services: [
    { id: "102", name: "水光焕肤", description: "补水提亮，改善干燥细纹和肤质粗糙。", shortDescription: "补水、提亮、细腻肤质", indications: ["干燥", "细纹", "暗沉"], contraindications: ["孕期", "皮肤感染", "严重过敏体质"], treatmentDuration: "45分钟", recoveryTime: "1-2天", painLevel: 2, priceMin: 1280, priceMax: 3980, priceUnit: "次", effects: ["补水", "提亮", "改善细纹"], risks: ["短暂针眼", "轻微泛红"], preCare: "治疗前保持皮肤稳定。", postCare: "24小时内避免彩妆和高温环境。" },
  ] },
  { id: "laser", name: "光电项目", description: "非手术光电抗衰和肤质改善项目。", icon: "Star", services: [
    { id: "103", name: "热玛吉紧致", description: "通过射频能量刺激胶原收缩和新生，改善松弛。", shortDescription: "紧致轮廓，改善松弛", indications: ["面部松弛", "下颌线模糊", "轻中度皱纹"], contraindications: ["孕期", "植入电子设备", "治疗区感染"], treatmentDuration: "60-90分钟", recoveryTime: "基本无恢复期", painLevel: 5, priceMin: 9800, priceMax: 26800, priceUnit: "次", effects: ["紧致提升", "轮廓改善", "胶原新生"], risks: ["短暂红肿", "热感不适"], preCare: "治疗前充分面诊评估。", postCare: "加强保湿，避免暴晒和高温护理。" },
  ] },
  { id: "antiaging", name: "抗衰紧致", description: "围绕轮廓、纹路、肤质制定综合抗衰方案。", icon: "Clock", services: [
    { id: "104", name: "综合抗衰方案", description: "结合光电、注射和皮肤管理，制定个性化抗衰计划。", shortDescription: "多维抗衰，定制方案", indications: ["松弛", "细纹", "轮廓下垂", "肤质下降"], contraindications: ["孕期", "急性炎症", "严重基础疾病未控制"], treatmentDuration: "按方案制定", recoveryTime: "按项目不同", painLevel: 3, priceMin: 6800, priceMax: 39800, priceUnit: "方案", effects: ["紧致", "淡纹", "肤质改善"], risks: ["因项目组合而异"], preCare: "先面诊评估衰老层次。", postCare: "遵循分阶段护理和复诊计划。" },
  ] },
];

function findFallbackLandingService(id: number) {
  return fallbackLandingServices.flatMap(category => category.services).find(service => Number(service.id) === id) || null;
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
      const conversations = await getAllConversations(
        Number(limit) || 50,
        Number(offset) || 0
      );
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
      const looksLikeLandingCategories = Array.isArray(projects) && projects.some((item: any) => Array.isArray(item?.services));
      res.status(200).json(looksLikeLandingCategories ? projects : fallbackLandingServices);
    } catch (err) {
      console.error("[services] 查询失败，使用兜底服务:", err);
      res.status(200).json(fallbackLandingServices);
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
        const fallback = findFallbackLandingService(id);
        if (fallback) {
          res.status(200).json(fallback);
          return;
        }
        res.status(404).json({ detail: "服务项目不存在" });
        return;
      }
      res.status(200).json(project);
    } catch (err) {
      console.error("[service_detail] 查询失败，使用兜底服务:", err);
      const fallback = findFallbackLandingService(id);
      if (fallback) {
        res.status(200).json(fallback);
        return;
      }
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
