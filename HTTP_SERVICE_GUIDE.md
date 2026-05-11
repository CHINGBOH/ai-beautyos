# HTTP 服务使用指南

## 概述

本项目实现了一个**稳健抗鲁**的 HTTP 服务模块，提供统一的 HTTP 请求接口、智能重试机制、全面的错误处理和详细的监控功能。

## 核心特性

### 1. 稳健抗鲁 (Robustness & Stability)

✅ **智能重试机制**
- 指数退避算法
- 可配置的重试次数和延迟
- 基于错误类型和状态码的重试策略

✅ **全面的错误处理**
- 错误分类（网络、超时、服务器、客户端）
- 详细的错误信息
- 自定义错误类

✅ **超时保护**
- 请求超时控制
- 连接超时配置
- 自动请求取消

✅ **熔断器模式**
- 自动熔断保护
- 半开状态恢复
- 防止级联故障

### 2. 效果可视化 (Visibility & Verification)

✅ **详细的请求日志**
- 每个请求的完整记录
- 响应时间统计
- 成功/失败状态

✅ **实时监控**
- 请求统计信息
- 错误分布分析
- 性能指标追踪

✅ **健康检查**
- 系统健康评估
- 问题诊断
- 性能瓶颈识别

### 3. 开源优先 (Open Source First)

✅ **基于成熟库**
- Axios (HTTP 客户端)
- TypeScript (类型安全)
- 无额外依赖

✅ **标准接口**
- RESTful API 兼容
- 统一的请求/响应格式
- 易于集成

## 快速开始

### 基本使用

```typescript
import { httpGet, httpPost, HttpServiceError, ErrorType } from "./server/_core/httpService";

// GET 请求
try {
  const response = await httpGet("https://api.example.com/data");
  console.log(response.data);
  console.log(`响应时间: ${response.duration}ms`);
} catch (error) {
  if (error instanceof HttpServiceError) {
    console.error(`错误类型: ${error.detail.type}`);
    console.error(`状态码: ${error.detail.statusCode}`);
    console.error(`错误消息: ${error.detail.message}`);
  }
}

// POST 请求
try {
  const response = await httpPost(
    "https://api.example.com/users",
    { name: "John", email: "john@example.com" }
  );
  console.log("创建成功:", response.data);
} catch (error) {
  console.error("创建失败:", error);
}
```

### 高级配置

```typescript
import { httpGet } from "./server/_core/httpService";

// 自定义重试配置
const response = await httpGet("https://api.example.com/data", {
  timeout: 10000, // 10秒超时
  retries: {
    maxRetries: 5, // 最多重试5次
    initialDelay: 500, // 初始延迟500ms
    maxDelay: 10000, // 最大延迟10秒
    backoffFactor: 2, // 退避因子2
    retryableErrors: [ErrorType.NETWORK, ErrorType.TIMEOUT],
    retryableStatusCodes: [429, 500, 502, 503, 504],
    onRetry: (error, attempt) => {
      console.log(`重试第 ${attempt + 1} 次: ${error.detail.message}`);
    },
  },
  headers: {
    "Authorization": "Bearer token",
    "Content-Type": "application/json",
  },
});
```

## 错误处理

### 错误类型

```typescript
enum ErrorType {
  NETWORK = "NETWORK",           // 网络连接错误
  TIMEOUT = "TIMEOUT",           // 请求超时
  SERVER_ERROR = "SERVER_ERROR", // 服务器错误 (5xx)
  CLIENT_ERROR = "CLIENT_ERROR", // 客户端错误 (4xx)
  PARSE_ERROR = "PARSE_ERROR",   // 响应解析错误
  UNKNOWN = "UNKNOWN",           // 未知错误
}
```

### 错误处理示例

```typescript
import { HttpServiceError, ErrorType } from "./server/_core/httpService";

try {
  const response = await httpGet("https://api.example.com/data");
} catch (error) {
  if (error instanceof HttpServiceError) {
    switch (error.detail.type) {
      case ErrorType.NETWORK:
        console.error("网络错误，请检查连接");
        break;
      case ErrorType.TIMEOUT:
        console.error("请求超时，请稍后重试");
        break;
      case ErrorType.SERVER_ERROR:
        console.error(`服务器错误: ${error.detail.statusCode}`);
        break;
      case ErrorType.CLIENT_ERROR:
        console.error(`客户端错误: ${error.detail.statusCode}`);
        // 4xx 错误通常不需要重试
        break;
      default:
        console.error("未知错误");
    }
  }
}
```

## 监控和分析

### 获取请求统计

```typescript
import { getHttpStats } from "./server/_core/httpService";

const stats = getHttpStats();
console.log(`总请求数: ${stats.total}`);
console.log(`成功请求: ${stats.success}`);
console.log(`失败请求: ${stats.failed}`);
console.log(`成功率: ${stats.successRate.toFixed(2)}%`);
console.log(`平均响应时间: ${stats.avgDuration}ms`);
console.log(`错误分布:`, stats.errorBreakdown);
```

### 获取最近的请求

```typescript
import { getRecentHttpMetrics } from "./server/_core/httpService";

const recentMetrics = getRecentHttpMetrics(10);
recentMetrics.forEach(metric => {
  console.log(`${metric.method} ${metric.url}`);
  console.log(`  状态: ${metric.success ? "成功" : "失败"}`);
  console.log(`  响应时间: ${metric.duration}ms`);
  console.log(`  重试次数: ${metric.retryCount}`);
});
```

### 使用监控工具

```bash
# 查看统计信息
npx tsx scripts/http-monitor.ts stats

# 查看最近的请求
npx tsx scripts/http-monitor.ts recent 20

# 查看性能分析
npx tsx scripts/http-monitor.ts performance

# 查看健康检查
npx tsx scripts/http-monitor.ts health

# 导出监控数据
npx tsx scripts/http-monitor.ts export > metrics.json

# 清空监控数据
npx tsx scripts/http-monitor.ts clear

# 重置熔断器
npx tsx scripts/http-monitor.ts reset
```

## 集成到现有代码

### 示例 1: 替换现有的 fetch 调用

**之前:**
```typescript
const response = await fetch("https://api.example.com/data");
if (!response.ok) {
  throw new Error(`HTTP error! status: ${response.status}`);
}
const data = await response.json();
```

**之后:**
```typescript
import { httpGet } from "./server/_core/httpService";

const { data } = await httpGet("https://api.example.com/data");
```

### 示例 2: 替换现有的 axios 调用

**之前:**
```typescript
import axios from "axios";

const response = await axios.get("https://api.example.com/data", {
  timeout: 5000,
});
```

**之后:**
```typescript
import { httpGet } from "./server/_core/httpService";

const { data, status, duration } = await httpGet("https://api.example.com/data", {
  timeout: 5000,
});
```

### 示例 3: 在 WeWork API 中使用

**文件:** `server/wework-api.ts`

```typescript
import { httpGet, httpPost, HttpServiceError, ErrorType } from "./_core/httpService";

export async function getAccessToken(): Promise<string> {
  try {
    const { data } = await httpGet<{
      access_token: string;
      expires_in: number;
    }>(`${WEWORK_API_BASE}/cgi-bin/gettoken`, {
      params: {
        corpid: config.corpId,
        corpsecret: config.corpSecret,
      },
      retries: {
        maxRetries: 2,
        initialDelay: 1000,
      },
    });

    return data.access_token;
  } catch (error) {
    if (error instanceof HttpServiceError) {
      if (error.detail.type === ErrorType.TIMEOUT) {
        console.error("获取 Access Token 超时");
      } else if (error.detail.type === ErrorType.NETWORK) {
        console.error("网络错误，无法获取 Access Token");
      }
    }
    throw error;
  }
}
```

### 示例 4: 在 DeepSeek API 中使用

**文件:** `server/deepseek.ts`

```typescript
import { httpPost, HttpServiceError, ErrorType } from "./_core/httpService";

export async function generateChatResponse(
  messages: ChatMessage[],
  temperature = 0.7
): Promise<string> {
  try {
    const { data } = await httpPost<ChatCompletionResponse>(
      DEEPSEEK_API_URL,
      {
        model: "deepseek-chat",
        messages,
        temperature,
        max_tokens: 1000,
      },
      {
        headers: {
          "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
        },
        timeout: 60000,
        retries: {
          maxRetries: 3,
          initialDelay: 2000,
          backoffFactor: 2,
        },
      }
    );

    return data.choices[0]?.message.content || "";
  } catch (error) {
    if (error instanceof HttpServiceError) {
      console.error(`DeepSeek API 错误: ${error.detail.type} - ${error.detail.message}`);
    }
    throw error;
  }
}
```

## 测试

### 运行测试套件

```bash
npx tsx scripts/test-http-service.ts
```

### 运行特定测试

```bash
# 测试错误分类
npx tsx scripts/debug-error.ts

# 测试 500 错误重试
npx tsx scripts/debug-500.ts

# 测试超时处理
npx tsx scripts/debug-timeout.ts
```

## 配置选项

### RetryConfig

```typescript
interface RetryConfig {
  maxRetries?: number;           // 最大重试次数 (默认: 3)
  initialDelay?: number;         // 初始延迟 (毫秒, 默认: 1000)
  maxDelay?: number;             // 最大延迟 (毫秒, 默认: 30000)
  backoffFactor?: number;        // 退避因子 (默认: 2)
  retryableErrors?: ErrorType[]; // 可重试的错误类型
  retryableStatusCodes?: number[]; // 可重试的 HTTP 状态码
  onRetry?: (error: HttpServiceError, attempt: number) => void; // 重试回调
}
```

### TimeoutConfig

```typescript
interface TimeoutConfig {
  request?: number;  // 请求超时 (毫秒, 默认: 30000)
  connect?: number;  // 连接超时 (毫秒, 默认: 10000)
}
```

### HttpRequestConfig

```typescript
interface HttpRequestConfig {
  method?: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  data?: unknown;
  timeout?: number;
  retries?: RetryConfig;
  signal?: AbortSignal;
  axiosInstance?: AxiosInstance;
}
```

## 最佳实践

### 1. 使用适当的重试策略

```typescript
// 对于关键 API，使用更激进的重试策略
const criticalResponse = await httpGet("https://api.example.com/critical", {
  retries: {
    maxRetries: 5,
    initialDelay: 500,
    backoffFactor: 2,
  },
});

// 对于非关键 API，使用较宽松的重试策略
const optionalResponse = await httpGet("https://api.example.com/optional", {
  retries: {
    maxRetries: 1,
    initialDelay: 1000,
  },
});
```

### 2. 处理特定错误类型

```typescript
try {
  const response = await httpGet(url);
} catch (error) {
  if (error instanceof HttpServiceError) {
    switch (error.detail.type) {
      case ErrorType.TIMEOUT:
        // 显示用户友好的超时消息
        showToast("请求超时，请检查网络连接");
        break;
      case ErrorType.NETWORK:
        // 引导用户检查网络
        showToast("网络连接失败，请检查您的网络设置");
        break;
      case ErrorType.SERVER_ERROR:
        // 记录服务器错误
        logError("Server error", error);
        break;
      case ErrorType.CLIENT_ERROR:
        // 处理客户端错误（401, 403, 404 等）
        if (error.detail.statusCode === 401) {
          // 重定向到登录页面
          redirectToLogin();
        }
        break;
    }
  }
}
```

### 3. 监控和告警

```typescript
// 定期检查服务健康
setInterval(() => {
  const stats = getHttpStats();
  if (stats.successRate < 90) {
    console.warn(`成功率过低: ${stats.successRate}%`);
    // 发送告警
    sendAlert(`HTTP 成功率过低: ${stats.successRate}%`);
  }
}, 60000); // 每分钟检查一次
```

### 4. 使用熔断器保护

```typescript
// HTTP 服务内置了熔断器，会自动保护
// 当某个域名连续失败时，熔断器会开启
// 防止级联故障

// 可以手动重置熔断器
import { resetCircuitBreakers } from "./server/_core/httpService";

resetCircuitBreakers();
```

## 故障排查

### 常见问题

**Q: 为什么请求没有重试？**

A: 检查以下几点：
1. 错误类型是否在 `retryableErrors` 中
2. HTTP 状态码是否在 `retryableStatusCodes` 中
3. 是否已达到最大重试次数

**Q: 如何查看详细的请求日志？**

A: 使用监控工具：
```bash
npx tsx scripts/http-monitor.ts recent 50
```

**Q: 熔断器什么时候会开启？**

A: 默认配置下，当某个域名连续 5 次失败时，熔断器会开启，持续 60 秒。

**Q: 如何自定义重试策略？**

A: 在请求配置中提供 `retries` 选项：
```typescript
await httpGet(url, {
  retries: {
    maxRetries: 5,
    initialDelay: 2000,
    backoffFactor: 3,
  },
});
```

## 性能优化

### 1. 减少重试次数

对于非关键请求，减少重试次数以提高响应速度：

```typescript
await httpGet(url, {
  retries: {
    maxRetries: 1,
  },
});
```

### 2. 调整超时时间

根据 API 的典型响应时间调整超时：

```typescript
await httpGet(url, {
  timeout: 5000, // 5 秒超时
});
```

### 3. 使用连接池

HTTP 服务使用 Axios，默认会复用连接，无需额外配置。

## 总结

HTTP 服务模块提供了：
- ✅ 稳健的错误处理和重试机制
- ✅ 详细的日志和监控功能
- ✅ 基于成熟开源库的实现
- ✅ 易于集成和使用

遵循项目的三大原则：**稳健抗鲁**、**效果可视化**、**开源优先**，为医美 CRM 系统提供可靠的 HTTP 通信能力。
