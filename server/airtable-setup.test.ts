import { describe, expect, it } from "vitest";
import { checkTableExists } from "./airtable-setup";

describe("Airtable Setup", () => {
  it("should check if table exists", async () => {
    const config = {
      token: process.env.AIRTABLE_API_TOKEN || "",
      baseId: process.env.AIRTABLE_BASE_ID || "",
    };

    // 如果没有配置环境变量，跳过测试
    if (!config.token || !config.baseId) {
      console.log("Skipping test: AIRTABLE_API_TOKEN or AIRTABLE_BASE_ID not set");
      return;
    }

    // 检查一个已存在的表
    const exists = await checkTableExists(config, "Table");
    expect(typeof exists).toBe("boolean");
  });
});
