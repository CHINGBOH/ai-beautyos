import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface ComparisonProps {
  positiveEvidence?: string | null;
  negativeEvidence?: string | null;
  neutralAnalysis?: string | null;
}

/**
 * 对比展示组件
 * 用于展示正反观点对比
 */
export function KnowledgeComparison({
  positiveEvidence,
  negativeEvidence,
  neutralAnalysis,
}: ComparisonProps) {
  let positive: any[] = [];
  let negative: any[] = [];
  
  try {
    if (positiveEvidence && typeof positiveEvidence === 'string') {
      positive = JSON.parse(positiveEvidence);
    }
  } catch (e) {
    // 忽略解析错误
  }
  
  try {
    if (negativeEvidence && typeof negativeEvidence === 'string') {
      negative = JSON.parse(negativeEvidence);
    }
  } catch (e) {
    // 忽略解析错误
  }

  if (positive.length === 0 && negative.length === 0 && !neutralAnalysis) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* 正反对比 */}
      {(positive.length > 0 || negative.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 正面论证 */}
          {positive.length > 0 && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="w-5 h-5" />
                  正面论证
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {positive.map((item: any, index: number) => (
                    <div key={index} className="border-l-4 border-green-500 pl-4">
                      {item.title && (
                        <div className="font-medium text-sm mb-1">{item.title}</div>
                      )}
                      <div className="text-sm text-gray-700">{item.content}</div>
                      {item.data && (
                        <Badge variant="secondary" className="mt-2 text-xs">
                          数据: {item.data}
                        </Badge>
                      )}
                      {item.source && (
                        <div className="text-xs text-gray-500 mt-1">来源: {item.source}</div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 反面论证 */}
          {negative.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                  <XCircle className="w-5 h-5" />
                  反面论证
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {negative.map((item: any, index: number) => (
                    <div key={index} className="border-l-4 border-red-500 pl-4">
                      {item.title && (
                        <div className="font-medium text-sm mb-1">{item.title}</div>
                      )}
                      <div className="text-sm text-gray-700">{item.content}</div>
                      {item.data && (
                        <Badge variant="secondary" className="mt-2 text-xs">
                          数据: {item.data}
                        </Badge>
                      )}
                      {item.source && (
                        <div className="text-xs text-gray-500 mt-1">来源: {item.source}</div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 中立分析 */}
      {neutralAnalysis && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-blue-700">
              <AlertCircle className="w-5 h-5" />
              中立分析
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm whitespace-pre-wrap text-gray-700">
              {neutralAnalysis}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
