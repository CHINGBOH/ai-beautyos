/**
 * 前端LLM助手极限测试（30+场景）
 * 测试AI聊天助手的边界情况和异常处理
 */

import { test, expect, Page } from '@playwright/test';

const TEST_CONFIG = {
  baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
  timeout: 30000,
  retries: 2,
};

// ==================== 测试套件1: 输入边界测试 ====================
test.describe('📝 输入边界测试 (10场景)', () => {
  
  test('1.1 超长文本输入 (10000字符)', async ({ page }) => {
    await page.goto('/chat');
    const longText = '测试'.repeat(5000); // 10000字符
    await page.fill('[data-testid="chat-input"]', longText);
    await page.click('[data-testid="send-button"]');
    
    // 验证是否截断或报错
    const error = await page.locator('[data-testid="error-message"]').isVisible();
    expect(error).toBeFalsy();
  });

  test('1.2 特殊字符注入', async ({ page }) => {
    await page.goto('/chat');
    const specialChars = [
      '<script>alert("xss")</script>',
      "${7*7}",
      "'; DROP TABLE users; --",
      '<img src=x onerror=alert(1)>',
      '{{7*7}}',
      '```python\nos.system("rm -rf /")\n```',
    ];
    
    for (const char of specialChars) {
      await page.fill('[data-testid="chat-input"]', char);
      await page.click('[data-testid="send-button"]');
      await page.waitForTimeout(500);
      
      // 验证页面没有崩溃
      const body = await page.locator('body').innerHTML();
      expect(body).not.toContain('Internal Server Error');
    }
  });

  test('1.3 多语言混合输入', async ({ page }) => {
    await page.goto('/chat');
    const mixedText = 'Hello 你好 🎉 مرحبا こんにちは 안녕하세요';
    await page.fill('[data-testid="chat-input"]', mixedText);
    await page.click('[data-testid="send-button"]');
    
    const response = await page.locator('[data-testid="ai-message"]').first();
    await expect(response).toBeVisible({ timeout: 10000 });
  });

  test('1.4 Emoji和Unicode字符', async ({ page }) => {
    await page.goto('/chat');
    const emojis = '😀🎉💄💉✨🌟💅🏥💊🔬💰💎';
    await page.fill('[data-testid="chat-input"]', emojis);
    await page.click('[data-testid="send-button"]');
    
    const response = await page.locator('[data-testid="ai-message"]').first();
    await expect(response).toBeVisible({ timeout: 10000 });
  });

  test('1.5 零宽字符和隐形字符', async ({ page }) => {
    await page.goto('/chat');
    const invisibleChars = 'test\u200B\u200C\u200D\uFEFFtest';
    await page.fill('[data-testid="chat-input"]', invisibleChars);
    await page.click('[data-testid="send-button"]');
    
    const response = await page.locator('[data-testid="ai-message"]').first();
    await expect(response).toBeVisible({ timeout: 10000 });
  });

  test('1.6 空消息和空白字符', async ({ page }) => {
    await page.goto('/chat');
    const emptyInputs = ['', '   ', '\n\n\n', '\t\t\t'];
    
    for (const input of emptyInputs) {
      await page.fill('[data-testid="chat-input"]', input);
      await page.click('[data-testid="send-button"]');
      
      // 验证不会发送或显示错误提示
      const isDisabled = await page.locator('[data-testid="send-button"]').isDisabled();
      expect(isDisabled || await page.locator('[data-testid="error-message"]').isVisible()).toBeTruthy();
    }
  });

  test('1.7 极快连续输入', async ({ page }) => {
    await page.goto('/chat');
    
    // 1秒内发送10条消息
    for (let i = 0; i < 10; i++) {
      await page.fill('[data-testid="chat-input"]', `消息${i}`);
      await page.click('[data-testid="send-button"]');
    }
    
    // 验证所有消息都被处理
    const messages = await page.locator('[data-testid="user-message"]').count();
    expect(messages).toBe(10);
  });

  test('1.8 复制粘贴大文本', async ({ page }) => {
    await page.goto('/chat');
    const largeText = 'A'.repeat(50000); // 50KB文本
    
    await page.evaluate((text) => {
      navigator.clipboard.writeText(text);
    }, largeText);
    
    await page.locator('[data-testid="chat-input"]').focus();
    await page.keyboard.press('Control+v');
    
    // 验证输入被截断或处理
    const inputValue = await page.inputValue('[data-testid="chat-input"]');
    expect(inputValue.length).toBeLessThanOrEqual(10000);
  });

  test('1.9 SQL注入尝试', async ({ page }) => {
    await page.goto('/chat');
    const sqlInjections = [
      "' OR '1'='1",
      "'; DROP TABLE conversations; --",
      "1'; DELETE FROM messages WHERE '1'='1",
      "' UNION SELECT * FROM users --",
    ];
    
    for (const injection of sqlInjections) {
      await page.fill('[data-testid="chat-input"]', injection);
      await page.click('[data-testid="send-button"]');
      await page.waitForTimeout(500);
      
      // 验证系统仍然正常
      const isError = await page.locator('[data-testid="system-error"]').isVisible();
      expect(isError).toBeFalsy();
    }
  });

  test('1.10 命令注入尝试', async ({ page }) => {
    await page.goto('/chat');
    const cmdInjections = [
      '$(whoami)',
      '`cat /etc/passwd`',
      '| ls -la',
      '; rm -rf /',
      '& ping google.com',
    ];
    
    for (const cmd of cmdInjections) {
      await page.fill('[data-testid="chat-input"]', cmd);
      await page.click('[data-testid="send-button"]');
      await page.waitForTimeout(500);
      
      const isError = await page.locator('[data-testid="system-error"]').isVisible();
      expect(isError).toBeFalsy();
    }
  });
});

// ==================== 测试套件2: 网络异常测试 ====================
test.describe('🌐 网络异常测试 (8场景)', () => {
  
  test('2.1 网络断开重连', async ({ page }) => {
    await page.goto('/chat');
    
    // 发送消息
    await page.fill('[data-testid="chat-input"]', '测试消息');
    
    // 模拟断网
    await page.context().setOffline(true);
    await page.click('[data-testid="send-button"]');
    
    // 验证错误提示
    const errorMsg = await page.locator('[data-testid="network-error"]');
    await expect(errorMsg).toBeVisible();
    
    // 恢复网络
    await page.context().setOffline(false);
    
    // 验证可以重新发送
    await page.click('[data-testid="retry-button"]');
    const response = await page.locator('[data-testid="ai-message"]').first();
    await expect(response).toBeVisible({ timeout: 10000 });
  });

  test('2.2 请求超时', async ({ page }) => {
    await page.goto('/chat');
    
    // 模拟慢网络
    await page.route('**/api/trpc/**', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 35000)); // 超过30s超时
      await route.continue();
    });
    
    await page.fill('[data-testid="chat-input"]', '测试超时');
    await page.click('[data-testid="send-button"]');
    
    // 验证超时提示
    const timeoutMsg = await page.locator('[data-testid="timeout-error"]');
    await expect(timeoutMsg).toBeVisible({ timeout: 35000 });
  });

  test('2.3 服务器500错误', async ({ page }) => {
    await page.goto('/chat');
    
    await page.route('**/api/trpc/chat.sendMessage**', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });
    
    await page.fill('[data-testid="chat-input"]', '测试');
    await page.click('[data-testid="send-button"]');
    
    const errorMsg = await page.locator('[data-testid="error-message"]');
    await expect(errorMsg).toBeVisible();
  });

  test('2.4 服务器429限流', async ({ page }) => {
    await page.goto('/chat');
    
    await page.route('**/api/trpc/chat.sendMessage**', (route) => {
      route.fulfill({
        status: 429,
        body: JSON.stringify({ error: 'Too Many Requests', retryAfter: 60 }),
      });
    });
    
    await page.fill('[data-testid="chat-input"]', '测试限流');
    await page.click('[data-testid="send-button"]');
    
    const rateLimitMsg = await page.locator('[data-testid="rate-limit-error"]');
    await expect(rateLimitMsg).toBeVisible();
  });

  test('2.5 响应数据格式错误', async ({ page }) => {
    await page.goto('/chat');
    
    await page.route('**/api/trpc/chat.sendMessage**', (route) => {
      route.fulfill({
        status: 200,
        body: 'invalid json {',
      });
    });
    
    await page.fill('[data-testid="chat-input"]', '测试');
    await page.click('[data-testid="send-button"]');
    
    const errorMsg = await page.locator('[data-testid="parse-error"]');
    await expect(errorMsg).toBeVisible();
  });

  test('2.6 WebSocket断开（如果适用）', async ({ page }) => {
    // 如果聊天使用WebSocket
    await page.goto('/chat');
    
    // 模拟WebSocket断开
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'));
    });
    
    // 验证降级处理
    const statusIndicator = await page.locator('[data-testid="connection-status"]');
    await expect(statusIndicator).toContainText('离线');
  });

  test('2.7 部分响应丢失', async ({ page }) => {
    await page.goto('/chat');
    
    let requestCount = 0;
    await page.route('**/api/trpc/**', (route) => {
      requestCount++;
      if (requestCount % 2 === 0) {
        route.abort('timedout');
      } else {
        route.continue();
      }
    });
    
    // 发送多条消息
    for (let i = 0; i < 5; i++) {
      await page.fill('[data-testid="chat-input"]', `消息${i}`);
      await page.click('[data-testid="send-button"]');
      await page.waitForTimeout(500);
    }
    
    // 验证系统仍然稳定
    const chatContainer = await page.locator('[data-testid="chat-container"]');
    await expect(chatContainer).toBeVisible();
  });

  test('2.8 高延迟网络', async ({ page }) => {
    await page.goto('/chat');
    
    // 模拟高延迟
    await page.route('**/api/trpc/**', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 5000));
      await route.continue();
    });
    
    await page.fill('[data-testid="chat-input"]', '测试高延迟');
    await page.click('[data-testid="send-button"]');
    
    // 验证加载状态
    const loadingIndicator = await page.locator('[data-testid="loading-indicator"]');
    await expect(loadingIndicator).toBeVisible();
    
    // 等待响应
    const response = await page.locator('[data-testid="ai-message"]').first();
    await expect(response).toBeVisible({ timeout: 15000 });
  });
});

// ==================== 测试套件3: UI交互极限测试 ====================
test.describe('🖱️ UI交互极限测试 (7场景)', () => {
  
  test('3.1 疯狂点击发送按钮', async ({ page }) => {
    await page.goto('/chat');
    
    await page.fill('[data-testid="chat-input"]', '测试');
    
    // 疯狂点击10次
    for (let i = 0; i < 10; i++) {
      await page.click('[data-testid="send-button"]');
    }
    
    // 验证只发送了一条
    const userMessages = await page.locator('[data-testid="user-message"]').count();
    expect(userMessages).toBe(1);
  });

  test('3.2 快速切换页面', async ({ page }) => {
    await page.goto('/chat');
    
    // 输入消息但不发送
    await page.fill('[data-testid="chat-input"]', '未完成的消息');
    
    // 快速切换页面
    await page.goto('/services');
    await page.goto('/chat');
    await page.goto('/about');
    await page.goto('/chat');
    
    // 验证输入是否保留（或合理清除）
    const inputValue = await page.inputValue('[data-testid="chat-input"]');
    // 期望：保留输入或为空，不应出现异常
    expect(['未完成的消息', '']).toContain(inputValue);
  });

  test('3.3 浏览器后退按钮', async ({ page }) => {
    await page.goto('/chat');
    
    // 发送消息
    await page.fill('[data-testid="chat-input"]', '消息1');
    await page.click('[data-testid="send-button"]');
    await page.fill('[data-testid="chat-input"]', '消息2');
    await page.click('[data-testid="send-button"]');
    
    // 点击后退
    await page.goBack();
    
    // 验证页面状态（不应出现确认对话框错误）
    const isChatPage = await page.locator('[data-testid="chat-container"]').isVisible();
    expect(isChatPage).toBeTruthy();
  });

  test('3.4 窗口大小极端变化', async ({ page }) => {
    await page.goto('/chat');
    
    const sizes = [
      { width: 320, height: 568 },   // iPhone 5
      { width: 1920, height: 1080 }, // 桌面
      { width: 768, height: 1024 },  // iPad
      { width: 100, height: 100 },   // 极小窗口
      { width: 2560, height: 1440 }, // 4K
    ];
    
    for (const size of sizes) {
      await page.setViewportSize(size);
      await page.waitForTimeout(200);
      
      // 验证布局没有崩溃
      const chatContainer = await page.locator('[data-testid="chat-container"]');
      await expect(chatContainer).toBeVisible();
    }
  });

  test('3.5 多标签页同时操作', async ({ browser }) => {
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    await page1.goto('/chat');
    await page2.goto('/chat');
    
    // 同时在两个标签页发送消息
    await page1.fill('[data-testid="chat-input"]', '标签页1');
    await page2.fill('[data-testid="chat-input"]', '标签页2');
    
    await Promise.all([
      page1.click('[data-testid="send-button"]'),
      page2.click('[data-testid="send-button"]'),
    ]);
    
    // 验证两个页面都正常
    await expect(page1.locator('[data-testid="ai-message"]').first()).toBeVisible();
    await expect(page2.locator('[data-testid="ai-message"]').first()).toBeVisible();
  });

  test('3.6 键盘快捷键冲突', async ({ page }) => {
    await page.goto('/chat');
    
    // 测试各种快捷键
    const shortcuts = [
      'Control+Enter',
      'Shift+Enter',
      'Alt+Enter',
      'Meta+Enter',
      'Escape',
      'Control+r',
    ];
    
    for (const shortcut of shortcuts) {
      await page.fill('[data-testid="chat-input"]', '测试快捷键');
      await page.keyboard.press(shortcut);
      
      // 验证页面没有异常行为
      const isError = await page.locator('[data-testid="system-error"]').isVisible();
      expect(isError).toBeFalsy();
    }
  });

  test('3.7 文件拖拽到聊天框', async ({ page }) => {
    await page.goto('/chat');
    
    // 模拟文件拖拽
    const dataTransfer = await page.evaluateHandle(() => {
      const dt = new DataTransfer();
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      dt.items.add(file);
      return dt;
    });
    
    await page.dispatchEvent('[data-testid="chat-container"]', 'drop', { dataTransfer });
    
    // 验证系统正常（可以接受或拒绝文件，但不应崩溃）
    const isChatVisible = await page.locator('[data-testid="chat-container"]').isVisible();
    expect(isChatVisible).toBeTruthy();
  });
});

// ==================== 测试套件4: 内存和性能测试 ====================
test.describe('⚡ 内存和性能测试 (5场景)', () => {
  
  test('4.1 超长对话历史', async ({ page }) => {
    await page.goto('/chat');
    
    // 模拟100轮对话
    for (let i = 0; i < 100; i++) {
      await page.fill('[data-testid="chat-input"]', `消息${i}`);
      await page.click('[data-testid="send-button"]');
      await page.waitForTimeout(100);
    }
    
    // 验证滚动正常
    const chatContainer = await page.locator('[data-testid="chat-container"]');
    await chatContainer.evaluate(el => el.scrollTop = el.scrollHeight);
    
    // 验证内存没有泄漏（通过页面响应性判断）
    await page.fill('[data-testid="chat-input"]', '最后一条');
    await expect(page.locator('[data-testid="chat-input"]')).toHaveValue('最后一条');
  });

  test('4.2 快速刷新页面', async ({ page }) => {
    await page.goto('/chat');
    
    for (let i = 0; i < 10; i++) {
      await page.reload();
      await page.waitForLoadState('networkidle');
    }
    
    // 验证页面正常加载
    const chatContainer = await page.locator('[data-testid="chat-container"]');
    await expect(chatContainer).toBeVisible();
  });

  test('4.3 大量并发请求', async ({ page }) => {
    await page.goto('/chat');
    
    // 快速发送20条消息
    const promises = [];
    for (let i = 0; i < 20; i++) {
      promises.push((async () => {
        await page.fill('[data-testid="chat-input"]', `并发消息${i}`);
        await page.click('[data-testid="send-button"]');
      })());
    }
    
    await Promise.all(promises);
    
    // 验证所有消息都被处理
    await page.waitForTimeout(5000);
    const userMessages = await page.locator('[data-testid="user-message"]').count();
    expect(userMessages).toBe(20);
  });

  test('4.4 内存泄漏检测', async ({ page }) => {
    await page.goto('/chat');
    
    // 获取初始内存使用
    const initialMetrics = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    // 执行多次操作
    for (let i = 0; i < 50; i++) {
      await page.fill('[data-testid="chat-input"]', `测试消息${i}`);
      await page.click('[data-testid="send-button"]');
      await page.waitForTimeout(200);
    }
    
    // 强制垃圾回收（如果可用）
    await page.evaluate(() => {
      if (window.gc) window.gc();
    });
    
    // 获取最终内存使用
    const finalMetrics = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    // 内存增长不应超过100MB
    if (initialMetrics > 0 && finalMetrics > 0) {
      const growthMB = (finalMetrics - initialMetrics) / 1024 / 1024;
      expect(growthMB).toBeLessThan(100);
    }
  });

  test('4.5 大数据渲染性能', async ({ page }) => {
    await page.goto('/chat');
    
    // 发送包含大量文本的消息
    const largeMessage = '测试内容'.repeat(1000); // ~8KB
    await page.fill('[data-testid="chat-input"]', largeMessage);
    
    const startTime = Date.now();
    await page.click('[data-testid="send-button"]');
    await page.locator('[data-testid="ai-message"]').first().waitFor({ timeout: 10000 });
    const endTime = Date.now();
    
    // 渲染时间不应超过5秒
    expect(endTime - startTime).toBeLessThan(5000);
  });
});

// ==================== 测试报告生成 ====================
test.afterAll(async () => {
  console.log('\n' + '='.repeat(70));
  console.log('LLM助手极限测试完成');
  console.log('='.repeat(70));
  console.log('测试覆盖:');
  console.log('  - 输入边界测试: 10场景');
  console.log('  - 网络异常测试: 8场景');
  console.log('  - UI交互极限测试: 7场景');
  console.log('  - 内存和性能测试: 5场景');
  console.log('总计: 30个测试场景');
  console.log('='.repeat(70));
});
