/**
 * Followup Service
 * 跟进话术生成业务逻辑；tool-server / router 只负责鉴权与参数校验。
 */

import { getLeadById } from "../db";
import { callQwen } from "../qwen";

const TONE_MAP: Record<string, string> = {
  warm_concierge: "温暖、亲切、像老朋友一样",
  professional: "专业、权威、简洁",
  caring: "关怀、体贴、情感化",
};

export async function generateFollowupSuggestion(input: {
  customerId: number;
  tone?: string;
}) {
  const id = Number(input.customerId);
  const lead = await getLeadById(id);
  if (!lead) throw new Error(`Customer ${id} not found`);

  const tone = input?.tone ?? "warm_concierge";
  const toneDesc = TONE_MAP[tone] || TONE_MAP.warm_concierge;

  let services: string[] = [];
  try {
    services = JSON.parse(lead.interestedServices || "[]");
  } catch {
    /* ignore */
  }

  const prompt = `你是一名医美机构的销售顾问，请根据以下客户信息生成一条${toneDesc}风格的跟进话术（微信消息），50-80字，不要有任何额外说明。

客户姓名：${lead.name}
感兴趣项目：${services.join("、") || "未知"}
预算：${lead.budget || "未填写"}
客户心理类型：${lead.psychologyType || "未知"}
状态：${lead.status}`;

  let draft: string;
  try {
    draft = await callQwen([{ role: "user", content: prompt }]);
  } catch {
    draft = `您好${lead.name}，最近肌肤状态怎么样？我们最近有${services[0] || "护肤"}方面的新方案，方便的话可以约个时间来详细了解一下～`;
  }

  return {
    customerId: id,
    customerName: lead.name,
    tone,
    draft: draft.trim(),
  };
}
