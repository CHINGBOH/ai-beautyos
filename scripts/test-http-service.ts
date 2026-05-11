/**
 * HTTP 服务测试脚本
 * 
 * 测试内容：
 * 1. 基本请求功能
 * 2. 错误处理和分类
 * 3. 重试机制
 * 4. 超时处理
 * 5. 日志和监控
 * 6. 熔断器功能
 */

import {
  httpService,
  httpGet,
  httpPost,
  HttpServiceError,
  ErrorType,
  getHttpStats,
  getRecentHttpMetrics,
  clearHttpLogs,
  resetCircuitBreakers,
} from "../server/_core/httpService.ts";

// 测试计数器
let passedTests = 0;
let failedTests = 0;

/**
 * 测试辅助函数
 */
function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ ${message}`);
    passedTests++;
  } else {
    console.error(`❌ ${message}`);
    failedTests++;
  }
}

/**
 * 打印分隔线
 */
function printSeparator(title: string) {
  console.log("\n" + "=".repeat(60));
  console.log(`📋 ${title}`);
  console.log("=".repeat(60));
}

/**
 * 测试 1: 基本 GET 请求
 */
async function testBasicGetRequest() {
  printSeparator("测试 1: 基本 GET 请求");

  try {
    const response = await httpGet<{ ip: string }>("https://api.ipify.org?format=json");
    
    assert(response.status === 200, "状态码应该是 200");
    assert(response.duration > 0, "响应时间应该大于 0");
    assert(response.data.ip !== undefined, "应该返回 IP 地址");
    assert(typeof response.data.ip === "string", "IP 应该是字符串类型");
    
    console.log(`📡 获取到的 IP: ${response.data.ip}`);
    console.log(`⏱️ 响应时间: ${response.duration}ms`);
  } catch (error) {
    console.error("测试失败:", error);
    failedTests++;
  }
}

/**
 * 测试 2: 基本 POST 请求
 */
async function testBasicPostRequest() {
  printSeparator("测试 2: 基本 POST 请求");

  try {
    const response = await httpPost<{ json: () => Promise<{ args: unknown }> }>(
      "https://httpbin.org/post",
      { test: "data", timestamp: Date.now() }
    );
    
    assert(response.status === 200, "状态码应该是 200");
    assert(response.data !== undefined, "应该返回数据");
    
    console.log(`📤 POST 请求成功，响应时间: ${response.duration}ms`);
  } catch (error) {
    console.error("测试失败:", error);
    failedTests++;
  }
}

/**
 * 测试 3: 错误处理 - 404 错误
 */
async function test404Error() {
  printSeparator("测试 3: 错误处理 - 404 错误");

  try {
    await httpGet("https://httpbin.org/status/404");
    console.error("❌ 应该抛出 404 错误");
    failedTests++;
  } catch (error) {
    assert(error instanceof HttpServiceError, "应该抛出 HttpServiceError");
    
    if (error instanceof HttpServiceError) {
      assert(error.detail.type === ErrorType.CLIENT_ERROR, "错误类型应该是 CLIENT_ERROR");
      assert(error.detail.statusCode === 404, "状态码应该是 404");
      console.log(`🎯 正确捕获 404 错误: ${error.detail.message}`);
    }
  }
}

/**
 * 测试 4: 错误处理 - 500 错误 (可重试)
 */
async function test500Error() {
  printSeparator("测试 4: 错误处理 - 500 错误 (可重试)");

  try {
    await httpGet("https://httpbin.org/status/500", {
      retries: {
        maxRetries: 2,
        initialDelay: 100,
        maxDelay: 500,
      },
    });
    console.error("❌ 应该抛出 500 错误");
    failedTests++;
  } catch (error) {
    assert(error instanceof HttpServiceError, "应该抛出 HttpServiceError");
    
    if (error instanceof HttpServiceError) {
      assert(error.detail.type === ErrorType.SERVER_ERROR, "错误类型应该是 SERVER_ERROR");
      assert(error.detail.statusCode === 500, "状态码应该是 500");
      assert(error.detail.retryAttempt !== undefined, "应该有重试记录");
      console.log(`🎯 正确捕获 500 错误，重试次数: ${error.detail.retryAttempt}`);
    }
  }
}

/**
 * 测试 5: 超时处理
 */
async function testTimeout() {
  printSeparator("测试 5: 超时处理");

  try {
    await httpGet("https://httpbin.org/delay/10", {
      timeout: 1000, // 1 秒超时
    });
    console.error("❌ 应该抛出超时错误");
    failedTests++;
  } catch (error) {
    assert(error instanceof HttpServiceError, "应该抛出 HttpServiceError");
    
    if (error instanceof HttpServiceError) {
      assert(error.detail.type === ErrorType.TIMEOUT, "错误类型应该是 TIMEOUT");
      console.log(`🎯 正确捕获超时错误: ${error.detail.message}`);
    }
  }
}

/**
 * 测试 6: 网络错误
 */
async function testNetworkError() {
  printSeparator("测试 6: 网络错误");

  try {
    await httpGet("http://nonexistent-domain-12345.com");
    console.error("❌ 应该抛出网络错误");
    failedTests++;
  } catch (error) {
    assert(error instanceof HttpServiceError, "应该抛出 HttpServiceError");
    
    if (error instanceof HttpServiceError) {
      assert(error.detail.type === ErrorType.NETWORK, "错误类型应该是 NETWORK");
      console.log(`🎯 正确捕获网络错误: ${error.detail.message}`);
    }
  }
}

/**
 * 测试 7: 重试机制
 */
async function testRetryMechanism() {
  printSeparator("测试 7: 重试机制");

  let retryCount = 0;
  const maxRetries = 3;

  try {
    await httpGet("https://httpbin.org/status/503", {
      retries: {
        maxRetries,
        initialDelay: 100,
        maxDelay: 500,
        onRetry: (error, attempt) => {
          retryCount = attempt + 1;
          console.log(`🔄 重试第 ${retryCount} 次: ${error.detail.message}`);
        },
      },
    });
    console.error("❌ 应该抛出 503 错误");
    failedTests++;
  } catch (error) {
    assert(retryCount === maxRetries, `应该重试 ${maxRetries} 次`);
    assert(error instanceof HttpServiceError, "应该抛出 HttpServiceError");
    
    if (error instanceof HttpServiceError) {
      assert(error.detail.statusCode === 503, "状态码应该是 503");
      console.log(`✅ 重试机制正常工作，共重试 ${retryCount} 次`);
    }
  }
}

/**
 * 测试 8: 日志和监控
 */
async function testLoggingAndMonitoring() {
  printSeparator("测试 8: 日志和监控");

  // 清空之前的日志
  clearHttpLogs();

  // 执行几个请求
  try {
    await httpGet("https://api.ipify.org?format=json");
    await httpGet("https://httpbin.org/status/200");
    await httpGet("https://httpbin.org/status/404");
  } catch (error) {
    // 忽略错误
  }

  // 获取统计信息
  const stats = getHttpStats();
  
  console.log("\n📊 请求统计:");
  console.log(`   总请求数: ${stats.total}`);
  console.log(`   成功请求: ${stats.success}`);
  console.log(`   失败请求: ${stats.failed}`);
  console.log(`   成功率: ${stats.successRate.toFixed(2)}%`);
  console.log(`   平均响应时间: ${stats.avgDuration}ms`);
  console.log(`   错误分布:`, stats.errorBreakdown);

  assert(stats.total >= 2, "应该有至少 2 个请求记录");
  assert(stats.success >= 1, "应该有至少 1 个成功请求");
  assert(stats.failed >= 1, "应该有至少 1 个失败请求");

  // 获取最近的请求
  const recentMetrics = getRecentHttpMetrics(5);
  console.log(`\n📝 最近的 ${recentMetrics.length} 个请求:`);
  recentMetrics.forEach((metric, index) => {
    console.log(`   ${index + 1}. ${metric.method} ${metric.url} - ${metric.success ? "✅" : "❌"} (${metric.duration}ms)`);
  });

  assert(recentMetrics.length > 0, "应该有最近的请求记录");
}

/**
 * 测试 9: 熔断器功能
 */
async function testCircuitBreaker() {
  printSeparator("测试 9: 熔断器功能");

  // 重置熔断器
  resetCircuitBreakers();

  const failureThreshold = 3;
  let failureCount = 0;

  // 触发熔断器
  for (let i = 0; i < failureThreshold + 2; i++) {
    try {
      await httpGet("https://httpbin.org/status/500", {
        retries: { maxRetries: 0 }, // 禁用重试以快速触发熔断
      });
    } catch (error) {
      failureCount++;
      if (error instanceof HttpServiceError) {
        console.log(`❌ 第 ${i + 1} 次请求失败: ${error.detail.message}`);
      }
    }
  }

  assert(failureCount >= failureThreshold, `应该有至少 ${failureThreshold} 次失败`);

  // 等待熔断器超时
  console.log("\n⏳ 等待熔断器超时...");
  await new Promise(resolve => setTimeout(resolve, 61000)); // 61 秒

  // 尝试恢复
  try {
    await httpGet("https://api.ipify.org?format=json");
    console.log("✅ 熔断器已恢复，请求成功");
  } catch (error) {
    console.error("❌ 熔断器恢复失败:", error);
    failedTests++;
  }
}

/**
 * 测试 10: 自定义配置
 */
async function testCustomConfig() {
  printSeparator("测试 10: 自定义配置");

  // 重置熔断器以避免之前的测试影响
  resetCircuitBreakers();

  try {
    const response = await httpGet<{ headers: Record<string, string> }>(
      "https://httpbin.org/headers",
      {
        headers: {
          "X-Custom-Header": "test-value",
          "User-Agent": "HTTP-Service-Test/1.0",
        },
      }
    );

    assert(response.status === 200, "状态码应该是 200");
    assert(response.data.headers["X-Custom-Header"] === "test-value", "自定义请求头应该被发送");
    
    console.log("✅ 自定义配置正常工作");
    console.log(`📤 发送的自定义请求头: X-Custom-Header = ${response.data.headers["X-Custom-Header"]}`);
  } catch (error) {
    console.error("测试失败:", error);
    failedTests++;
  }
}

/**
 * 主测试函数
 */
async function runAllTests() {
  console.log("🚀 开始 HTTP 服务测试\n");

  // 基本功能测试
  await testBasicGetRequest();
  await testBasicPostRequest();

  // 错误处理测试
  await test404Error();
  await test500Error();
  await testTimeout();
  await testNetworkError();

  // 高级功能测试
  await testRetryMechanism();
  await testLoggingAndMonitoring();
  // await testCircuitBreaker(); // 跳过熔断器测试（耗时太长）
  await testCustomConfig();

  // 打印测试结果
  printSeparator("测试结果");
  console.log(`✅ 通过: ${passedTests}`);
  console.log(`❌ 失败: ${failedTests}`);
  console.log(`📊 成功率: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(2)}%`);

  if (failedTests === 0) {
    console.log("\n🎉 所有测试通过！");
    process.exit(0);
  } else {
    console.log("\n⚠️ 部分测试失败");
    process.exit(1);
  }
}

// 运行测试
runAllTests().catch(error => {
  console.error("测试运行出错:", error);
  process.exit(1);
});
