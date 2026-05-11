import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { KnowledgeComparison } from "./KnowledgeComparison";
import { MODULE_NAMES } from "@shared/types";

export function KnowledgeDetailView({ knowledgeId }: { knowledgeId: number }) {
  const { data: knowledge, isLoading } = trpc.knowledge.getById.useQuery({ id: knowledgeId });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!knowledge) {
    return <div className="text-center py-12 text-muted-foreground">知识内容未找到</div>;
  }

  return (
    <div className="space-y-6">
      {/* 标题和基本信息 */}
      <div>
        <h2 className="text-2xl font-bold mb-2">{knowledge.title}</h2>
        {knowledge.summary && (
          <p className="text-gray-600 mb-4">{knowledge.summary}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">层级 {knowledge.level}</Badge>
          {knowledge.module && (
            <Badge variant="secondary">
              {MODULE_NAMES[knowledge.module as keyof typeof MODULE_NAMES] || knowledge.module}
            </Badge>
          )}
          {knowledge.difficulty && (
            <Badge variant="outline">难度: {knowledge.difficulty}</Badge>
          )}
          <Badge variant="outline">可信度: {knowledge.credibility}/10</Badge>
        </div>
      </div>

      {/* 完整内容 */}
      <div>
        <h3 className="text-lg font-semibold mb-3">内容</h3>
        <div className="prose max-w-none">
          <div className="whitespace-pre-wrap text-sm">{knowledge.content}</div>
        </div>
      </div>

      {/* 正反对比 */}
      <KnowledgeComparison
        positiveEvidence={knowledge.positiveEvidence}
        negativeEvidence={knowledge.negativeEvidence}
        neutralAnalysis={knowledge.neutralAnalysis}
      />

      {/* 实践指导 */}
      {knowledge.practicalGuide && (
        <div>
          <h3 className="text-lg font-semibold mb-3">实践指导</h3>
          <div className="bg-gray-50 border rounded-lg p-4">
            <PracticalGuideView guide={knowledge.practicalGuide} />
          </div>
        </div>
      )}

      {/* 案例研究 */}
      {knowledge.caseStudies && (
        <div>
          <h3 className="text-lg font-semibold mb-3">案例研究</h3>
          <div className="bg-gray-50 border rounded-lg p-4">
            <CaseStudiesView cases={knowledge.caseStudies} />
          </div>
        </div>
      )}

      {/* 专家观点 */}
      {knowledge.expertOpinions && (
        <div>
          <h3 className="text-lg font-semibold mb-3">专家观点</h3>
          <div className="bg-gray-50 border rounded-lg p-4">
            <ExpertOpinionsView opinions={knowledge.expertOpinions} />
          </div>
        </div>
      )}

      {/* 统计信息 */}
      <div className="border-t pt-4">
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">查看次数</div>
            <div className="font-semibold">{knowledge.viewCount}</div>
          </div>
          <div>
            <div className="text-muted-foreground">使用次数</div>
            <div className="font-semibold">{knowledge.usedCount}</div>
          </div>
          <div>
            <div className="text-muted-foreground">点赞数</div>
            <div className="font-semibold">{knowledge.likeCount || 0}</div>
          </div>
          <div>
            <div className="text-muted-foreground">分享数</div>
            <div className="font-semibold">{knowledge.shareCount || 0}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PracticalGuideView({ guide }: { guide: string }) {
  try {
    const steps = JSON.parse(guide);
    return (
      <div className="space-y-4">
        {Array.isArray(steps) && steps.map((step: any, index: number) => (
          <div key={index} className="border-l-4 border-blue-500 pl-4">
            <div className="font-medium mb-1">
              步骤 {step.step || index + 1}: {step.title || step.description?.substring(0, 30)}
            </div>
            <div className="text-sm text-gray-700">{step.description}</div>
            {step.tools && (
              <div className="text-xs text-gray-500 mt-1">工具: {step.tools}</div>
            )}
            {step.duration && (
              <div className="text-xs text-gray-500">时间: {step.duration}</div>
            )}
            {step.tips && (
              <div className="text-xs text-amber-600 mt-1">💡 {step.tips}</div>
            )}
          </div>
        ))}
      </div>
    );
  } catch {
    return <div className="text-sm whitespace-pre-wrap">{guide}</div>;
  }
}

function CaseStudiesView({ cases }: { cases: string }) {
  try {
    const caseList = JSON.parse(cases);
    return (
      <div className="space-y-4">
        {Array.isArray(caseList) && caseList.map((caseItem: any, index: number) => (
          <div key={index} className="border rounded-lg p-4">
            <div className="font-medium mb-2">{caseItem.title}</div>
            <div className="text-sm text-gray-700 mb-2">{caseItem.description}</div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">之前</div>
                <div>{caseItem.before}</div>
              </div>
              <div>
                <div className="text-muted-foreground">之后</div>
                <div>{caseItem.after}</div>
              </div>
            </div>
            {caseItem.duration && (
              <div className="text-xs text-gray-500 mt-2">持续时间: {caseItem.duration}</div>
            )}
            {caseItem.result && (
              <div className="text-xs text-green-600 mt-2">结果: {caseItem.result}</div>
            )}
            {caseItem.lessons && (
              <div className="text-xs text-blue-600 mt-2">经验: {caseItem.lessons}</div>
            )}
          </div>
        ))}
      </div>
    );
  } catch {
    return <div className="text-sm whitespace-pre-wrap">{cases}</div>;
  }
}

function ExpertOpinionsView({ opinions }: { opinions: string }) {
  try {
    const opinionList = JSON.parse(opinions);
    return (
      <div className="space-y-4">
        {Array.isArray(opinionList) && opinionList.map((opinion: any, index: number) => (
          <div key={index} className="border-l-4 border-purple-500 pl-4">
            <div className="font-medium mb-1">
              {opinion.expert} - {opinion.title}
            </div>
            <div className="text-sm text-gray-700">{opinion.content}</div>
            {opinion.source && (
              <div className="text-xs text-gray-500 mt-1">来源: {opinion.source}</div>
            )}
            {opinion.date && (
              <div className="text-xs text-gray-500">日期: {opinion.date}</div>
            )}
          </div>
        ))}
      </div>
    );
  } catch {
    return <div className="text-sm whitespace-pre-wrap">{opinions}</div>;
  }
}
