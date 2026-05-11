# HTTP 服务集成示例

本文档提供了在医美 CRM 系统中集成 HTTP 服务的具体示例。

## 1. WeWork API 集成

### 文件: `server/wework-api.ts`

```typescript
/**
 * 企业微信真实API调用 - 使用 HTTP 服务
 */

import { 
  httpGet, 
  httpPost, 
  HttpServiceError, 
  ErrorType 
} from "./_core/httpService";
import { getWeworkConfig, updateAccessToken } from "./wework-db";

const WEWORK_API_BASE = "https://qyapi.weixin.qq.com";

/**
 * 获取Access Token（带缓存和重试）
 */
export async function getAccessToken(): Promise<string> {
  const config = await getWeworkConfig();
  if (!config || !config.corpId || !config.corpSecret) {
    throw new Error("企业微信配置不完整");
  }

  // 检查是否有有效的缓存token
  if (config.accessToken && config.tokenExpiresAt) {
    const now = new Date();
    if (config.tokenExpiresAt > now) {
      return config.accessToken;
    }
  }

  // 获取新token
  try {
    const { data } = await httpGet<{
      errcode: number;
      errmsg: string;
      access_token: string;
      expires_in: number;
    }>(`${WEWORK_API_BASE}/cgi-bin/gettoken`, {
      params: {
        corpid: config.corpId,
        corpsecret: config.corpSecret,
      },
      retries: {
        maxRetries: 3,
        initialDelay: 1000,
        onRetry: (error, attempt) => {
          console.log(`[WeWork] 重试获取 Access Token (第 ${attempt + 1} 次)`);
        },
      },
    });

    if (data.errcode !== 0) {
      throw new Error(`获取Access Token失败: ${data.errmsg}`);
    }

    const { access_token, expires_in } = data;
    await updateAccessToken(access_token, expires_in);

    return access_token;
  } catch (error) {
    if (error instanceof HttpServiceError) {
      handleWeworkError(error, "获取 Access Token");
    }
    throw error;
  }
}

/**
 * 创建"联系我"二维码
 */
export async function createContactWay(params: {
  type: number;
  scene: number;
  remark?: string;
  skip_verify?: boolean;
  state?: string;
  user?: string[];
}): Promise<{
  errcode: number;
  errmsg: string;
  config_id?: string;
  qr_code?: string;
}> {
  try {
    const accessToken = await getAccessToken();
    
    const { data } = await httpPost<any>(
      `${WEWORK_API_BASE}/cgi-bin/externalcontact/add_contact_way`,
      {
        type: params.type,
        scene: params.scene,
        style: 1,
        remark: params.remark,
        skip_verify: params.skip_verify ?? true,
        state: params.state,
        user: params.user,
      },
      {
        params: {
          access_token: accessToken,
        },
        retries: {
          maxRetries: 2,
        },
      }
    );

    return data;
  } catch (error) {
    if (error instanceof HttpServiceError) {
      handleWeworkError(error, "创建联系方式");
    }
    throw error;
  }
}

/**
 * 发送文本消息
 */
export async function sendTextMessage(
  externalUserId: string, 
  content: string
): Promise<{
  errcode: number;
  errmsg: string;
}> {
  try {
    const config = await getWeworkConfig();
    if (!config || !config.agentId) {
      throw new Error("企业微信AgentId未配置");
    }

    const accessToken = await getAccessToken();
    
    const { data } = await httpPost<any>(
      `${WEWORK_API_BASE}/cgi-bin/message/send`,
      {
        touser: externalUserId,
        msgtype: "text",
        agentid: config.agentId,
        text: {
          content,
        },
      },
      {
        params: {
          access_token: accessToken,
        },
        retries: {
          maxRetries: 3,
          initialDelay: 500,
        },
      }
    );

    return data;
  } catch (error) {
    if (error instanceof HttpServiceError) {
      handleWeworkError(error, "发送消息");
    }
    throw error;
  }
}

/**
 * 处理企业微信 API 错误
 */
function handleWeworkError(error: HttpServiceError, operation: string): void {
  console.error(`[WeWork ${operation}] 错误:`, error.detail.message);
  
  switch (error.detail.type) {
    case ErrorType.TIMEOUT:
      console.error(`[WeWork] ${operation} 超时，请检查网络连接`);
      break;
    case ErrorType.NETWORK:
      console.error(`[WeWork] ${operation} 网络错误`);
      break;
    case ErrorType.SERVER_ERROR:
      console.error(`[WeWork] ${operation} 服务器错误: ${error.detail.statusCode}`);
      break;
    case ErrorType.CLIENT_ERROR:
      if (error.detail.statusCode === 401) {
        console.error(`[WeWork] ${operation} 认证失败，请检查配置`);
      } else if (error.detail.statusCode === 404) {
        console.error(`[WeWork] ${operation} 接口不存在`);
      }
      break;
  }
}
```

## 2. DeepSeek API 集成

### 文件: `server/deepseek.ts`

```typescript
/**
 * DeepSeek LLM 集成 - 使用 HTTP 服务
 */

import { 
  httpPost, 
  HttpServiceError, 
  ErrorType 
} from "./_core/httpService";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * 调用 DeepSeek API 生成对话回复
 */
export async function generateChatResponse(
  messages: ChatMessage[],
  temperature = 0.7
): Promise<string> {
  try {
    const { data } = await httpPost<{
      id: string;
      choices: Array<{
        message: {
          role: string;
          content: string;
        };
        finish_reason: string;
      }>;
      usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
    }>(
      DEEPSEEK_API_URL,
      {
        model: "deepseek-chat",
        messages,
        temperature,
        max_tokens: 1000,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
        },
        timeout: 60000, // 60秒超时
        retries: {
          maxRetries: 3,
          initialDelay: 2000,
          backoffFactor: 2,
          retryableErrors: [ErrorType.TIMEOUT, ErrorType.NETWORK],
          retryableStatusCodes: [429, 500, 502, 503, 504],
          onRetry: (error, attempt) => {
            console.log(`[DeepSeek] 重试第 ${attempt + 1} 次: ${error.detail.message}`);
          },
        },
      }
    );

    const content = data.choices[0]?.message.content;
    if (!content) {
      throw new Error("Empty response from DeepSeek API");
    }

    return content;
  } catch (error) {
    if (error instanceof HttpServiceError) {
      console.error(`[DeepSeek API] 错误: ${error.detail.message}`);
      
      switch (error.detail.type) {
        case ErrorType.TIMEOUT:
          console.error("[DeepSeek] API 请求超时，请稍后重试");
          break;
        case ErrorType.NETWORK:
          console.error("[DeepSeek] 网络连接失败");
          break;
        case ErrorType.SERVER_ERROR:
          console.error(`[DeepSeek] 服务器错误: ${error.detail.statusCode}`);
          break;
        case ErrorType.CLIENT_ERROR:
          if (error.detail.statusCode === 401) {
            console.error("[DeepSeek] API 密钥无效");
          } else if (error.detail.statusCode === 429) {
            console.error("[DeepSeek] API 调用频率超限");
          }
          break;
      }
    }
    throw error;
  }
}
```

## 3. Qwen API 集成

### 文件: `server/qwen.ts`

```typescript
/**
 * Qwen API 集成 - 使用 HTTP 服务
 */

import { 
  httpPost, 
  HttpServiceError, 
  ErrorType 
} from "./_core/httpService";

const QWEN_API_URL = process.env.QWEN_API_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
const QWEN_API_KEY = process.env.QWEN_API_KEY || "";

export interface QwenMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * 调用 Qwen API 进行对话
 */
export async function callQwen(messages: QwenMessage[]): Promise<string> {
  if (!QWEN_API_KEY) {
    throw new Error("QWEN_API_KEY is not configured");
  }

  try {
    const { data } = await httpPost<{
      choices: Array<{
        message: {
          role: string;
          content: string;
        };
        finish_reason: string;
      }>;
      usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
    }>(
      QWEN_API_URL,
      {
        model: "qwen-plus",
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${QWEN_API_KEY}`,
        },
        timeout: 60000,
        retries: {
          maxRetries: 3,
          initialDelay: 1000,
        },
      }
    );

    const content = data.choices[0]?.message.content;
    if (!content) {
      throw new Error("Empty response from Qwen API");
    }

    return content;
  } catch (error) {
    if (error instanceof HttpServiceError) {
      console.error(`[Qwen API Error]`, error.response?.data || error.message);
      
      switch (error.detail.type) {
        case ErrorType.TIMEOUT:
          console.error("[Qwen] API 请求超时");
          break;
        case ErrorType.NETWORK:
          console.error("[Qwen] 网络连接失败");
          break;
        case ErrorType.SERVER_ERROR:
          console.error(`[Qwen] 服务器错误: ${error.detail.statusCode}`);
          break;
      }
    }
    throw new Error(
      `Qwen API call failed: ${error instanceof HttpServiceError ? error.detail.message : String(error)}`
    );
  }
}
```

## 4. LLM API 集成

### 文件: `server/_core/llm.ts`

```typescript
/**
 * LLM API 集成 - 使用 HTTP 服务
 */

import { 
  httpPost, 
  HttpServiceError, 
  ErrorType 
} from "./httpService";
import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: string;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: any;
  maxTokens?: number;
  outputSchema?: any;
  responseFormat?: any;
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: any[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

const resolveApiUrl = () =>
  ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? ENV.forgeApiUrl.includes('/chat/completions')
      ? ENV.forgeApiUrl
      : `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
    : "https://forge.manus.im/v1/chat/completions";

const assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
};

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  assertApiKey();

  const { messages, tools, toolChoice, outputSchema, responseFormat } = params;

  const payload: Record<string, unknown> = {
    model: ENV.forgeApiUrl?.includes('dashscope.aliyuncs.com') 
      ? "qwen-plus"
      : "gemini-2.5-flash",
    messages: messages.map(normalizeMessage),
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  if (toolChoice) {
    payload.tool_choice = toolChoice;
  }

  payload.max_tokens = 32768;
  payload.thinking = {
    "budget_tokens": 128
  };

  if (outputSchema || responseFormat) {
    payload.response_format = outputSchema || responseFormat;
  }

  try {
    const { data } = await httpPost<InvokeResult>(
      resolveApiUrl(),
      payload,
      {
        headers: {
          "content-type": "application/json",
          "authorization": `Bearer ${ENV.forgeApiKey}`,
        },
        timeout: 60000,
        retries: {
          maxRetries: 3,
          initialDelay: 2000,
          backoffFactor: 2,
          retryableErrors: [ErrorType.TIMEOUT, ErrorType.NETWORK],
          retryableStatusCodes: [429, 500, 502, 503, 504],
        },
      }
    );

    return data;
  } catch (error) {
    if (error instanceof HttpServiceError) {
      console.error(`[LLM Invoke Failed]`, error.detail.message);
      
      switch (error.detail.type) {
        case ErrorType.TIMEOUT:
          console.error("[LLM] 请求超时");
          break;
        case ErrorType.NETWORK:
          console.error("[LLM] 网络连接失败");
          break;
        case ErrorType.SERVER_ERROR:
          console.error(`[LLM] 服务器错误: ${error.detail.statusCode}`);
          break;
        case ErrorType.CLIENT_ERROR:
          if (error.detail.statusCode === 401) {
            console.error("[LLM] API 密钥无效");
          }
          break;
      }
    }
    throw error;
  }
}

function normalizeMessage(message: Message) {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
}

function ensureArray(
  value: MessageContent | MessageContent[]
): MessageContent[] {
  return Array.isArray(value) ? value : [value];
}

function normalizeContentPart(
  part: MessageContent
): TextContent | ImageContent | FileContent {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
}
```

## 5. 数据 API 集成

### 文件: `server/_core/dataApi.ts`

```typescript
/**
 * 数据 API 集成 - 使用 HTTP 服务
 */

import { 
  httpPost, 
  HttpServiceError, 
  ErrorType 
} from "./httpService";
import { ENV } from "./env";

export type DataApiCallOptions = {
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  pathParams?: Record<string, unknown>;
  formData?: Record<string, unknown>;
};

export async function callDataApi(
  apiId: string,
  options: DataApiCallOptions = {}
): Promise<unknown> {
  if (!ENV.forgeApiUrl) {
    throw new Error("BUILT_IN_FORGE_API_URL is not configured");
  }
  if (!ENV.forgeApiKey) {
    throw new Error("BUILT_IN_FORGE_API_KEY is not configured");
  }

  const baseUrl = ENV.forgeApiUrl.endsWith("/") 
    ? ENV.forgeApiUrl 
    : `${ENV.forgeApiUrl}/`;
  const fullUrl = new URL(
    "webdevtoken.v1.WebDevService/CallApi", 
    baseUrl
  ).toString();

  try {
    const { data } = await httpPost<any>(
      fullUrl,
      {
        apiId,
        query: options.query,
        body: options.body,
        path_params: options.pathParams,
        multipart_form_data: options.formData,
      },
      {
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "connect-protocol-version": "1",
          authorization: `Bearer ${ENV.forgeApiKey}`,
        },
        retries: {
          maxRetries: 2,
          initialDelay: 1000,
        },
      }
    );

    if (data && typeof data === "object" && "jsonData" in data) {
      try {
        return JSON.parse((data as Record<string, string>).jsonData ?? "{}");
      } catch {
        return (data as Record<string, unknown>).jsonData;
      }
    }
    return data;
  } catch (error) {
    if (error instanceof HttpServiceError) {
      console.error(`[Data API] 错误: ${error.detail.message}`);
      
      switch (error.detail.type) {
        case ErrorType.TIMEOUT:
          console.error("[Data API] 请求超时");
          break;
        case ErrorType.NETWORK:
          console.error("[Data API] 网络连接失败");
          break;
        case ErrorType.SERVER_ERROR:
          console.error(`[Data API] 服务器错误: ${error.detail.statusCode}`);
          break;
      }
    }
    throw error;
  }
}
```

## 6. 监控集成

### 在应用启动时初始化监控

```typescript
// server/_core/index.ts
import { getHttpStats } from "./httpService";

// 定期输出 HTTP 统计信息
setInterval(() => {
  const stats = getHttpStats();
  if (stats.total > 0) {
    console.log('[HTTP Stats]', {
      total: stats.total,
      success: stats.success,
      failed: stats.failed,
      successRate: `${stats.successRate.toFixed(2)}%`,
      avgDuration: `${stats.avgDuration}ms`,
      errorBreakdown: stats.errorBreakdown,
    });
  }
}, 300000); // 每5分钟输出一次
```

### 在 tRPC 路由中使用

```typescript
// server/routers/chat.ts
import { httpPost, HttpServiceError, ErrorType } from "../_core/httpService";

export const chatRouter = router({
  sendMessage: publicProcedure
    .input(z.object({
      sessionId: z.string(),
      message: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        // 使用 HTTP 服务调用外部 API
        const { data } = await httpPost<any>(
          "https://api.example.com/chat",
          {
            sessionId: input.sessionId,
            message: input.message,
          },
          {
            timeout: 30000,
            retries: {
              maxRetries: 2,
              initialDelay: 1000,
            },
          }
        );

        return {
          response: data.response,
        };
      } catch (error) {
        if (error instanceof HttpServiceError) {
          // 处理特定的错误类型
          if (error.detail.type === ErrorType.TIMEOUT) {
            throw new Error("AI 响应超时，请稍后重试");
          } else if (error.detail.type === ErrorType.NETWORK) {
            throw new Error("网络连接失败，请检查您的网络");
          } else if (error.detail.type === ErrorType.SERVER_ERROR) {
            throw new Error("AI 服务暂时不可用，请稍后重试");
          }
        }
        throw error;
      }
    }),
});
```

## 总结

通过以上集成示例，可以看到 HTTP 服务在医美 CRM 系统中的广泛应用：

1. **WeWork API**: 企业微信集成，带重试和错误处理
2. **DeepSeek API**: AI 对话服务，带超时和重试
3. **Qwen API**: 备用 AI 服务，带完善的错误处理
4. **LLM API**: 通用 LLM 接口，带工具调用支持
5. **Data API**: 数据服务，带格式处理
6. **监控集成**: 定期统计和报告

所有集成都遵循了项目的三大原则：
- **稳健抗鲁**: 完善的错误处理和重试机制
- **效果可视化**: 详细的日志和错误分类
- **开源优先**: 基于成熟的开源库构建

这些集成示例可以直接用于替换现有的 HTTP 调用，提高系统的可靠性和可维护性。
