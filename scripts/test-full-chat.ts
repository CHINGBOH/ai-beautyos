/**
 * 完整测试聊天功能
 */

import "dotenv/config";

async function testFullChat() {
  const baseUrl = "http://localhost:3001";
  
  console.log("🧪 完整测试AI聊天功能...\n");
  
  try {
    // 1. 创建会话
    console.log("1️⃣ 创建会话...");
    const createRes = await fetch(`${baseUrl}/api/trpc/chat.createSession`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const createData = await createRes.json();
    const sessionId = createData.result?.data?.json?.sessionId;
    
    if (!sessionId) {
      console.log("   ❌ 创建会话失败");
      console.log("   响应:", JSON.stringify(createData, null, 2));
      return;
    }
    
    console.log(`   ✅ 会话ID: ${sessionId}\n`);
    
    // 2. 发送消息
    console.log("2️⃣ 发送消息: '你好，我想咨询超皮秒项目'");
    const sendRes = await fetch(`${baseUrl}/api/trpc/chat.sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        "0": {
          json: {
            sessionId,
            message: "你好，我想咨询超皮秒项目",
          },
        },
      }),
    });
    
    const sendData = await sendRes.json();
    const response = sendData[0]?.result?.data?.json?.response || sendData.result?.data?.json?.response;
    
    if (response) {
      console.log(`   ✅ AI回复成功！\n`);
      console.log(`   📝 回复内容:`);
      console.log(`   ${response.substring(0, 300)}${response.length > 300 ? '...' : ''}\n`);
      console.log("🎉 所有功能正常！可以正常使用了！");
    } else {
      console.log("   ❌ 发送消息失败");
      console.log("   响应:", JSON.stringify(sendData, null, 2).substring(0, 500));
    }
  } catch (error: any) {
    console.log(`   ❌ 测试失败: ${error.message}`);
  }
}

testFullChat().catch(console.error);
