#!/usr/bin/env tsx

/**
 * Seed website content and navigation data
 */

import "dotenv/config";
import { getDb } from "../server/db";
import { websiteContent, websiteNavigation } from "../drizzle/schema";

const navigationData = [
  // 顶部导航
  {
    parentKey: null,
    navKey: "home",
    title: "首页",
    link: "/",
    icon: "Home",
    description: "网站首页",
    sortOrder: 1,
    isActive: 1,
    isExternal: 0,
    openInNewTab: 0,
  },
  {
    parentKey: null,
    navKey: "services",
    title: "服务项目",
    link: "/services",
    icon: "Sparkles",
    description: "医美服务项目",
    sortOrder: 2,
    isActive: 1,
    isExternal: 0,
    openInNewTab: 0,
  },
  {
    parentKey: null,
    navKey: "about",
    title: "关于我们",
    link: "/about",
    icon: "Info",
    description: "关于焱磊医美",
    sortOrder: 3,
    isActive: 1,
    isExternal: 0,
    openInNewTab: 0,
  },
  {
    parentKey: null,
    navKey: "contact",
    title: "联系我们",
    link: "/contact",
    icon: "Phone",
    description: "联系方式",
    sortOrder: 4,
    isActive: 1,
    isExternal: 0,
    openInNewTab: 0,
  },
  {
    parentKey: null,
    navKey: "chat",
    title: "在线咨询",
    link: "/chat",
    icon: "MessageCircle",
    description: "AI智能咨询",
    sortOrder: 5,
    isActive: 1,
    isExternal: 0,
    openInNewTab: 0,
  },
  {
    parentKey: null,
    navKey: "knowledge",
    title: "知识库",
    link: "/knowledge",
    icon: "BookOpen",
    description: "医美知识库",
    sortOrder: 6,
    isActive: 1,
    isExternal: 0,
    openInNewTab: 0,
  },

  // 服务项目子导航
  {
    parentKey: "services",
    navKey: "service-picosecond",
    title: "超皮秒祛斑",
    link: "/services/picosecond",
    icon: "Sparkles",
    description: "超皮秒激光祛斑",
    sortOrder: 1,
    isActive: 1,
    isExternal: 0,
    openInNewTab: 0,
  },
  {
    parentKey: "services",
    navKey: "service-thermage",
    title: "热玛吉",
    link: "/services/thermage",
    icon: "Zap",
    description: "热玛吉射频紧肤",
    sortOrder: 2,
    isActive: 1,
    isExternal: 0,
    openInNewTab: 0,
  },
  {
    parentKey: "services",
    navKey: "service-waterlight",
    title: "水光针",
    link: "/services/waterlight",
    icon: "Droplet",
    description: "水光针深层补水",
    sortOrder: 3,
    isActive: 1,
    isExternal: 0,
    openInNewTab: 0,
  },
  {
    parentKey: "services",
    navKey: "service-ipl",
    title: "光子嫩肤",
    link: "/services/ipl",
    icon: "Sun",
    description: "光子嫩肤美白",
    sortOrder: 4,
    isActive: 1,
    isExternal: 0,
    openInNewTab: 0,
  },

  // 关于我们子导航
  {
    parentKey: "about",
    navKey: "about-team",
    title: "专家团队",
    link: "/about/team",
    icon: "Users",
    description: "专家团队介绍",
    sortOrder: 1,
    isActive: 1,
    isExternal: 0,
    openInNewTab: 0,
  },
  {
    parentKey: "about",
    navKey: "about-equipment",
    title: "先进设备",
    link: "/about/equipment",
    icon: "Settings",
    description: "先进医疗设备",
    sortOrder: 2,
    isActive: 1,
    isExternal: 0,
    openInNewTab: 0,
  },
  {
    parentKey: "about",
    navKey: "about-environment",
    title: "环境展示",
    link: "/about/environment",
    icon: "Building",
    description: "医疗机构环境",
    sortOrder: 3,
    isActive: 1,
    isExternal: 0,
    openInNewTab: 0,
  },
];

const contentData = [
  // 首页内容
  {
    pageKey: "home",
    sectionKey: "hero",
    contentType: "text",
    title: "首页主标题",
    content: "专业祛斑，安全有效\n让美成为您一生的事业和陪伴",
    sortOrder: 1,
    isActive: 1,
  },
  {
    pageKey: "home",
    sectionKey: "hero",
    contentType: "text",
    title: "首页副标题",
    content: "采用先进的超皮秒激光技术，精准击碎色素颗粒，温和祛除各类色斑。2-3次治疗，90%以上客户满意度，3-5天即可正常化妆，不影响工作，让您轻松拥有净白无瑕的肌肤。",
    sortOrder: 2,
    isActive: 1,
  },
  {
    pageKey: "home",
    sectionKey: "advantages",
    contentType: "text",
    title: "项目优势",
    content: "四大核心优势，让祛斑更安全更有效",
    sortOrder: 1,
    isActive: 1,
  },
  {
    pageKey: "home",
    sectionKey: "advantages",
    contentType: "text",
    title: "精准祛斑",
    content: "超短脉冲精准击碎色素，不伤周围组织",
    sortOrder: 2,
    isActive: 1,
  },
  {
    pageKey: "home",
    sectionKey: "advantages",
    contentType: "text",
    title: "恢复快速",
    content: "3-5天恢复期，不影响正常工作生活",
    sortOrder: 3,
    isActive: 1,
  },
  {
    pageKey: "home",
    sectionKey: "advantages",
    contentType: "text",
    title: "安全可靠",
    content: "FDA认证设备，专业医师操作",
    sortOrder: 4,
    isActive: 1,
  },
  {
    pageKey: "home",
    sectionKey: "advantages",
    contentType: "text",
    title: "效果持久",
    content: "2-3次治疗，效果可维持数年",
    sortOrder: 5,
    isActive: 1,
  },
  {
    pageKey: "home",
    sectionKey: "suitable",
    contentType: "text",
    title: "适合人群",
    content: "如果您有以下困扰，超皮秒是您的理想选择",
    sortOrder: 1,
    isActive: 1,
  },

  // 服务项目页面
  {
    pageKey: "services",
    sectionKey: "intro",
    contentType: "text",
    title: "服务项目介绍",
    content: "我们提供全方位的医美服务，帮助您实现美丽梦想",
    sortOrder: 1,
    isActive: 1,
  },
  {
    pageKey: "services",
    sectionKey: "categories",
    contentType: "text",
    title: "项目分类",
    content: "激光美容 | 注射美容 | 皮肤管理 | 牙齿美容",
    sortOrder: 2,
    isActive: 1,
  },

  // 超皮秒祛斑页面
  {
    pageKey: "services/picosecond",
    sectionKey: "intro",
    contentType: "text",
    title: "超皮秒祛斑介绍",
    content: "超皮秒激光是目前最先进的色素治疗技术，采用超短脉冲激光，能够精准击碎色素颗粒，同时不损伤周围组织，实现安全有效的祛斑效果。",
    sortOrder: 1,
    isActive: 1,
  },
  {
    pageKey: "services/picosecond",
    sectionKey: "features",
    contentType: "text",
    title: "技术特点",
    content: "超短脉冲：皮秒级脉宽，更精准\n三波长：532nm/1064nm/785nm，覆盖多种色斑\n蜂巢透镜：放大治疗面积，提升效果\n无创治疗：无需开刀，恢复快速",
    sortOrder: 2,
    isActive: 1,
  },
  {
    pageKey: "services/picosecond",
    sectionKey: "process",
    contentType: "text",
    title: "治疗流程",
    content: "1. 专业面诊：医师面诊，制定个性化方案\n2. 清洁皮肤：彻底清洁治疗部位\n3. 涂抹麻药：减轻治疗不适感\n4. 激光治疗：精准击碎色素\n5. 修复护理：使用修复产品加速恢复",
    sortOrder: 3,
    isActive: 1,
  },
  {
    pageKey: "services/picosecond",
    sectionKey: "aftercare",
    contentType: "text",
    title: "术后护理",
    content: "• 严格防晒：避免紫外线照射\n• 补水保湿：使用温和护肤品\n• 避免刺激：暂停使用含酸护肤品\n• 定期复诊：按医嘱进行后续治疗",
    sortOrder: 4,
    isActive: 1,
  },

  // 热玛吉页面
  {
    pageKey: "services/thermage",
    sectionKey: "intro",
    contentType: "text",
    title: "热玛吉介绍",
    content: "热玛吉利用单极射频技术，将能量精准送达真皮层，刺激胶原蛋白再生，达到紧肤除皱、提升轮廓的效果。无创无痛，即刻见效，效果持久。",
    sortOrder: 1,
    isActive: 1,
  },
  {
    pageKey: "services/thermage",
    sectionKey: "features",
    contentType: "text",
    title: "主要功效",
    content: "紧致肌肤：提升面部轮廓\n淡化皱纹：改善细纹和表情纹\n重塑脸型：改善下颌线\n提升眼周：改善眼袋和眼周松弛",
    sortOrder: 2,
    isActive: 1,
  },

  // 关于我们页面
  {
    pageKey: "about",
    sectionKey: "intro",
    contentType: "text",
    title: "品牌故事",
    content: "焱磊医美（Liora Yan）成立于2020年，致力于为每一位客户提供高端、安全、专业的医美服务。我们拥有先进的医疗设备、经验丰富的专家团队，以及温馨舒适的治疗环境。",
    sortOrder: 1,
    isActive: 1,
  },
  {
    pageKey: "about",
    sectionKey: "mission",
    contentType: "text",
    title: "品牌使命",
    content: "让每一位客户都能安全地实现美丽梦想，成为您一生的事业和陪伴。",
    sortOrder: 2,
    isActive: 1,
  },
  {
    pageKey: "about",
    sectionKey: "values",
    contentType: "text",
    title: "核心价值观",
    content: "安全第一：客户安全永远是首要考虑\n专业至上：持续学习，追求卓越\n诚信经营：透明定价，无隐形消费\n客户至上：以客户需求为中心",
    sortOrder: 3,
    isActive: 1,
  },

  // 联系我们页面
  {
    pageKey: "contact",
    sectionKey: "info",
    contentType: "text",
    title: "联系方式",
    content: "地址：深圳市南山区科技园\n电话：0755-12345678\n微信：LioraYanBeauty\n邮箱：contact@liorayan.com",
    sortOrder: 1,
    isActive: 1,
  },
  {
    pageKey: "contact",
    sectionKey: "hours",
    contentType: "text",
    title: "营业时间",
    content: "周一至周日：9:00 - 21:00\n节假日正常营业",
    sortOrder: 2,
    isActive: 1,
  },
];

async function main() {
  try {
    console.log("🌱 开始导入网站内容和导航数据...\n");

    const db = await getDb();
    if (!db) {
      throw new Error("数据库未初始化");
    }

    // 清空现有数据
    console.log("🗑️  清空现有数据...");
    await db.delete(websiteNavigation);
    await db.delete(websiteContent);

    // 导入导航数据
    console.log("📥 导入导航数据...");
    for (const nav of navigationData) {
      await db.insert(websiteNavigation).values(nav);
      console.log(`  ✓ ${nav.title}`);
    }

    // 导入内容数据
    console.log("\n📥 导入内容数据...");
    for (const content of contentData) {
      await db.insert(websiteContent).values(content);
      console.log(`  ✓ ${content.title}`);
    }

    console.log("\n✅ 网站内容和导航数据导入完成！");
    console.log(`📊 导航：${navigationData.length} 项`);
    console.log(`📊 内容：${contentData.length} 项\n`);

    process.exit(0);
  } catch (error) {
    console.error("❌ 导入失败:", error);
    process.exit(1);
  }
}

main();
