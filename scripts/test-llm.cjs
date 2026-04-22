/**
 * LLM 全面测试脚本
 * 测试: DeepSeek API直连、tRPC chat会话、心理分析、知识检索
 * 用法: node scripts/test-llm.cjs
 */

const BASE = "http://localhost:3000";

async function testDirect() {
  console.log("\n🔷 [1/5] 直接调用 DeepSeek API...");
  const key = require("fs")
    .readFileSync(".env", "utf8")
    .match(/DEEPSEEK_API_KEY=(.+)/)?.[1]
    ?.trim();
  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: "用一句话介绍你自己" }],
      max_tokens: 50,
    }),
  });
  const d = await res.json();
  const text = d.choices?.[0]?.message?.content;
  if (!text) throw new Error("No response: " + JSON.stringify(d));
  console.log("  ✅ 响应:", text);
  return true;
}

async function testCreateSession() {
  console.log("\n🔷 [2/5] 创建聊天会话...");
  const res = await fetch(`${BASE}/api/trpc/chat.createSession`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json: { source: "test-suite" } }),
  });
  const d = await res.json();
  const sessionId = d?.result?.data?.json?.sessionId;
  if (!sessionId) throw new Error("No sessionId: " + JSON.stringify(d));
  console.log("  ✅ sessionId:", sessionId);
  return sessionId;
}

async function testSendMessage(sessionId) {
  console.log("\n🔷 [3/5] 发送消息并获取 LLM 回复...");
  const start = Date.now();
  const res = await fetch(`${BASE}/api/trpc/chat.sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      json: { sessionId, message: "我想了解热玛吉效果怎样，大概多少钱？" },
    }),
  });
  const d = await res.json();
  const response = d?.result?.data?.json?.response;
  const elapsed = Date.now() - start;
  if (!response) throw new Error("No response: " + JSON.stringify(d));
  console.log(`  ✅ 响应 (${elapsed}ms):`, response.substring(0, 150) + "...");
  return response;
}

async function testPsychologyExtraction(sessionId) {
  console.log("\n🔷 [4/5] 测试信息提取（含电话号码）...");
  const res = await fetch(`${BASE}/api/trpc/chat.sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      json: {
        sessionId,
        message: "我叫张丽，电话是13800138000，预算大概5000左右，比较关注安全性",
      },
    }),
  });
  const d = await res.json();
  const info = d?.result?.data?.json?.extractedInfo;
  const response = d?.result?.data?.json?.response;
  console.log("  ✅ extractedInfo:", JSON.stringify(info));
  console.log("  ✅ 响应:", response?.substring(0, 100) + "...");
  return info;
}

async function testGetHistory(sessionId) {
  console.log("\n🔷 [5/5] 获取会话历史...");
  const res = await fetch(
    `${BASE}/api/trpc/chat.getHistory?input=${encodeURIComponent(
      JSON.stringify({ json: { sessionId } })
    )}`
  );
  const d = await res.json();
  const messages = d?.result?.data?.json?.messages;
  if (!messages) throw new Error("No messages: " + JSON.stringify(d));
  console.log(`  ✅ 历史消息数: ${messages.length}`);
  messages.forEach((m, i) =>
    console.log(
      `    [${i + 1}] ${m.role}: ${String(m.content).substring(0, 60)}...`
    )
  );
  return messages;
}

async function main() {
  console.log("=".repeat(60));
  console.log("  医美 CRM - LLM 全面测试");
  console.log("=".repeat(60));

  const results = { passed: 0, failed: 0, errors: [] };

  const tests = [
    { name: "DeepSeek直连", fn: () => testDirect() },
    {
      name: "完整聊天流",
      fn: async () => {
        const sid = await testCreateSession();
        await testSendMessage(sid);
        await testPsychologyExtraction(sid);
        await testGetHistory(sid);
      },
    },
  ];

  for (const test of tests) {
    try {
      await test.fn();
      results.passed++;
    } catch (e) {
      results.failed++;
      results.errors.push(`${test.name}: ${e.message}`);
      console.error(`  ❌ FAILED: ${e.message}`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(
    `测试结果: ${results.passed} 通过, ${results.failed} 失败`
  );
  if (results.errors.length) {
    results.errors.forEach((e) => console.error("  ❌", e));
  } else {
    console.log("  🎉 所有测试通过！");
  }
  console.log("=".repeat(60));
  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
