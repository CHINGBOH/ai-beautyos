// API 客户端：路径均以 /api/... 开头。
// - 默认同源（空 base）：开发时由 Express 转发到 FastAPI；生产可由 Nginx 转发（见仓库 nginx.conf）。
// - 可设 VITE_API_URL=http://localhost:8000 直连后端，或设完整网关地址。
// - 当部署在子路径（如 /beauty/）下时，Vite 的 import.meta.env.BASE_URL 会
//   自动带上前缀，本函数会在没有显式 VITE_API_URL 时使用它，让所有 fetch
//   走 /beauty/api/... → nginx 反代剥掉 /beauty → 上游正常路由。
function resolveApiBase(): string {
  const raw = import.meta.env.VITE_API_URL;
  if (raw === undefined || raw === "") {
    const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
    return base;
  }
  const base = String(raw).replace(/\/$/, "");
  // docker-compose 曾写 VITE_API_URL=/api，与下方 url 拼接会变成 /api/api/...，此处归一为同源
  if (base === "/api") {
    return "";
  }
  return base;
}

const API_BASE_URL = resolveApiBase();

function formatHttpErrorBody(body: unknown): string {
  if (body == null || typeof body !== 'object') return '请求失败';
  const rec = body as { detail?: unknown; message?: unknown };
  if (rec.detail !== undefined) {
    if (Array.isArray(rec.detail)) {
      return rec.detail.map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join('；');
    }
    return String(rec.detail);
  }
  if (rec.message !== undefined) return String(rec.message);
  return '请求失败';
}

// 统一请求：先读 text 再 JSON.parse，避免 HTML/空 body 导致 json() 抛错进「抱歉遇到了一些问题」黑盒
async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const fullUrl = `${API_BASE_URL}${url}`;
  let response: Response;
  try {
    response = await fetch(fullUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `无法连接接口（请确认落地页 Node 已启动，且 Python 后端在 8000 或已配置 LANGCHAIN_BACKEND_URL）：${msg}`
    );
  }

  const text = await response.text();

  if (!response.ok) {
    let parsed: unknown = {};
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = { detail: text.slice(0, 280) || `HTTP ${response.status}` };
    }
    throw new Error(formatHttpErrorBody(parsed) || `HTTP ${response.status}`);
  }

  if (!text.trim()) {
    throw new Error('服务器返回空 body（请检查 /api/medical_chat 是否由 Express 注册）');
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    const preview = text.slice(0, 100).replace(/\s+/g, ' ');
    throw new Error(
      `接口返回的不是 JSON（常见原因：请求打到了前端页面而不是 API）。URL：${fullUrl}，片段：${preview}`
    );
  }
}

// 落地页 API
export const landingApi = {
  // 提交预约
  createAppointment: (data: {
    name: string;
    phone: string;
    service_type?: string;
    preferred_time?: string;
    notes?: string;
  }) => fetchApi<{ success: boolean; message: string; lead_id?: string }>(
    '/api/landing/appointments',
    { method: 'POST', body: JSON.stringify(data) }
  ),

  // 获取轮播数据
  getHeroSlides: () => fetchApi<Array<{
    id: number;
    brand: string;
    subtitle: string;
    title: string;
    stat: string;
    statLabel: string;
    image_url: string;
    theme: string;
  }>>('/api/landing/hero-slides'),

  // 获取客户评价
  getTestimonials: () => fetchApi<Array<{
    id: number;
    category: string;
    quote: string;
    author: string;
    role: string;
    image_url: string;
    theme: string;
  }>>('/api/landing/testimonials'),

  // 获取统计数据
  getStats: () => fetchApi<{
    customers: number;
    satisfaction: number;
    doctors: number;
    cases: number;
  }>('/api/landing/stats'),

  // 获取服务项目列表
  getServices: () => fetchApi<Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    services: Array<{
      id: string;
      name: string;
      fullName?: string;
      description: string;
      shortDescription: string;
      indications: string[];
      contraindications: string[];
      treatmentDuration: string;
      recoveryTime: string;
      painLevel: number;
      priceMin: number;
      priceMax: number;
      priceUnit: string;
      effects: string[];
      risks: string[];
      preCare: string;
      postCare: string;
      technology?: string;
      equipment?: string;
      recommendedCourses?: string;
    }>;
  }>>('/api/landing/services'),

  // 获取单个服务详情
  getServiceDetail: (serviceId: string) => fetchApi<{
    id: string;
    name: string;
    fullName?: string;
    description: string;
    shortDescription: string;
    indications: string[];
    contraindications: string[];
    treatmentDuration: string;
    recoveryTime: string;
    painLevel: number;
    priceMin: number;
    priceMax: number;
    priceUnit: string;
    effects: string[];
    risks: string[];
    preCare: string;
    postCare: string;
    technology?: string;
    equipment?: string;
    recommendedCourses?: string;
  }>(`/api/landing/services/${serviceId}`),
};

// 医美AI助手API
export const medicalApi = {
  // AI客服对话
  chat: async (
    message: string,
    history?: Array<{ role: string; content: string }>,
    sessionId?: string
  ) => {
    const data = await fetchApi<{ reply?: string }>('/api/medical_chat', {
      method: 'POST',
      body: JSON.stringify({ message, history, session_id: sessionId }),
    });
    if (typeof data?.reply !== 'string') {
      throw new Error('接口 JSON 里缺少 reply 字段');
    }
    return data as { reply: string };
  },
};

// 健康检查
export const healthApi = {
  check: () => fetchApi<{ status: string; message: string }>('/api/health'),
};
