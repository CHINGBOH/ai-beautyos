import { describe, expect, it } from "vitest";
import { generateChatResponse } from "./deepseek";

describe("DeepSeek API Integration", () => {
  it("should successfully authenticate and generate a response", async () => {
    const messages = [
      { role: "user" as const, content: "你好" }
    ];

    const response = await generateChatResponse(messages);

    expect(response).toBeDefined();
    expect(typeof response).toBe("string");
    expect(response.length).toBeGreaterThan(0);
  }, 15000); // 15 second timeout for API call
});
