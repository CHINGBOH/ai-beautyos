import "dotenv/config";
import { saveWeworkConfig } from "../server/wework-db";

async function initWeworkConfig() {
  try {
    await saveWeworkConfig({
      corpId: "ww3ceb59d6b08f5957",
      corpSecret: "AStMpkL4CaQ-alCPk_PrCBCxm-5_2h3mxFfIBXyGVZc",
      isMockMode: 0, // 0=真实模式
    });
    console.log("✅ 企业微信配置已初始化");
    console.log("企业ID: ww3ceb59d6b08f5957");
    console.log("模式: 真实模式（非模拟）");
  } catch (error) {
    console.error("❌ 初始化失败:", error);
    process.exit(1);
  }
}

initWeworkConfig().catch(console.error);
