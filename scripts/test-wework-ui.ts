/**
 * 测试企业微信功能
 */

import axios from "axios";

const BASE_URL = "http://localhost:3000";

async function testWeworkAPI() {
  console.log("🧪 开始测试企业微信功能...\n");

  try {
    // 1. 获取配置
    console.log("1️⃣ 获取企业微信配置...");
    const configResponse = await axios.get(
      `${BASE_URL}/api/trpc/wework.getConfig?input=${encodeURIComponent(JSON.stringify({ json: {} }))}`
    );

    const config = configResponse.data.result.data.json;
    if (config) {
      console.log("   ✅ 配置已存在");
      console.log(`   - 企业ID: ${config.corpId || "未设置"}`);
      console.log(`   - 模式: ${config.isMockMode === 1 ? "模拟模式" : "真实模式"}\n`);
    } else {
      console.log("   ⚠️  配置不存在，需要初始化\n");
    }

    // 2. 测试获取客户列表
    console.log("2️⃣ 获取客户列表...");
    const customersResponse = await axios.get(
      `${BASE_URL}/api/trpc/wework.listCustomers?input=${encodeURIComponent(JSON.stringify({ json: {} }))}`
    );

    const customers = customersResponse.data.result.data.json;
    console.log(`   ✅ 获取到 ${customers.length} 个客户\n`);

    // 3. 测试获取联系我二维码列表
    console.log("3️⃣ 获取联系我二维码列表...");
    const contactWaysResponse = await axios.get(
      `${BASE_URL}/api/trpc/wework.listContactWays?input=${encodeURIComponent(JSON.stringify({ json: {} }))}`
    );

    const contactWays = contactWaysResponse.data.result.data.json;
    console.log(`   ✅ 获取到 ${contactWays.length} 个二维码配置\n`);

    console.log("✅ 企业微信功能测试通过！");
    console.log("\n📝 测试结果:");
    console.log(`   - 客户数量: ${customers.length}`);
    console.log(`   - 二维码配置数量: ${contactWays.length}`);

  } catch (error: any) {
    console.error("❌ 测试失败:", error.message);
    if (error.response) {
      console.error("   响应数据:", JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

testWeworkAPI().catch(console.error);
