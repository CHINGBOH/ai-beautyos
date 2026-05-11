/**
 * 测试企业微信API连接
 * 用于验证配置是否正确
 */

import "dotenv/config";
import { getWeworkConfig } from "../server/wework-db";
import { getAccessToken, isMockMode } from "../server/wework-api";

async function testWeworkAPI() {
  console.log("🔍 开始测试企业微信API连接...\n");

  try {
    // 1. 检查配置
    console.log("1️⃣ 检查配置...");
    const config = await getWeworkConfig();
    
    if (!config) {
      console.error("❌ 未找到企业微信配置，请先运行 init-wework-config.ts");
      process.exit(1);
    }

    console.log("✅ 配置已找到");
    console.log(`   企业ID: ${config.corpId || "未设置"}`);
    console.log(`   SECRET: ${config.corpSecret ? "***已设置***" : "未设置"}`);
    console.log(`   AgentID: ${config.agentId || "未设置"}`);
    console.log(`   模式: ${config.isMockMode === 1 ? "模拟模式" : "真实模式"}`);
    console.log(`   Token: ${config.token ? "***已设置***" : "未设置"}`);
    console.log(`   EncodingAESKey: ${config.encodingAesKey ? "***已设置***" : "未设置"}\n`);

    // 2. 检查是否为模拟模式
    const mockMode = await isMockMode();
    if (mockMode) {
      console.log("⚠️  当前为模拟模式，不会调用真实的企业微信API");
      console.log("   如需测试真实API，请设置 isMockMode = 0\n");
    }

    // 3. 测试Access Token获取
    if (!mockMode) {
      console.log("2️⃣ 测试Access Token获取...");
      if (!config.corpId || !config.corpSecret) {
        console.error("❌ 企业ID或SECRET未配置，无法获取Access Token");
        process.exit(1);
      }

      try {
        const token = await getAccessToken();
        console.log("✅ Access Token获取成功");
        console.log(`   Token: ${token.substring(0, 20)}...`);
        console.log(`   过期时间: ${config.tokenExpiresAt || "未知"}\n`);
      } catch (error: any) {
        console.error("❌ Access Token获取失败:");
        console.error(`   ${error.message}\n`);
        console.log("💡 可能的原因:");
        console.log("   - 企业ID或SECRET配置错误");
        console.log("   - 网络连接问题");
        console.log("   - 企业微信API服务异常\n");
        process.exit(1);
      }
    }

    // 4. 检查Webhook配置
    console.log("3️⃣ 检查Webhook配置...");
    if (!config.token) {
      console.warn("⚠️  Token未设置，Webhook URL验证可能失败");
      console.log("   请在企业微信管理后台配置回调时设置Token\n");
    } else {
      console.log("✅ Token已设置");
    }

    if (!config.encodingAesKey) {
      console.warn("⚠️  EncodingAESKey未设置，无法解密企业微信回调数据");
      console.log("   请在企业微信管理后台配置回调时设置EncodingAESKey\n");
    } else {
      console.log("✅ EncodingAESKey已设置\n");
    }

    // 5. 总结
    console.log("📋 测试总结:");
    console.log("   ✅ 配置检查: 通过");
    if (!mockMode) {
      console.log("   ✅ Access Token: 通过");
    } else {
      console.log("   ⚠️  Access Token: 跳过（模拟模式）");
    }
    
    if (config.token && config.encodingAesKey) {
      console.log("   ✅ Webhook配置: 完整");
    } else {
      console.log("   ⚠️  Webhook配置: 不完整（需要设置Token和EncodingAESKey）");
    }

    console.log("\n✨ 测试完成！");
    
    if (!config.token || !config.encodingAesKey) {
      console.log("\n📝 下一步:");
      console.log("   1. 在企业微信管理后台配置回调URL");
      console.log("   2. 设置Token和EncodingAESKey");
      console.log("   3. 将Token和EncodingAESKey保存到数据库");
    }

  } catch (error: any) {
    console.error("❌ 测试失败:", error.message);
    process.exit(1);
  }
}

testWeworkAPI().catch(console.error);
