/**
 * REST API Router（保留用于外部系统对接，内部管理端统一使用 tRPC）
 * @deprecated GET /customers 和 GET /customers/:id 与 tRPC customers.list / customers.getById 功能重复，
 *   新代码应优先使用 tRPC。REST 端点保留用于外部 cron / 第三方集成。
 */
import express from 'express';
import { getAllLeads, getLeadById } from '../db';
import { runBirthdayHolidayReminders } from '../jobs/birthday-holiday';

export const restApi = express.Router();

/** 简易鉴权中间件 — 要求 Authorization header 匹配 API_SECRET 环境变量 */
function requireApiSecret(req: express.Request, res: express.Response, next: express.NextFunction) {
  const apiSecret = process.env.API_SECRET;
  if (!apiSecret) {
    // 未配置 API_SECRET 则拒绝所有请求，避免生产环境裸奔
    res.status(503).json({ error: 'REST API 未启用，请配置 API_SECRET 环境变量' });
    return;
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${apiSecret}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

restApi.use(requireApiSecret);

// 1. 获取所有客户的REST API
restApi.get('/customers', async (_req, res) => {
  try {
    const leads = await getAllLeads();
    res.json(leads);
  } catch (_error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. 根据ID获取单个客户的REST API
restApi.get('/customers/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    const lead = await getLeadById(id);
    if (lead) {
      res.json(lead);
    } else {
      res.status(404).json({ error: 'Lead not found' });
    }
  } catch (_error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 定时任务：生日/节日提醒（可由 cron 每日调用）
restApi.post('/cron/birthday-holiday', async (_req, res) => {
  try {
    const outcomes = await runBirthdayHolidayReminders();
    res.json({ ok: true, outcomes });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal Server Error' });
  }
});
