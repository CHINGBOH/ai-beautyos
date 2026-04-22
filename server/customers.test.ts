import { describe, it, expect } from "vitest";
import { getAllLeads, getLeadById } from "./db";

describe("客户管理功能测试", () => {
  it("应该能够获取所有客户列表", async () => {
    const leads = await getAllLeads();
    
    // 验证返回的是数组
    expect(Array.isArray(leads)).toBe(true);
    
    // 验证至少有100位客户
    expect(leads.length).toBeGreaterThanOrEqual(100);
    
    console.log(`✅ 成功获取 ${leads.length} 位客户数据`);
  });

  it("应该验证客户数据结构完整性", async () => {
    const leads = await getAllLeads();
    const firstLead = leads[0];
    
    // 验证必填字段
    expect(firstLead).toHaveProperty("id");
    expect(firstLead).toHaveProperty("name");
    expect(firstLead).toHaveProperty("phone");
    expect(firstLead).toHaveProperty("source");
    
    // 验证客户画像字段
    expect(firstLead).toHaveProperty("age");
    expect(firstLead).toHaveProperty("budgetLevel");
    expect(firstLead).toHaveProperty("psychologyType");
    expect(firstLead).toHaveProperty("psychologyTags");
    expect(firstLead).toHaveProperty("customerTier");
    expect(firstLead).toHaveProperty("notes");
    
    console.log("✅ 客户数据结构完整");
  });

  it("应该验证客户分层分布", async () => {
    const leads = await getAllLeads();
    
    const tierStats = {
      A: leads.filter((l) => l.customerTier === "A").length,
      B: leads.filter((l) => l.customerTier === "B").length,
      C: leads.filter((l) => l.customerTier === "C").length,
      D: leads.filter((l) => l.customerTier === "D").length,
    };
    
    console.log("客户分层分布：", tierStats);
    
    // 验证每个分层都有客户
    expect(tierStats.A).toBeGreaterThan(0);
    expect(tierStats.B).toBeGreaterThan(0);
    expect(tierStats.C).toBeGreaterThan(0);
    expect(tierStats.D).toBeGreaterThan(0);
    
    console.log("✅ 客户分层分布合理");
  });

  it("应该验证心理类型分布", async () => {
    const leads = await getAllLeads();
    
    const psychologyStats = {
      恐惧型: leads.filter((l) => l.psychologyType === "恐惧型").length,
      贪婪型: leads.filter((l) => l.psychologyType === "贪婪型").length,
      安全型: leads.filter((l) => l.psychologyType === "安全型").length,
      敏感型: leads.filter((l) => l.psychologyType === "敏感型").length,
    };
    
    console.log("心理类型分布：", psychologyStats);
    
    // 验证每种心理类型都有客户
    expect(psychologyStats.恐惧型).toBeGreaterThan(0);
    expect(psychologyStats.贪婪型).toBeGreaterThan(0);
    expect(psychologyStats.安全型).toBeGreaterThan(0);
    expect(psychologyStats.敏感型).toBeGreaterThan(0);
    
    console.log("✅ 心理类型分布合理");
  });

  it("应该验证消费能力分布", async () => {
    const leads = await getAllLeads();
    
    const budgetStats = {
      低: leads.filter((l) => l.budgetLevel === "低").length,
      中: leads.filter((l) => l.budgetLevel === "中").length,
      高: leads.filter((l) => l.budgetLevel === "高").length,
    };
    
    console.log("消费能力分布：", budgetStats);
    
    // 验证每档消费能力都有客户
    expect(budgetStats.低).toBeGreaterThan(0);
    expect(budgetStats.中).toBeGreaterThan(0);
    expect(budgetStats.高).toBeGreaterThan(0);
    
    console.log("✅ 消费能力分布合理");
  });

  it("应该验证渠道来源分布", async () => {
    const leads = await getAllLeads();
    
    const sourceStats: Record<string, number> = {};
    leads.forEach((l) => {
      sourceStats[l.source] = (sourceStats[l.source] || 0) + 1;
    });
    
    console.log("渠道来源分布：", sourceStats);
    
    // 验证至少有5种渠道
    expect(Object.keys(sourceStats).length).toBeGreaterThanOrEqual(5);
    
    console.log("✅ 渠道来源分布合理");
  });

  it("应该能够根据ID获取客户详情", async () => {
    const leads = await getAllLeads();
    const firstLeadId = leads[0].id;
    
    const lead = await getLeadById(firstLeadId);
    
    expect(lead).not.toBeNull();
    expect(lead?.id).toBe(firstLeadId);
    expect(lead?.name).toBe(leads[0].name);
    
    console.log("✅ 成功获取客户详情");
  });

  it("应该验证心理标签格式正确", async () => {
    const leads = await getAllLeads();
    const leadsWithTags = leads.filter((l) => l.psychologyTags);
    
    expect(leadsWithTags.length).toBeGreaterThan(0);
    
    const firstLead = leadsWithTags[0];
    const tags = JSON.parse(firstLead.psychologyTags!);
    
    // 验证是数组
    expect(Array.isArray(tags)).toBe(true);
    
    // 验证至少有一个标签
    expect(tags.length).toBeGreaterThan(0);
    
    console.log("✅ 心理标签格式正确");
  });

  it("应该验证兴趣项目格式正确", async () => {
    const leads = await getAllLeads();
    const leadsWithServices = leads.filter((l) => l.interestedServices);
    
    expect(leadsWithServices.length).toBeGreaterThan(0);
    
    const firstLead = leadsWithServices[0];
    const services = JSON.parse(firstLead.interestedServices!);
    
    // 验证是数组
    expect(Array.isArray(services)).toBe(true);
    
    // 验证至少有一个项目
    expect(services.length).toBeGreaterThan(0);
    
    console.log("✅ 兴趣项目格式正确");
  });
});
