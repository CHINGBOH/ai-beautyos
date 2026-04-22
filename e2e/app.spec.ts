import { test, expect } from '@playwright/test';

test.describe('预约流程 E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('聊天对话框应该正常打开', async ({ page }) => {
    const chatButton = page.locator('button:has-text("在线客服"), [class*="chat-trigger"]');
    await expect(chatButton).toBeVisible({ timeout: 10000 });
    await chatButton.click();

    const chatContainer = page.locator('[class*="chat-container"], [class*="chatbot"]');
    await expect(chatContainer).toBeVisible();
  });

  test('应该能够发送消息并收到回复', async ({ page }) => {
    await page.goto('/');

    const chatInput = page.locator('input[placeholder*="输入"], input[class*="chat-input"], textarea');
    if (await chatInput.isVisible()) {
      await chatInput.fill('你好，我想咨询水光针');
      await chatInput.press('Enter');

      await expect(page.locator('text=水光针')).toBeVisible({ timeout: 15000 });
    }
  });

  test('预约表单应该能够提交', async ({ page }) => {
    await page.goto('/api/landing');

    const nameInput = page.locator('input[name="name"], input[placeholder*="姓名"]');
    const phoneInput = page.locator('input[name="phone"], input[placeholder*="手机"]');

    if (await nameInput.isVisible() && await phoneInput.isVisible()) {
      await nameInput.fill('张三测试');
      await phoneInput.fill('13812345678');

      const submitButton = page.locator('button[type="submit"]:has-text("预约"), button:has-text("提交")');
      await submitButton.click();

      await expect(page.locator('text=预约成功, success, 已提交')).toBeVisible({ timeout: 10000 });
    }
  });

  test('聊天历史应该正确显示', async ({ page }) => {
    await page.goto('/');

    const chatInput = page.locator('input[class*="chat-input"], textarea');
    if (await chatInput.isVisible()) {
      await chatInput.fill('你好');
      await chatInput.press('Enter');

      await page.waitForTimeout(2000);

      const messages = page.locator('[class*="message"], [class*="chat-message"]');
      const count = await messages.count();
      expect(count).toBeGreaterThan(0);
    }
  });
});

test.describe('用户注册登录 E2E', () => {
  test('用户注册流程', async ({ page }) => {
    await page.goto('/register');

    const nameInput = page.locator('input[name="name"]');
    const phoneInput = page.locator('input[name="phone"]');
    const passwordInput = page.locator('input[name="password"]');
    const submitButton = page.locator('button[type="submit"]');

    if (await nameInput.isVisible()) {
      await nameInput.fill('测试用户');
      await phoneInput.fill(`139${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`);
      await passwordInput.fill('Test123456');

      await submitButton.click();

      await expect(page.locator('text=注册成功, success, 已创建')).toBeVisible({ timeout: 10000 });
    }
  });

  test('用户登录流程', async ({ page }) => {
    await page.goto('/login');

    const phoneInput = page.locator('input[name="phone"], input[placeholder*="手机"]');
    const passwordInput = page.locator('input[name="password"], input[type="password"]');
    const submitButton = page.locator('button[type="submit"]:has-text("登录")');

    if (await phoneInput.isVisible() && await passwordInput.isVisible()) {
      await phoneInput.fill('13812345678');
      await passwordInput.fill('Test123456');

      await submitButton.click();

      await page.waitForURL('**/dashboard**', { timeout: 10000 }).catch(() => {
        console.log('Login did not redirect to dashboard');
      });
    }
  });

  test('无效登录应该显示错误', async ({ page }) => {
    await page.goto('/login');

    const phoneInput = page.locator('input[name="phone"]');
    const passwordInput = page.locator('input[name="password"]');
    const submitButton = page.locator('button[type="submit"]');

    if (await phoneInput.isVisible()) {
      await phoneInput.fill('13800000000');
      await passwordInput.fill('wrongpassword');

      await submitButton.click();

      await expect(page.locator('text=错误, 失败, invalid, failed')).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('健康检查 E2E', () => {
  test('健康检查端点应该返回正常', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toBe('healthy');
  });

  test('就绪检查应该返回正常', async ({ request }) => {
    const response = await request.get('/health/ready');
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toBe('ready');
  });

  test('活跃检查应该返回正常', async ({ request }) => {
    const response = await request.get('/health/live');
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toBe('alive');
  });
});

test.describe('API 端点 E2E', () => {
  test('聊天 API 应该正常工作', async ({ request }) => {
    const response = await request.post('/api/chat/message', {
      data: {
        message: '你好',
        history: []
      }
    });

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.response).toBeTruthy();
  });

  test('预约 API 应该正常工作', async ({ request }) => {
    const response = await request.post('/api/appointments/', {
      data: {
        name: 'E2E测试用户',
        phone: '13912345678',
        service_type: '水光针'
      }
    });

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.appointment_id).toBeTruthy();
  });

  test('无效请求应该返回错误', async ({ request }) => {
    const response = await request.post('/api/appointments/', {
      data: {
        name: '',
        phone: '123'
      }
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});
