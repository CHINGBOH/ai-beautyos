/**
 * Airtable 表结构自动创建脚本
 * 在用户的 Base 中自动创建医美 CRM 需要的所有表
 */

export interface AirtableConfig {
  token: string;
  baseId: string;
}

/**
 * 创建线索池表
 */
export async function createLeadsTable(config: AirtableConfig) {
  const response = await fetch(
    `https://api.airtable.com/v0/meta/bases/${config.baseId}/tables`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "线索池",
        description: "客户线索管理 - 从落地页和AI客服收集的潜在客户",
        fields: [
          {
            name: "姓名",
            type: "singleLineText",
            description: "客户姓名",
          },
          {
            name: "手机号",
            type: "phoneNumber",
            description: "联系电话",
          },
          {
            name: "微信号",
            type: "singleLineText",
            description: "微信账号",
          },
          {
            name: "意向项目",
            type: "multipleSelects",
            options: {
              choices: [
                { name: "超皮秒祛斑", color: "blueLight2" },
                { name: "水光针", color: "greenLight2" },
                { name: "热玛吉", color: "orangeLight2" },
                { name: "肉毒素", color: "purpleLight2" },
                { name: "玻尿酸", color: "pinkLight2" },
                { name: "线雕", color: "yellowLight2" },
                { name: "光子嫩肤", color: "redLight2" },
              ],
            },
          },
          {
            name: "预算区间",
            type: "singleSelect",
            options: {
              choices: [
                { name: "3000以下", color: "grayLight2" },
                { name: "3000-5000", color: "blueLight2" },
                { name: "5000-10000", color: "greenLight2" },
                { name: "10000-20000", color: "orangeLight2" },
                { name: "20000以上", color: "redLight2" },
              ],
            },
          },
          {
            name: "留言",
            type: "multilineText",
            description: "客户留言或咨询内容",
          },
          {
            name: "来源渠道",
            type: "singleSelect",
            options: {
              choices: [
                { name: "官网落地页", color: "blueLight2" },
                { name: "AI客服对话", color: "greenLight2" },
                { name: "小红书", color: "redLight2" },
                { name: "抖音", color: "purpleLight2" },
                { name: "朋友圈", color: "pinkLight2" },
                { name: "转介绍", color: "yellowLight2" },
              ],
            },
          },
          {
            name: "线索状态",
            type: "singleSelect",
            options: {
              choices: [
                { name: "新线索", color: "blueLight2" },
                { name: "已联系", color: "yellowLight2" },
                { name: "已预约", color: "orangeLight2" },
                { name: "已到店", color: "greenLight2" },
                { name: "已成交", color: "redLight2" },
                { name: "无效", color: "grayLight2" },
              ],
            },
          },
          {
            name: "创建时间",
            type: "dateTime",
            options: {
              dateFormat: { name: "local", format: "l" },
              timeFormat: { name: "24hour", format: "HH:mm" },
              timeZone: "Asia/Shanghai",
            },
          },
          {
            name: "最后跟进时间",
            type: "dateTime",
            options: {
              dateFormat: { name: "local", format: "l" },
              timeFormat: { name: "24hour", format: "HH:mm" },
              timeZone: "Asia/Shanghai",
            },
          },
          {
            name: "分配顾问",
            type: "singleLineText",
            description: "负责跟进的销售顾问",
          },
          {
            name: "备注",
            type: "multilineText",
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`创建线索池表失败: ${error}`);
  }

  return await response.json();
}

/**
 * 检查表是否已存在
 */
export async function checkTableExists(
  config: AirtableConfig,
  tableName: string
): Promise<boolean> {
  const response = await fetch(
    `https://api.airtable.com/v0/meta/bases/${config.baseId}/tables`,
    {
      headers: {
        Authorization: `Bearer ${config.token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("无法获取表列表");
  }

  const data = await response.json();
  return data.tables.some((table: { name: string }) => table.name === tableName);
}

/**
 * 自动设置 Airtable CRM 表结构
 */
export async function setupAirtableCRM(config: AirtableConfig) {
  const results = {
    success: true,
    created: [] as string[],
    skipped: [] as string[],
    errors: [] as string[],
  };

  try {
    // 检查并创建线索池表
    const leadsExists = await checkTableExists(config, "线索池");
    if (!leadsExists) {
      await createLeadsTable(config);
      results.created.push("线索池");
    } else {
      results.skipped.push("线索池（已存在）");
    }

    // TODO: 可以继续添加其他表的创建逻辑
    // 当前已实现：线索表（Leads）
    // 计划添加：客户表（Customers）、跟进记录表（Followups）等
    // - 客户库
    // - 预约管理
    // - 订单管理
    // - 服务项目
    // - 跟进记录

  } catch (error) {
    results.success = false;
    results.errors.push(error instanceof Error ? error.message : "未知错误");
  }

  return results;
}
