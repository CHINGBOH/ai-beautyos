import { describe, expect, it } from "vitest";
import { callQwen } from "./qwen";

describe("Qwen API", () => {
  it("should successfully call Qwen API with valid credentials", async () => {
    // 如果没有配置 API Key，跳过测试
    if (!process.env.QWEN_API_KEY) {
      console.log("Skipping test: QWEN_API_KEY not set");
      return;
    }

    // 测试简单的对话
    const response = await callQwen([
      {
        role: "user",
        content: "你好，请用一句话介绍你自己。",
      },
    ]);

    // 验证返回内容
    expect(response).toBeTruthy();
    expect(typeof response).toBe("string");
    expect(response.length).toBeGreaterThan(0);
    
    console.log("Qwen API test response:", response);
  }, 30000); // 30秒超时
});
