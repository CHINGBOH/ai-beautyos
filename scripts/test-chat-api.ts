/**
 * 测试AI聊天API
 */

import axios from "axios";

const BASE_URL = "http://localhost:3000";

async function testChatAPI() {
  console.log("🧪 开始测试AI聊天功能...\n");

  try {
    // 1. 创建对话会话
    console.log("1️⃣ 创建对话会话...");
    const sessionResponse = await axios.post(
      `${BASE_URL}/api/trpc/chat.createSession`,
      { json: {} },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const sessionData = sessionResponse.data.result.data.json;
    const sessionId = sessionData.sessionId;
    console.log(`   ✅ 会话创建成功: ${sessionId}\n`);

    // 2. 发送消息
    console.log("2️⃣ 发送测试消息...");
    const messageResponse = await axios.post(
      `${BASE_URL}/api/trpc/chat.sendMessage`,
      {
        json: {
          sessionId,
          message: "你好，我想咨询超皮秒祛斑项目",
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const messageData = messageResponse.data.result.data.json;
    console.log(`   ✅ 收到AI回复: ${messageData.response.substring(0, 100)}...\n`);

    // 3. 获取对话历史
    console.log("3️⃣ 获取对话历史...");
    const historyResponse = await axios.get(
      `${BASE_URL}/api/trpc/chat.getMessages?input=${encodeURIComponent(JSON.stringify({ json: { sessionId } }))}`
    );

    const historyData = historyResponse.data.result.data.json;
    console.log(`   ✅ 获取到 ${historyData.length} 条消息\n`);

    console.log("✅ AI聊天功能测试通过！");
    console.log("\n📝 测试结果:");
    console.log(`   - 会话ID: ${sessionId}`);
    console.log(`   - 消息数量: ${historyData.length}`);
    console.log(`   - AI回复: ${messageData.response.substring(0, 50)}...`);

  } catch (error: any) {
    console.error("❌ 测试失败:", error.message);
    if (error.response) {
      console.error("   响应数据:", JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

testChatAPI().catch(console.error);
