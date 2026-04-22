/**
 * HTTP 服务监控工具
 * 
 * 功能：
 * - 实时监控 HTTP 请求指标
 * - 生成可视化报告
 * - 导出监控数据
 * - 健康检查
 */

import {
  getHttpStats,
  getRecentHttpMetrics,
  clearHttpLogs,
  resetCircuitBreakers,
  httpService,
} from "../server/_core/httpService.ts";

/**
 * 打印带颜色的文本
 */
function printColor(color: string, text: string) {
  const colors: Record<string, string> = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
  };

  console.log(`${colors[color]}${text}${colors.reset}`);
}

/**
 * 打印分隔线
 */
function printSeparator(title: string) {
  console.log("\n" + "=".repeat(70));
  printColor("cyan", `📊 ${title}`);
  console.log("=".repeat(70));
}

/**
 * 显示请求统计
 */
function showStatistics() {
  const stats = getHttpStats();

  printSeparator("HTTP 请求统计");

  // 总体统计
  console.log("\n📈 总体统计:");
  console.log(`   总请求数: ${stats.total}`);
  console.log(`   成功请求: ${printColor("green", String(stats.success))}`);
  console.log(`   失败请求: ${printColor("red", String(stats.failed))}`);

  // 成功率
  const successRate = stats.successRate;
  let rateColor = "green";
  if (successRate < 50) rateColor = "red";
  else if (successRate < 80) rateColor = "yellow";

  console.log(`   成功率: ${printColor(rateColor, successRate.toFixed(2) + "%")}`);
  console.log(`   平均响应时间: ${stats.avgDuration}ms`);

  // 错误分布
  if (Object.keys(stats.errorBreakdown).length > 0) {
    console.log("\n❌ 错误分布:");
    Object.entries(stats.errorBreakdown).forEach(([errorType, count]) => {
      console.log(`   ${errorType}: ${count} 次`);
    });
  } else {
    console.log("\n✅ 没有错误记录");
  }
}

/**
 * 显示最近的请求
 */
function showRecentRequests(limit: number = 10) {
  const metrics = getRecentHttpMetrics(limit);

  printSeparator(`最近的 ${metrics.length} 个请求`);

  if (metrics.length === 0) {
    console.log("\n📭 没有请求记录");
    return;
  }

  console.log("\n");
  metrics.forEach((metric, index) => {
    const statusIcon = metric.success ? "✅" : "❌";
    const methodColor = metric.method === "GET" ? "blue" : "magenta";
    const durationColor = metric.duration < 500 ? "green" : metric.duration < 1000 ? "yellow" : "red";

    console.log(`${index + 1}. ${statusIcon} ${printColor(methodColor, metric.method)} ${metric.url}`);
    console.log(`   状态: ${metric.statusCode || "ERR"} | 耗时: ${printColor(durationColor, metric.duration + "ms")} | 重试: ${metric.retryCount}`);
    console.log(`   时间: ${metric.timestamp.toLocaleString("zh-CN")}`);

    if (!metric.success && metric.errorType) {
      console.log(`   错误类型: ${printColor("red", metric.errorType)}`);
    }

    console.log();
  });
}

/**
 * 显示性能分析
 */
function showPerformanceAnalysis() {
  const metrics = getRecentHttpMetrics(100);

  printSeparator("性能分析");

  if (metrics.length === 0) {
    console.log("\n📭 没有足够的数据进行分析");
    return;
  }

  // 响应时间分布
  const durations = metrics.map(m => m.duration);
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const maxDuration = Math.max(...durations);
  const minDuration = Math.min(...durations);

  // 按响应时间分类
  const fast = durations.filter(d => d < 500).length;
  const medium = durations.filter(d => d >= 500 && d < 1000).length;
  const slow = durations.filter(d => d >= 1000).length;

  console.log("\n⏱️ 响应时间分析:");
  console.log(`   平均: ${avgDuration.toFixed(2)}ms`);
  console.log(`   最快: ${minDuration}ms`);
  console.log(`   最慢: ${maxDuration}ms`);

  console.log("\n📊 响应时间分布:");
  console.log(`   快速 (<500ms): ${printColor("green", String(fast))} (${(fast / metrics.length * 100).toFixed(1)}%)`);
  console.log(`   中等 (500-1000ms): ${printColor("yellow", String(medium))} (${(medium / metrics.length * 100).toFixed(1)}%)`);
  console.log(`   慢速 (>1000ms): ${printColor("red", String(slow))} (${(slow / metrics.length * 100).toFixed(1)}%)`);

  // 重试统计
  const withRetry = metrics.filter(m => m.retryCount > 0).length;
  if (withRetry > 0) {
    const avgRetryCount = metrics.reduce((sum, m) => sum + m.retryCount, 0) / metrics.length;
    console.log(`\n🔄 重试统计:`);
    console.log(`   有重试的请求: ${withRetry} (${(withRetry / metrics.length * 100).toFixed(1)}%)`);
    console.log(`   平均重试次数: ${avgRetryCount.toFixed(2)}`);
  }
}

/**
 * 显示健康检查
 */
function showHealthCheck() {
  const stats = getHttpStats();

  printSeparator("健康检查");

  let healthScore = 100;
  const issues: string[] = [];

  // 检查成功率
  if (stats.total > 0) {
    if (stats.successRate < 50) {
      healthScore -= 30;
      issues.push("成功率过低 (<50%)");
    } else if (stats.successRate < 80) {
      healthScore -= 15;
      issues.push("成功率偏低 (<80%)");
    }
  }

  // 检查响应时间
  if (stats.avgDuration > 2000) {
    healthScore -= 20;
    issues.push("平均响应时间过长 (>2s)");
  } else if (stats.avgDuration > 1000) {
    healthScore -= 10;
    issues.push("平均响应时间偏长 (>1s)");
  }

  // 检查错误分布
  const totalErrors = Object.values(stats.errorBreakdown).reduce((a, b) => a + b, 0);
  if (totalErrors > stats.total * 0.1) {
    healthScore -= 15;
    issues.push("错误率过高 (>10%)");
  }

  // 显示健康状态
  let healthColor = "green";
  let healthStatus = "健康";

  if (healthScore < 60) {
    healthColor = "red";
    healthStatus = "不健康";
  } else if (healthScore < 80) {
    healthColor = "yellow";
    healthStatus = "亚健康";
  }

  console.log(`\n${printColor(healthColor, "🏥 健康状态: " + healthStatus)}`);
  console.log(`${printColor(healthColor, "📊 健康得分: " + healthScore + "/100")}`);

  if (issues.length > 0) {
    console.log("\n⚠️ 发现的问题:");
    issues.forEach(issue => {
      console.log(`   - ${issue}`);
    });
  } else {
    console.log("\n✅ 系统运行正常，未发现问题");
  }
}

/**
 * 导出监控数据为 JSON
 */
function exportToJson(): string {
  const stats = getHttpStats();
  const metrics = getRecentHttpMetrics(100);

  const exportData = {
    timestamp: new Date().toISOString(),
    statistics: stats,
    recentMetrics: metrics.map(m => ({
      ...m,
      timestamp: m.timestamp.toISOString(),
    })),
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * 显示帮助信息
 */
function showHelp() {
  printSeparator("HTTP 监控工具帮助");

  console.log(`
命令:
  stats              显示请求统计
  recent             显示最近的请求
  performance        显示性能分析
  health             显示健康检查
  clear              清空监控数据
  reset              重置熔断器
  export             导出监控数据 (JSON)
  help               显示帮助信息
  exit               退出监控工具

示例:
  $ tsx scripts/http-monitor.ts stats
  $ tsx scripts/http-monitor.ts recent 20
  $ tsx scripts/http-monitor.ts health
  `);
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "help";

  switch (command) {
    case "stats":
      showStatistics();
      break;

    case "recent":
      const limit = parseInt(args[1]) || 10;
      showRecentRequests(limit);
      break;

    case "performance":
      showPerformanceAnalysis();
      break;

    case "health":
      showHealthCheck();
      break;

    case "clear":
      clearHttpLogs();
      console.log("✅ 监控数据已清空");
      break;

    case "reset":
      resetCircuitBreakers();
      console.log("✅ 熔断器已重置");
      break;

    case "export":
      console.log(exportToJson());
      break;

    case "help":
      showHelp();
      break;

    case "exit":
      console.log("👋 退出监控工具");
      process.exit(0);
      break;

    default:
      console.log(`❌ 未知命令: ${command}`);
      console.log("使用 'help' 查看可用命令");
      process.exit(1);
  }
}

// 运行
main().catch(error => {
  console.error("监控工具运行出错:", error);
  process.exit(1);
});
