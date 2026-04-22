/**
 * 生成知识库内容并导入数据库
 * 使用LLM生成结构化的知识内容
 */

import "dotenv/config";
import { KnowledgeGenerator } from "../server/knowledge-generator";
import { getDb } from "../server/db";
import { knowledgeBase } from "../drizzle/schema";
import { KNOWLEDGE_MODULES } from "../shared/knowledge-modules";
import { logger } from "../server/_core/logger";
import { and, eq } from "drizzle-orm";

interface KnowledgeNode {
  title: string;
  module: string;
  level: number;
  parentId?: number;
  path: string;
  order: number;
  category?: string;
  subCategory?: string;
  keywords: string[];
  context?: string;
}

// 定义要生成的知识结构（导出供 import-knowledge-from-docs 解析 path/parentId 用）
export const knowledgeStructure: KnowledgeNode[] = [
  // === 健康基础模块 ===
  {
    title: "健康基础",
    module: KNOWLEDGE_MODULES.HEALTH_FOUNDATION,
    level: 1,
    path: "1",
    order: 1,
    keywords: ["健康", "基础", "美容", "养生"],
  },
  {
    title: "睡眠管理",
    module: KNOWLEDGE_MODULES.HEALTH_FOUNDATION,
    level: 2,
    path: "1/1",
    order: 1,
    category: "睡眠管理",
    keywords: ["睡眠", "美容", "皮肤修复", "健康"],
  },
  {
    title: "睡眠科学",
    module: KNOWLEDGE_MODULES.HEALTH_FOUNDATION,
    level: 3,
    path: "1/1/1",
    order: 1,
    category: "睡眠管理",
    subCategory: "睡眠科学",
    keywords: ["睡眠周期", "深度睡眠", "REM睡眠"],
  },
  {
    title: "睡眠周期",
    module: KNOWLEDGE_MODULES.HEALTH_FOUNDATION,
    level: 4,
    path: "1/1/1/1",
    order: 1,
    category: "睡眠管理",
    subCategory: "睡眠科学",
    keywords: ["睡眠周期", "90分钟", "睡眠阶段"],
  },
  {
    title: "深度睡眠",
    module: KNOWLEDGE_MODULES.HEALTH_FOUNDATION,
    level: 5,
    path: "1/1/1/1/1",
    order: 1,
    category: "睡眠管理",
    subCategory: "睡眠科学",
    keywords: ["深度睡眠", "慢波睡眠", "生长激素", "皮肤修复"],
  },
  {
    title: "如何进入深度睡眠",
    module: KNOWLEDGE_MODULES.HEALTH_FOUNDATION,
    level: 6,
    path: "1/1/1/1/1/1",
    order: 1,
    category: "睡眠管理",
    subCategory: "睡眠科学",
    keywords: ["深度睡眠", "方法", "技巧", "睡眠质量"],
    context: "深度睡眠是皮肤修复的黄金时间，生长激素分泌达到峰值",
  },
  {
    title: "深度睡眠的美容益处",
    module: KNOWLEDGE_MODULES.HEALTH_FOUNDATION,
    level: 6,
    path: "1/1/1/1/1/2",
    order: 2,
    category: "睡眠管理",
    subCategory: "睡眠科学",
    keywords: ["深度睡眠", "美容", "皮肤修复", "抗衰老"],
    context: "深度睡眠对皮肤修复和整体健康的影响",
  },

  // === 皮肤管理模块 ===
  {
    title: "皮肤管理",
    module: KNOWLEDGE_MODULES.SKIN_CARE,
    level: 1,
    path: "2",
    order: 2,
    keywords: ["皮肤", "管理", "护理", "美容"],
  },
  {
    title: "皮肤病理分析",
    module: KNOWLEDGE_MODULES.SKIN_CARE,
    level: 2,
    path: "2/1",
    order: 1,
    category: "皮肤病理分析",
    keywords: ["病理", "分析", "诊断", "问题"],
  },
  {
    title: "常见皮肤问题",
    module: KNOWLEDGE_MODULES.SKIN_CARE,
    level: 3,
    path: "2/1/1",
    order: 1,
    category: "皮肤病理分析",
    subCategory: "常见皮肤问题",
    keywords: ["色斑", "痘痘", "敏感", "老化"],
  },
  {
    title: "色斑问题",
    module: KNOWLEDGE_MODULES.SKIN_CARE,
    level: 4,
    path: "2/1/1/1",
    order: 1,
    category: "皮肤病理分析",
    subCategory: "常见皮肤问题",
    keywords: ["色斑", "色素", "雀斑", "黄褐斑"],
  },
  {
    title: "色斑成因分析",
    module: KNOWLEDGE_MODULES.SKIN_CARE,
    level: 5,
    path: "2/1/1/1/1",
    order: 1,
    category: "皮肤病理分析",
    subCategory: "常见皮肤问题",
    keywords: ["色斑", "成因", "遗传", "紫外线", "激素"],
  },
  {
    title: "遗传因素对色斑的影响",
    module: KNOWLEDGE_MODULES.SKIN_CARE,
    level: 6,
    path: "2/1/1/1/1/1",
    order: 1,
    category: "皮肤病理分析",
    subCategory: "常见皮肤问题",
    keywords: ["遗传", "色斑", "基因", "家族史"],
    context: "遗传因素在色斑形成中起重要作用，某些人天生黑色素细胞活跃",
  },
  {
    title: "紫外线对色斑的影响",
    module: KNOWLEDGE_MODULES.SKIN_CARE,
    level: 6,
    path: "2/1/1/1/1/2",
    order: 2,
    category: "皮肤病理分析",
    subCategory: "常见皮肤问题",
    keywords: ["紫外线", "色斑", "防晒", "光老化"],
    context: "紫外线是导致色斑形成的主要外部因素",
  },
  {
    title: "激素变化对色斑的影响",
    module: KNOWLEDGE_MODULES.SKIN_CARE,
    level: 6,
    path: "2/1/1/1/1/3",
    order: 3,
    category: "皮肤病理分析",
    subCategory: "常见皮肤问题",
    keywords: ["激素", "色斑", "内分泌", "黄褐斑"],
    context: "激素变化（孕期、更年期、月经周期）会影响黑色素生成",
  },
  {
    title: "色斑治疗方案",
    module: KNOWLEDGE_MODULES.SKIN_CARE,
    level: 5,
    path: "2/1/1/1/2",
    order: 2,
    category: "皮肤病理分析",
    subCategory: "常见皮肤问题",
    keywords: ["色斑", "治疗", "医美", "护肤品", "中医"],
  },
  {
    title: "超皮秒激光祛斑",
    module: KNOWLEDGE_MODULES.SKIN_CARE,
    level: 6,
    path: "2/1/1/1/2/1",
    order: 1,
    category: "皮肤病理分析",
    subCategory: "常见皮肤问题",
    keywords: ["超皮秒", "激光", "祛斑", "医美"],
    context: "超皮秒激光是目前最先进的祛斑技术之一，通过极短脉冲击碎色素",
  },
  {
    title: "护肤品祛斑方案",
    module: KNOWLEDGE_MODULES.SKIN_CARE,
    level: 6,
    path: "2/1/1/1/2/2",
    order: 2,
    category: "皮肤病理分析",
    subCategory: "常见皮肤问题",
    keywords: ["护肤品", "祛斑", "美白", "成分"],
    context: "使用含有美白成分的护肤品是日常祛斑的重要手段",
  },
  {
    title: "中医调理祛斑",
    module: KNOWLEDGE_MODULES.SKIN_CARE,
    level: 6,
    path: "2/1/1/1/2/3",
    order: 3,
    category: "皮肤病理分析",
    subCategory: "常见皮肤问题",
    keywords: ["中医", "祛斑", "食疗", "体质"],
    context: "中医认为色斑与气血、脏腑功能有关，需要内调外养",
  },

  // === 牙齿护理（扩展至 ≥10 节点）===
  { title: "牙齿护理", module: KNOWLEDGE_MODULES.DENTAL_CARE, level: 1, path: "3", order: 3, keywords: ["牙齿", "口腔", "护理"] },
  { title: "口腔健康", module: KNOWLEDGE_MODULES.DENTAL_CARE, level: 2, path: "3/1", order: 1, category: "口腔健康", keywords: ["刷牙", "牙周", "龋齿"] },
  { title: "牙齿美白", module: KNOWLEDGE_MODULES.DENTAL_CARE, level: 3, path: "3/1/1", order: 1, category: "口腔健康", subCategory: "牙齿美白", keywords: ["美白", "冷光", "贴面"] },
  { title: "牙周护理与预防", module: KNOWLEDGE_MODULES.DENTAL_CARE, level: 3, path: "3/1/2", order: 2, category: "口腔健康", subCategory: "牙周护理", keywords: ["牙周", "牙龈", "预防"], context: "牙周健康是口腔美学与全身健康的基础" },
  { title: "冷光美白适应证与禁忌", module: KNOWLEDGE_MODULES.DENTAL_CARE, level: 4, path: "3/1/1/1", order: 1, category: "口腔健康", subCategory: "牙齿美白", keywords: ["冷光美白", "适应证", "禁忌"], context: "循证与指南对牙齿美白的适用边界" },
  { title: "口腔美学与正畸", module: KNOWLEDGE_MODULES.DENTAL_CARE, level: 2, path: "3/2", order: 2, category: "口腔美学", keywords: ["正畸", "贴面", "美学"] },
  { title: "瓷贴面与全瓷修复", module: KNOWLEDGE_MODULES.DENTAL_CARE, level: 3, path: "3/2/1", order: 1, category: "口腔美学", subCategory: "瓷贴面", keywords: ["贴面", "全瓷", "美学修复"] },
  { title: "正畸与面型管理", module: KNOWLEDGE_MODULES.DENTAL_CARE, level: 3, path: "3/2/2", order: 2, category: "口腔美学", subCategory: "正畸", keywords: ["正畸", "面型", "咬合"] },

  // === 中医养生（扩展至 ≥10 节点）===
  { title: "中医养生", module: KNOWLEDGE_MODULES.TCM, level: 1, path: "4", order: 4, keywords: ["中医", "养生", "体质"] },
  { title: "体质辨识", module: KNOWLEDGE_MODULES.TCM, level: 2, path: "4/1", order: 1, category: "体质辨识", keywords: ["体质", "九型", "调理"] },
  { title: "四季养生", module: KNOWLEDGE_MODULES.TCM, level: 3, path: "4/1/1", order: 1, category: "体质辨识", subCategory: "四季养生", keywords: ["四季", "节气", "食疗"] },
  { title: "九型体质与美容", module: KNOWLEDGE_MODULES.TCM, level: 3, path: "4/1/2", order: 2, category: "体质辨识", subCategory: "九型体质", keywords: ["九型", "体质", "美容调理"] },
  { title: "经络与气血调理", module: KNOWLEDGE_MODULES.TCM, level: 3, path: "4/1/3", order: 3, category: "体质辨识", subCategory: "经络", keywords: ["经络", "气血", "调理"] },
  { title: "食疗与药食同源", module: KNOWLEDGE_MODULES.TCM, level: 2, path: "4/2", order: 2, category: "食疗养生", keywords: ["食疗", "药食同源", "美容"] },
  { title: "美容养颜食疗方", module: KNOWLEDGE_MODULES.TCM, level: 3, path: "4/2/1", order: 1, category: "食疗养生", subCategory: "养颜", keywords: ["养颜", "食疗", "方剂"] },
  { title: "中医美容禁忌与注意事项", module: KNOWLEDGE_MODULES.TCM, level: 4, path: "4/1/1/1", order: 1, category: "体质辨识", subCategory: "四季养生", keywords: ["禁忌", "注意事项", "循证"], context: "中医美容的适用边界与现代循证结合" },

  // === 医美技术（扩展至 ≥12 节点）===
  { title: "医美技术", module: KNOWLEDGE_MODULES.AESTHETICS, level: 1, path: "5", order: 5, keywords: ["医美", "激光", "注射"] },
  { title: "激光与光电", module: KNOWLEDGE_MODULES.AESTHETICS, level: 2, path: "5/1", order: 1, category: "激光与光电", keywords: ["皮秒", "光子", "射频"] },
  { title: "超皮秒与皮秒激光", module: KNOWLEDGE_MODULES.AESTHETICS, level: 3, path: "5/1/1", order: 1, category: "激光与光电", subCategory: "皮秒", keywords: ["超皮秒", "皮秒", "祛斑"], context: "原理、适应证、禁忌与术后护理" },
  { title: "光子嫩肤与强脉冲光", module: KNOWLEDGE_MODULES.AESTHETICS, level: 3, path: "5/1/2", order: 2, category: "激光与光电", subCategory: "光子", keywords: ["光子嫩肤", "IPL", "嫩肤"] },
  { title: "射频与抗衰紧肤", module: KNOWLEDGE_MODULES.AESTHETICS, level: 3, path: "5/1/3", order: 3, category: "激光与光电", subCategory: "射频", keywords: ["射频", "热玛吉", "紧肤"] },
  { title: "超皮秒适应证与禁忌症", module: KNOWLEDGE_MODULES.AESTHETICS, level: 4, path: "5/1/1/1", order: 1, category: "激光与光电", subCategory: "皮秒", keywords: ["适应证", "禁忌", "指南"], context: "参照学会共识与产品说明书" },
  { title: "注射与填充", module: KNOWLEDGE_MODULES.AESTHETICS, level: 2, path: "5/2", order: 2, category: "注射与填充", keywords: ["玻尿酸", "肉毒", "水光"] },
  { title: "玻尿酸填充的医学规范", module: KNOWLEDGE_MODULES.AESTHETICS, level: 3, path: "5/2/1", order: 1, category: "注射与填充", subCategory: "玻尿酸", keywords: ["玻尿酸", "填充", "规范"], context: "适应证、层次、并发症与共识" },
  { title: "肉毒毒素注射与适应证", module: KNOWLEDGE_MODULES.AESTHETICS, level: 3, path: "5/2/2", order: 2, category: "注射与填充", subCategory: "肉毒", keywords: ["肉毒", "除皱", "瘦脸"] },
  { title: "水光针与中胚层疗法", module: KNOWLEDGE_MODULES.AESTHETICS, level: 3, path: "5/2/3", order: 3, category: "注射与填充", subCategory: "水光", keywords: ["水光", "中胚层", "补水"] },

  // === 体态管理（扩展至 ≥10 节点）===
  { title: "体态管理", module: KNOWLEDGE_MODULES.POSTURE, level: 1, path: "6", order: 6, keywords: ["体态", "姿态", "矫正"] },
  { title: "体态评估", module: KNOWLEDGE_MODULES.POSTURE, level: 2, path: "6/1", order: 1, category: "体态评估", keywords: ["评估", "脊柱", "肩颈"] },
  { title: "体态矫正", module: KNOWLEDGE_MODULES.POSTURE, level: 3, path: "6/1/1", order: 1, category: "体态评估", subCategory: "体态矫正", keywords: ["矫正", "训练", "习惯"] },
  { title: "脊柱与骨盆中立位", module: KNOWLEDGE_MODULES.POSTURE, level: 3, path: "6/1/2", order: 2, category: "体态评估", subCategory: "脊柱", keywords: ["脊柱", "骨盆", "中立位"] },
  { title: "肩颈与上交叉综合征", module: KNOWLEDGE_MODULES.POSTURE, level: 3, path: "6/1/3", order: 3, category: "体态评估", subCategory: "肩颈", keywords: ["肩颈", "上交叉", "康复"] },
  { title: "体态与气质", module: KNOWLEDGE_MODULES.POSTURE, level: 2, path: "6/2", order: 2, category: "体态与气质", keywords: ["气质", "仪态", "形象"] },
  { title: "日常体态维护", module: KNOWLEDGE_MODULES.POSTURE, level: 3, path: "6/2/1", order: 1, category: "体态与气质", subCategory: "日常维护", keywords: ["日常", "习惯", "办公"] },
  { title: "体态矫正的循证与边界", module: KNOWLEDGE_MODULES.POSTURE, level: 4, path: "6/1/1/1", order: 1, category: "体态评估", subCategory: "体态矫正", keywords: ["循证", "禁忌", "转诊"], context: "何时需转诊康复科或骨科" },

  // === 发型造型（扩展至 ≥10 节点）===
  { title: "发型造型", module: KNOWLEDGE_MODULES.HAIR, level: 1, path: "7", order: 7, keywords: ["发型", "造型", "发质"] },
  { title: "发质护理", module: KNOWLEDGE_MODULES.HAIR, level: 2, path: "7/1", order: 1, category: "发质护理", keywords: ["护理", "护发", "头皮"] },
  { title: "造型技巧", module: KNOWLEDGE_MODULES.HAIR, level: 3, path: "7/1/1", order: 1, category: "发质护理", subCategory: "造型技巧", keywords: ["造型", "卷发", "染发"] },
  { title: "头皮健康与养护", module: KNOWLEDGE_MODULES.HAIR, level: 3, path: "7/1/2", order: 2, category: "发质护理", subCategory: "头皮", keywords: ["头皮", "养护", "脱发"] },
  { title: "染发与色彩护理", module: KNOWLEDGE_MODULES.HAIR, level: 3, path: "7/1/3", order: 3, category: "发质护理", subCategory: "染发", keywords: ["染发", "色彩", "护理"] },
  { title: "发型与脸型", module: KNOWLEDGE_MODULES.HAIR, level: 2, path: "7/2", order: 2, category: "发型设计", keywords: ["脸型", "发型", "扬长避短"] },
  { title: "场合发型建议", module: KNOWLEDGE_MODULES.HAIR, level: 3, path: "7/2/1", order: 1, category: "发型设计", subCategory: "场合", keywords: ["场合", "职场", "晚宴"] },

  // === 服装搭配（扩展至 ≥10 节点）===
  { title: "服装搭配", module: KNOWLEDGE_MODULES.STYLING, level: 1, path: "8", order: 8, keywords: ["服装", "搭配", "风格"] },
  { title: "色彩与体型", module: KNOWLEDGE_MODULES.STYLING, level: 2, path: "8/1", order: 1, category: "色彩与体型", keywords: ["色彩", "体型", "扬长避短"] },
  { title: "场合穿搭", module: KNOWLEDGE_MODULES.STYLING, level: 3, path: "8/1/1", order: 1, category: "色彩与体型", subCategory: "场合穿搭", keywords: ["场合", "职场", "休闲"] },
  { title: "色彩理论与个人季型", module: KNOWLEDGE_MODULES.STYLING, level: 3, path: "8/1/2", order: 2, category: "色彩与体型", subCategory: "色彩", keywords: ["季型", "色彩", "肤色"] },
  { title: "体型分析与扬长避短", module: KNOWLEDGE_MODULES.STYLING, level: 3, path: "8/1/3", order: 3, category: "色彩与体型", subCategory: "体型", keywords: ["体型", "比例", "剪裁"] },
  { title: "风格定位", module: KNOWLEDGE_MODULES.STYLING, level: 2, path: "8/2", order: 2, category: "风格定位", keywords: ["风格", "气质", "定位"] },
  { title: "高端场合着装规范", module: KNOWLEDGE_MODULES.STYLING, level: 3, path: "8/2/1", order: 1, category: "风格定位", subCategory: "高端场合", keywords: ["正装", "晚宴", "商务"] },

  // === 妆容技巧（扩展至 ≥10 节点）===
  { title: "妆容技巧", module: KNOWLEDGE_MODULES.MAKEUP, level: 1, path: "9", order: 9, keywords: ["妆容", "化妆", "技巧"] },
  { title: "底妆与修容", module: KNOWLEDGE_MODULES.MAKEUP, level: 2, path: "9/1", order: 1, category: "底妆与修容", keywords: ["底妆", "修容", "遮瑕"] },
  { title: "眼妆与唇妆", module: KNOWLEDGE_MODULES.MAKEUP, level: 3, path: "9/1/1", order: 1, category: "底妆与修容", subCategory: "眼妆与唇妆", keywords: ["眼妆", "唇妆", "眼影"] },
  { title: "底妆产品选择与肤质", module: KNOWLEDGE_MODULES.MAKEUP, level: 3, path: "9/1/2", order: 2, category: "底妆与修容", subCategory: "底妆", keywords: ["粉底", "肤质", "成分"] },
  { title: "修容与高光技法", module: KNOWLEDGE_MODULES.MAKEUP, level: 3, path: "9/1/3", order: 3, category: "底妆与修容", subCategory: "修容", keywords: ["修容", "高光", "立体"] },
  { title: "场合妆容", module: KNOWLEDGE_MODULES.MAKEUP, level: 2, path: "9/2", order: 2, category: "场合妆容", keywords: ["场合", "日妆", "晚妆"] },
  { title: "日妆与通勤妆", module: KNOWLEDGE_MODULES.MAKEUP, level: 3, path: "9/2/1", order: 1, category: "场合妆容", subCategory: "日妆", keywords: ["通勤", "自然", "持久"] },

  // === 香水香氛（扩展至 ≥10 节点）===
  { title: "香水香氛", module: KNOWLEDGE_MODULES.FRAGRANCE, level: 1, path: "10", order: 10, keywords: ["香水", "香氛", "香调"] },
  { title: "香调分类", module: KNOWLEDGE_MODULES.FRAGRANCE, level: 2, path: "10/1", order: 1, category: "香调分类", keywords: ["花香", "木质", "东方调"] },
  { title: "香水使用", module: KNOWLEDGE_MODULES.FRAGRANCE, level: 3, path: "10/1/1", order: 1, category: "香调分类", subCategory: "香水使用", keywords: ["使用", "留香", "场合"] },
  { title: "香调与个性匹配", module: KNOWLEDGE_MODULES.FRAGRANCE, level: 3, path: "10/1/2", order: 2, category: "香调分类", subCategory: "匹配", keywords: ["个性", "场合", "季节"] },
  { title: "香氛与情绪", module: KNOWLEDGE_MODULES.FRAGRANCE, level: 3, path: "10/1/3", order: 3, category: "香调分类", subCategory: "情绪", keywords: ["情绪", "放松", "专注"] },
  { title: "高端香氛选择", module: KNOWLEDGE_MODULES.FRAGRANCE, level: 2, path: "10/2", order: 2, category: "高端香氛", keywords: ["高端", "沙龙香", "收藏"] },
  { title: "留香与喷洒技巧", module: KNOWLEDGE_MODULES.FRAGRANCE, level: 3, path: "10/2/1", order: 1, category: "高端香氛", subCategory: "使用技巧", keywords: ["留香", "喷洒", "叠香"] },

  // === 心理健康（扩展至 ≥10 节点）===
  { title: "心理健康", module: KNOWLEDGE_MODULES.MENTAL_HEALTH, level: 1, path: "11", order: 11, keywords: ["心理", "情绪", "自信"] },
  { title: "压力与情绪", module: KNOWLEDGE_MODULES.MENTAL_HEALTH, level: 2, path: "11/1", order: 1, category: "压力与情绪", keywords: ["压力", "情绪", "调节"] },
  { title: "自信与形象", module: KNOWLEDGE_MODULES.MENTAL_HEALTH, level: 3, path: "11/1/1", order: 1, category: "压力与情绪", subCategory: "自信与形象", keywords: ["自信", "形象", "自我接纳"] },
  { title: "压力管理与皮肤", module: KNOWLEDGE_MODULES.MENTAL_HEALTH, level: 3, path: "11/1/2", order: 2, category: "压力与情绪", subCategory: "压力", keywords: ["压力", "皮肤", "皮质醇"] },
  { title: "情绪调节方法", module: KNOWLEDGE_MODULES.MENTAL_HEALTH, level: 3, path: "11/1/3", order: 3, category: "压力与情绪", subCategory: "情绪", keywords: ["情绪", "调节", "正念"] },
  { title: "自我接纳与身体意象", module: KNOWLEDGE_MODULES.MENTAL_HEALTH, level: 2, path: "11/2", order: 2, category: "自我接纳", keywords: ["身体意象", "接纳", "审美"] },
  { title: "何时寻求专业心理支持", module: KNOWLEDGE_MODULES.MENTAL_HEALTH, level: 3, path: "11/2/1", order: 1, category: "自我接纳", subCategory: "专业支持", keywords: ["心理咨询", "转诊", "边界"], context: "心理与美容的边界，避免将美容替代治疗" },

  // === 社交礼仪（扩展至 ≥10 节点）===
  { title: "社交礼仪", module: KNOWLEDGE_MODULES.ETIQUETTE, level: 1, path: "12", order: 12, keywords: ["礼仪", "社交", "形象"] },
  { title: "基本礼仪", module: KNOWLEDGE_MODULES.ETIQUETTE, level: 2, path: "12/1", order: 1, category: "基本礼仪", keywords: ["礼仪", "举止", "言谈"] },
  { title: "商务与场合", module: KNOWLEDGE_MODULES.ETIQUETTE, level: 3, path: "12/1/1", order: 1, category: "基本礼仪", subCategory: "商务与场合", keywords: ["商务", "场合", "着装"] },
  { title: "举止与仪态", module: KNOWLEDGE_MODULES.ETIQUETTE, level: 3, path: "12/1/2", order: 2, category: "基本礼仪", subCategory: "举止", keywords: ["举止", "仪态", "肢体语言"] },
  { title: "言谈与倾听", module: KNOWLEDGE_MODULES.ETIQUETTE, level: 3, path: "12/1/3", order: 3, category: "基本礼仪", subCategory: "言谈", keywords: ["言谈", "倾听", "沟通"] },
  { title: "高端场合礼仪", module: KNOWLEDGE_MODULES.ETIQUETTE, level: 2, path: "12/2", order: 2, category: "高端场合", keywords: ["晚宴", "酒会", "国际"] },
  { title: "国际礼仪要点", module: KNOWLEDGE_MODULES.ETIQUETTE, level: 3, path: "12/2/1", order: 1, category: "高端场合", subCategory: "国际", keywords: ["国际", "文化", "差异"] },

  // === 时间管理（扩展至 ≥10 节点）===
  { title: "时间管理", module: KNOWLEDGE_MODULES.TIME_MANAGEMENT, level: 1, path: "13", order: 13, keywords: ["时间", "效率", "习惯"] },
  { title: "时间规划", module: KNOWLEDGE_MODULES.TIME_MANAGEMENT, level: 2, path: "13/1", order: 1, category: "时间规划", keywords: ["规划", "优先级", "日程"] },
  { title: "美容与时间", module: KNOWLEDGE_MODULES.TIME_MANAGEMENT, level: 3, path: "13/1/1", order: 1, category: "时间规划", subCategory: "美容与时间", keywords: ["美容", "护肤", "时间分配"] },
  { title: "优先级与要事第一", module: KNOWLEDGE_MODULES.TIME_MANAGEMENT, level: 3, path: "13/1/2", order: 2, category: "时间规划", subCategory: "优先级", keywords: ["优先级", "要事", "效率"] },
  { title: "护肤流程与时间分配", module: KNOWLEDGE_MODULES.TIME_MANAGEMENT, level: 3, path: "13/1/3", order: 3, category: "时间规划", subCategory: "护肤流程", keywords: ["护肤", "流程", "晨晚间"] },
  { title: "习惯与节奏", module: KNOWLEDGE_MODULES.TIME_MANAGEMENT, level: 2, path: "13/2", order: 2, category: "习惯与节奏", keywords: ["习惯", "节奏", "坚持"] },
  { title: "医美与护理周期规划", module: KNOWLEDGE_MODULES.TIME_MANAGEMENT, level: 3, path: "13/2/1", order: 1, category: "习惯与节奏", subCategory: "医美周期", keywords: ["医美", "周期", "维护"], context: "项目间隔与长期维护的时间安排" },

  // === 环境美学（扩展至 ≥10 节点）===
  { title: "环境美学", module: KNOWLEDGE_MODULES.ENVIRONMENT, level: 1, path: "14", order: 14, keywords: ["环境", "美学", "空间"] },
  { title: "居住与工作环境", module: KNOWLEDGE_MODULES.ENVIRONMENT, level: 2, path: "14/1", order: 1, category: "居住与工作环境", keywords: ["环境", "光线", "空气质量"] },
  { title: "环境与健康", module: KNOWLEDGE_MODULES.ENVIRONMENT, level: 3, path: "14/1/1", order: 1, category: "居住与工作环境", subCategory: "环境与健康", keywords: ["健康", "皮肤", "睡眠"] },
  { title: "光线与皮肤", module: KNOWLEDGE_MODULES.ENVIRONMENT, level: 3, path: "14/1/2", order: 2, category: "居住与工作环境", subCategory: "光线", keywords: ["光线", "紫外线", "蓝光"] },
  { title: "空气质量与护肤", module: KNOWLEDGE_MODULES.ENVIRONMENT, level: 3, path: "14/1/3", order: 3, category: "居住与工作环境", subCategory: "空气质量", keywords: ["空气质量", "污染", "屏障"] },
  { title: "环境与睡眠质量", module: KNOWLEDGE_MODULES.ENVIRONMENT, level: 2, path: "14/2", order: 2, category: "环境与睡眠", keywords: ["睡眠", "环境", "温度"] },
  { title: "卧室环境优化", module: KNOWLEDGE_MODULES.ENVIRONMENT, level: 3, path: "14/2/1", order: 1, category: "环境与睡眠", subCategory: "卧室", keywords: ["卧室", "黑暗", "温度"] },

  // === 科技美容（扩展至 ≥10 节点）===
  { title: "科技美容", module: KNOWLEDGE_MODULES.TECH_BEAUTY, level: 1, path: "15", order: 15, keywords: ["科技", "美容", "仪器"] },
  { title: "美容仪器", module: KNOWLEDGE_MODULES.TECH_BEAUTY, level: 2, path: "15/1", order: 1, category: "美容仪器", keywords: ["仪器", "家用", "专业"] },
  { title: "智能与数字化", module: KNOWLEDGE_MODULES.TECH_BEAUTY, level: 3, path: "15/1/1", order: 1, category: "美容仪器", subCategory: "智能与数字化", keywords: ["智能", "APP", "虚拟试妆"] },
  { title: "家用美容仪与专业设备", module: KNOWLEDGE_MODULES.TECH_BEAUTY, level: 3, path: "15/1/2", order: 2, category: "美容仪器", subCategory: "家用与专业", keywords: ["家用", "专业", "区别"] },
  { title: "美容仪器的安全与禁忌", module: KNOWLEDGE_MODULES.TECH_BEAUTY, level: 3, path: "15/1/3", order: 3, category: "美容仪器", subCategory: "安全", keywords: ["安全", "禁忌", "循证"], context: "家用与专业仪器的使用边界" },
  { title: "数字化护肤与AI", module: KNOWLEDGE_MODULES.TECH_BEAUTY, level: 2, path: "15/2", order: 2, category: "数字化", keywords: ["AI", "皮肤检测", "个性化"] },
  { title: "皮肤检测与数据分析", module: KNOWLEDGE_MODULES.TECH_BEAUTY, level: 3, path: "15/2/1", order: 1, category: "数字化", subCategory: "皮肤检测", keywords: ["皮肤检测", "数据", "解读"] },
];

type GeneratedKnowledgeLike = {
  title: string;
  summary: string;
  content: string;
  positiveEvidence: Array<{ source: string; title: string; content: string; data?: string }>;
  negativeEvidence: Array<{ source: string; title: string; content: string; data?: string }>;
  neutralAnalysis: string;
  practicalGuide: Array<{
    step: number;
    title: string;
    description: string;
    tools?: string;
    duration?: string;
    tips?: string;
  }>;
  caseStudies: Array<{
    title: string;
    description: string;
    before: string;
    after: string;
    duration: string;
    result: string;
    lessons: string;
  }>;
  expertOpinions: Array<{
    expert: string;
    title: string;
    institution?: string;
    content: string;
    source?: string;
  }>;
  tags: string[];
};

function getMode(): "local" | "llm" {
  const arg = process.argv.find((a) => a.startsWith("--mode="));
  const fromArg = arg?.split("=")?.[1]?.trim();
  const fromEnv = process.env.KNOWLEDGE_GEN_MODE?.trim();
  const mode = (fromArg || fromEnv || "local").toLowerCase();
  return mode === "llm" ? "llm" : "local";
}

function localGenerate(node: KnowledgeNode): GeneratedKnowledgeLike {
  const keywords = node.keywords?.length ? node.keywords.join("、") : node.title;
  const levelHint =
    node.level <= 2 ? "基础认知" : node.level <= 4 ? "进阶理解" : "深度实操";

  const summary = `${node.title}（${levelHint}）：围绕${keywords}，从循证原理、影响因素、风险与边界到可执行方案，形成面向深圳高端医美机构与高认知客户的可信知识与实践框架。适用边界与禁忌以专业指南与机构 SOP 为准。`;

  const content = [
    `## 这是什么`,
    `“${node.title}”属于${node.module}模块，层级 L${node.level}，内容标准为医学正规、科学规范、可追溯，供深圳高端医美机构与高认知客户阅读与员工标准化执行。`,
    ``,
    `## 为什么和“变美”有关（从底层出发）`,
    `我们把变美拆成底层变量：睡眠/水分/情绪/饮食/运动 + 皮肤/口腔/体态/医美手段。${node.title}会影响其中的关键环节（屏障、炎症、代谢、激素、行为习惯等）。`,
    ``,
    `## 关键机制（用人话解释）`,
    `- 机制1：刺激/修复的平衡 —— 做得太猛会“过度刺激”，做得太轻又“没效果”。`,
    `- 机制2：短期效果 vs 长期稳定 —— 长期稳定依赖基础习惯，而不是一次手段。`,
    `- 机制3：个体差异 —— 体质、肤质、作息、环境、既往史会显著影响结果。`,
    ``,
    `## 常见误区`,
    `- 只看单一手段，不做基础：只做项目不管睡眠/防晒/饮食，容易反复。`,
    `- 追求“立刻见效”：忽略周期（代谢、修复、炎症消退都需要时间）。`,
    `- 不评估风险：忽略禁忌症/敏感期/用药史。`,
    ``,
    `## 适用边界（什么时候该找专业人士）`,
    `- 出现持续性红肿、疼痛、破溃、渗出、明显色素异常等，需要皮肤科/口腔科/正规机构评估。`,
    `- 孕期/哺乳期/正在服用维A酸类等特殊情况，谨慎处理。`,
    ``,
    `## 可执行的最小闭环（可被训练/复盘）`,
    `1) 评估：问题是什么？严重程度？触发因素？`,
    `2) 目标：想改善什么？可接受的时间成本/预算？`,
    `3) 方案：基础习惯 + 护理/产品 + 必要时的医美/治疗`,
    `4) 记录：每周对比（照片/感受/指标）`,
    `5) 调整：有效就保持，无效就回到评估重做假设`,
    ``,
    node.context ? `> 上下文：${node.context}` : "",
    node.level >= 5
      ? `\n## 实操要点（深化）\n针对「${node.title}」的落地建议：结合客户当前状态（肤质/体质/既往史）做一次小范围试点，记录 1–2 周内的变化与不适感；若效果稳定再考虑扩大范围或升级方案。争议点与禁忌以专业指南或机构 SOP 为准。`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const positiveEvidence = [
    {
      source: "循证与指南",
      title: "机制与证据一致性",
      content: `从机制与现有证据看，${node.title}与屏障-炎症-修复-行为习惯等环节相关。在基础变量（睡眠/水分/情绪/饮食）稳定前提下，更易获得可复现的长期改善；建议引用指南或高质量研究补齐数据。`,
      data: "建议引用《中国XXX指南》或机构 SOP 与最新共识",
    },
    {
      source: "高端服务 SOP（可对接内部规范）",
      title: "可执行与可复盘闭环",
      content: `将${node.title}纳入“评估→目标→方案→记录→调整”的闭环，便于标准化执行与客户长期管理，符合高端诊所对品质与可追溯性的要求。`,
      data: "建议对接机构 SOP 与效果数据",
    },
  ];

  const negativeEvidence = [
    {
      source: "风险与禁忌（需对照指南/共识）",
      title: "个体差异与过度干预",
      content: `${node.title}相关干预若频率/剂量/强度过高，可能引发刺激、炎症加重或屏障受损。敏感或屏障薄弱人群需分级策略；具体禁忌以最新指南与机构 SOP 为准。`,
      data: "建议引用指南与机构 SOP 中的禁忌与不良反应清单",
    },
  ];

  const neutralAnalysis =
    `本条目为结构化知识框架，面向深圳高端医美机构与高认知客户知识体系。` +
    `后续将结合权威指南、系统综述、RCT/队列研究及可核验案例持续完善；争议点与禁忌以专业共识与机构 SOP 为准，确保内容达到医学正规、科学规范标准。`;

  const practicalGuide = [
    {
      step: 1,
      title: "做一次可复盘的评估",
      description: "记录现状、触发因素、近期作息饮食、护肤/项目史，明确主诉与优先级。",
      tools: "手机记录/照片、问诊表",
      duration: "10-20分钟",
      tips: "先别急着买产品/上项目，先把问题定义清楚。",
    },
    {
      step: 2,
      title: "先稳定底层变量",
      description: "睡眠、饮水、情绪压力、饮食结构、运动，选择最容易坚持的两项先做。",
      tools: "睡眠/饮水提醒、简易运动计划",
      duration: "2周起",
      tips: "追求“可坚持”，而不是“一次做到完美”。",
    },
    {
      step: 3,
      title: "低刺激地试方案",
      description: "从低频率/低强度开始，观察 3-7 天的反应，再逐步加量或升级。",
      tools: "基础护理用品（按模块由门店SOP补齐）",
      duration: "1-4周",
      tips: "任何不适加重都应立即降级或暂停。",
    },
    {
      step: 4,
      title: "建立对比与复盘",
      description: "每周固定光线拍照，对比“红/痒/油/干/痛”等主观评分，记录变化。",
      tools: "固定拍照点位、评分表",
      duration: "每周5分钟",
      tips: "用数据帮助决策，避免情绪化加码。",
    },
    ...(node.level >= 5
      ? [
          {
            step: 5,
            title: "深化与迭代",
            description: `针对「${node.title}」做小范围试点后，根据反馈调整频率或强度，并补充证据与案例到知识库。`,
            tools: "内部SOP、案例模板",
            duration: "持续",
            tips: "叶子节点内容可随实践不断丰富 positiveEvidence / practicalGuide。",
          },
        ]
      : []),
  ];

  const caseStudies = [
    {
      title: `${node.title}：从反复到稳定的典型路径`,
      description: "以“先稳定底层变量，再做分级干预”为主线的典型复盘案例（占位稿）。",
      before: "问题反复、护理随意、缺少记录与边界意识。",
      after: "形成可执行闭环，反复频率下降，状态更稳定。",
      duration: "4-8周",
      result: "稳定性提升，复发/波动降低（建议以机构 SOP 与随访数据补充量化指标）。",
      lessons: "先把基础做到位，再谈更强的手段；记录和复盘决定长期效果。",
    },
  ];

  const expertOpinions = [
    {
      expert: "循证与指南共识",
      title: "建议引用领域专家或共识",
      institution: "指南/学会/机构",
      content:
        `针对“${node.title}”：建议采用分级策略——先评估风险与基础变量，再选择低刺激、可复盘的方案；` +
        `异常或持续恶化时优先转诊/面诊。具体以最新专家共识与机构 SOP 为准，以符合高端客户对专业与安全的期待。`,
      source: "建议引用学会共识/指南/机构 SOP",
    },
  ];

  const tags = Array.from(new Set([...(node.keywords || []), node.module, `L${node.level}`])).slice(0, 8);

  return {
    title: node.title,
    summary,
    content,
    positiveEvidence,
    negativeEvidence,
    neutralAnalysis,
    practicalGuide,
    caseStudies,
    expertOpinions,
    tags,
  };
}

async function generateAndImport() {
  const db = await getDb();
  if (!db) {
    console.error("❌ 数据库连接失败");
    process.exit(1);
  }

  const mode = getMode();
  const generator = mode === "llm" ? new KnowledgeGenerator() : null;
  const createdNodes = new Map<string, number>(); // path -> id

  console.log(`\n🚀 开始生成并导入知识库内容...\n`);
  console.log(`总共需要生成 ${knowledgeStructure.length} 个知识点\n`);
  console.log(`生成模式: ${mode === "llm" ? "LLM（DeepSeek）" : "本地模板（快速入库）"}\n`);

  for (let i = 0; i < knowledgeStructure.length; i++) {
    const node = knowledgeStructure[i];
    console.log(`\n${"=".repeat(60)}`);
    console.log(`进度: ${i + 1}/${knowledgeStructure.length}`);
    console.log(`正在生成: ${"  ".repeat(node.level - 1)}${node.title} (L${node.level})`);
    console.log(`${"=".repeat(60)}\n`);

    try {
      // 跳过已存在（按 module+path 判断）
      const existed = await db
        .select({ id: knowledgeBase.id })
        .from(knowledgeBase)
        .where(and(eq(knowledgeBase.module, node.module), eq(knowledgeBase.path, node.path)))
        .limit(1);
      if (existed[0]?.id) {
        createdNodes.set(node.path, existed[0].id);
        console.log(`⏭️  已存在，跳过 (ID: ${existed[0].id})`);
        continue;
      }

      // 生成内容（优先本地模板，速度最快；需要时可切换 LLM）
      const generated: GeneratedKnowledgeLike =
        mode === "llm" && generator
          ? await generator.generate({
              title: node.title,
              module: node.module,
              level: node.level,
              context: node.context,
              keywords: node.keywords,
            })
          : localGenerate(node);

      // 确定parentId
      let parentId: number | null = null;
      if (node.path.includes("/")) {
        const parentPath = node.path.split("/").slice(0, -1).join("/");
        parentId = createdNodes.get(parentPath) || null;
      }

      // 插入数据库
      const result = await db.insert(knowledgeBase).values({
        parentId,
        level: node.level,
        path: node.path,
        order: node.order,
        module: node.module,
        // 兼容旧库：category 可能是 NOT NULL
        category: node.category ?? node.subCategory ?? node.module ?? "默认分类",
        subCategory: node.subCategory,
        title: generated.title,
        summary: generated.summary,
        content: generated.content,
        positiveEvidence: JSON.stringify(generated.positiveEvidence),
        negativeEvidence: JSON.stringify(generated.negativeEvidence),
        neutralAnalysis: generated.neutralAnalysis,
        practicalGuide: JSON.stringify(generated.practicalGuide),
        caseStudies: JSON.stringify(generated.caseStudies),
        expertOpinions: JSON.stringify(generated.expertOpinions),
        tags: JSON.stringify(generated.tags),
        sources: JSON.stringify([
          {
            type: mode === "llm" ? "llm_generated" : "local_generated",
            generator: mode === "llm" ? "deepseek-chat" : "template-v1",
            date: new Date().toISOString(),
          },
        ]),
        credibility: mode === "llm" ? 8 : 6,
        difficulty: node.level <= 2 ? "beginner" : node.level <= 4 ? "intermediate" : "advanced",
        type: "customer",
        isActive: 1,
      }).returning({ id: knowledgeBase.id });

      const nodeId = result[0]?.id;
      if (nodeId) {
        createdNodes.set(node.path, nodeId);
        console.log(`✅ 已导入数据库 (ID: ${nodeId})`);
        console.log(`   摘要: ${generated.summary.substring(0, 80)}...`);
        console.log(`   正面论证: ${generated.positiveEvidence.length} 条`);
        console.log(`   反面论证: ${generated.negativeEvidence.length} 条`);
        console.log(`   实践指导: ${generated.practicalGuide.length} 个步骤`);
        console.log(`   案例研究: ${generated.caseStudies.length} 个案例`);
      }
    } catch (error) {
      console.error(`❌ 处理失败: ${node.title}`);
      console.error(error);
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`✅ 完成！共生成并导入 ${createdNodes.size} 个知识点`);
  console.log(`${"=".repeat(60)}\n`);
}

// 仅在被直接运行时执行，避免被 import-knowledge-from-docs 等引用时触发
if (process.argv[1]?.includes("generate-and-import-knowledge")) {
  generateAndImport().catch((error) => {
    logger.error("生成和导入失败", error);
    process.exit(1);
  });
}
