# LLM 统一模块

本目录集中维护**助手、客服、职能、内容生成**等场景使用的 LLM 代码，两套逻辑已统一为同一实现。

**架构参考 frontend / backend**：与仓库中 `frontend/src/api/client.ts`（契约）和 `backend/main.py`（Python 实现）对齐——客服对话契约为「请求 message + 可选 history → 响应 reply」；Backend 提供 `POST /api/medical_chat`，Prompt 与本目录 `chat.ts` 中的 `MEDICAL_BEAUTY_SYSTEM_PROMPT` 保持一致；Python 先测客服对话见 `backend/scripts/test_medical_chat.py`。

## 结构

| 文件 | 说明 |
|------|------|
| `types.ts` | 消息、调用参数、返回类型等通用类型 |
| `config.ts` | API 地址与 Key 解析（与 `.env` 一致） |
| `invoke.ts` | 统一调用入口 `invokeLLM` |
| `withRetry.ts` | 带缓存与重试的 `invokeLLMWithRetry` |
| `chat.ts` | 客服/助手对话：`generateChatResponse`、系统 Prompt、客户信息提取 |
| `index.ts` | 统一导出，业务侧从 `../llm` 引用 |

## 使用方式

- **直接调用**：`import { invokeLLM } from "../llm";`
- **带重试/缓存**：`import { invokeLLMWithRetry } from "../llm";`
- **客服对话**：`import { generateChatResponse, MEDICAL_BEAUTY_SYSTEM_PROMPT, extractCustomerInfo } from "../llm";`

## 环境变量

- `DEEPSEEK_API_KEY`：优先使用 DeepSeek
- `BUILT_IN_FORGE_API_URL` / `BUILT_IN_FORGE_API_KEY`：未配置 DeepSeek 时使用 Forge/兼容接口
