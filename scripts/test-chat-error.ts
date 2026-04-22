/**
 * 测试聊天功能错误诊断
 */

import "dotenv/config";

async function testChat() {
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  
  console.log("🔍 诊断聊天功能问题...\n");
  
  // 1. 测试创建会话
  console.log("1️⃣ 测试创建会话...");
  try {
    const createRes = await fetch(`${baseUrl}/api/trpc/chat.createSession`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const createData = await createRes.json();
    if (createData.result) {
      const sessionId = createData.result.data?.json?.sessionId;
      console.log(`   ✅ 创建会话成功: ${sessionId}\n`);
      
      // 2. 测试发送消息
      console.log("2️⃣ 测试发送消息...");
      const sendRes = await fetch(`${baseUrl}/api/trpc/chat.sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "0": {
            json: {
              sessionId,
              message: "你好",
            },
          },
        }),
      });
      const sendData = await sendRes.json();
      
      if (sendData.result) {
        console.log(`   ✅ 发送消息成功`);
        console.log(`   回复: ${sendData.result.data?.json?.response?.substring(0, 100)}...`);
      } else {
        console.log(`   ❌ 发送消息失败:`);
        console.log(`   错误: ${JSON.stringify(sendData.error, null, 2)}`);
      }
    } else {
      console.log(`   ❌ 创建会话失败:`);
      console.log(`   错误: ${JSON.stringify(createData.error, null, 2)}`);
    }
  } catch (error: any) {
    console.log(`   ❌ 请求失败: ${error.message}`);
  }
  
  // 3. 检查环境变量
  console.log("\n3️⃣ 检查环境变量...");
  console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? "✅ 已设置" : "❌ 未设置"}`);
  console.log(`   DEEPSEEK_API_KEY: ${process.env.DEEPSEEK_API_KEY ? "✅ 已设置" : "❌ 未设置"}`);
  
  // 4. 测试DeepSeek API
  console.log("\n4️⃣ 测试DeepSeek API...");
  try {
    const deepseekRes = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: "你好" }],
        max_tokens: 10,
      }),
    });
    
    if (deepseekRes.ok) {
      const deepseekData = await deepseekRes.json();
      console.log(`   ✅ DeepSeek API正常`);
      console.log(`   响应: ${deepseekData.choices?.[0]?.message?.content || "无内容"}`);
    } else {
      const errorText = await deepseekRes.text();
      console.log(`   ❌ DeepSeek API失败: ${deepseekRes.status}`);
      console.log(`   错误: ${errorText.substring(0, 200)}`);
    }
  } catch (error: any) {
    console.log(`   ❌ DeepSeek API连接失败: ${error.message}`);
  }
}

testChat().catch(console.error);
