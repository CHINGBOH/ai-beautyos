import { describe, expect, it } from "vitest";
import { generateChatResponse } from "./deepseek";

describe("DeepSeek API Integration", () => {
  it("should successfully authenticate and generate a response", async () => {
    if (!process.env.DEEPSEEK_API_KEY) {
      console.log("Skipping test: DEEPSEEK_API_KEY not set");
      return;
    }

    const messages = [
      { role: "user" as const, content: "你好" }
    ];

    const response = await generateChatResponse(messages);

    expect(response).toBeDefined();
    expect(typeof response).toBe("string");
    expect(response.length).toBeGreaterThan(0);
  }, 15000); // 15 second timeout for API call
});
