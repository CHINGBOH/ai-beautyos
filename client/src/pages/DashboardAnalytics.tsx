import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, Users, MessageSquare, RefreshCw } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Streamdown } from "streamdown";

export default function DashboardAnalytics() {
  const leadsQuery = trpc.analytics.generateLeadsReport.useMutation();
  const recommendationsQuery = trpc.analytics.generateMarketingSuggestions.useMutation();
  const overviewQuery = trpc.analytics.getOverview.useQuery();

  const handleRefresh = () => {
    leadsQuery.mutate();
    recommendationsQuery.mutate();
    overviewQuery.refetch();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">数据分析</h1>
            <p className="text-muted-foreground mt-2">
              基于 AI 的智能数据分析和营销建议
            </p>
          </div>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新数据
          </Button>
        </div>

        {/* 线索分析 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              线索转化分析
            </CardTitle>
            <CardDescription>
              基于历史数据的线索转化率分析报告
            </CardDescription>
          </CardHeader>
          <CardContent>
            {leadsQuery.isPending ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : leadsQuery.data?.success ? (
              <div className="prose prose-sm max-w-none">
                <Streamdown>{leadsQuery.data.report}</Streamdown>
              </div>
            ) : leadsQuery.data?.error ? (
              <p className="text-muted-foreground">{leadsQuery.data.error}</p>
            ) : (
              <Button onClick={() => leadsQuery.mutate()} variant="outline">
                生成分析报告
              </Button>
            )}
          </CardContent>
        </Card>

        {/* 数据概览 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              数据概览
            </CardTitle>
            <CardDescription>
              线索和对话数据统计
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overviewQuery.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : overviewQuery.data ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{overviewQuery.data.totalLeads}</div>
                  <div className="text-sm text-muted-foreground">总线索数</div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{overviewQuery.data.totalConversations}</div>
                  <div className="text-sm text-muted-foreground">总对话数</div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">暂无数据</p>
            )}
          </CardContent>
        </Card>

        {/* 营销建议 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              智能营销建议
            </CardTitle>
            <CardDescription>
              基于数据分析的营销策略和改进建议
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recommendationsQuery.isPending ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : recommendationsQuery.data?.success ? (
              <div className="prose prose-sm max-w-none">
                <Streamdown>{recommendationsQuery.data.suggestions}</Streamdown>
              </div>
            ) : recommendationsQuery.data?.error ? (
              <p className="text-muted-foreground">{recommendationsQuery.data.error}</p>
            ) : (
              <Button onClick={() => recommendationsQuery.mutate()} variant="outline">
                生成营销建议
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
