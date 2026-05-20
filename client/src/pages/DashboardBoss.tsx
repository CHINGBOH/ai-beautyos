import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Loader2, TrendingUp, Users, MessageSquare, Sparkles, AlertCircle, Info } from "lucide-react";
import { useLocation } from "wouter";

export default function DashboardBoss() {
  const overviewQuery = trpc.analytics.getOverview.useQuery();
  const prioritiesQuery = trpc.analytics.getTodayPriorities.useQuery();
  const [, setLocation] = useLocation();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">老板工作台</h1>
            <p className="text-muted-foreground mt-2">
              一眼看清业绩脉搏和重点客户，其他细节交给团队和系统
            </p>
          </div>
          <Button variant="outline" onClick={() => overviewQuery.refetch()}>
            刷新数据
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                线索与对话
              </CardTitle>
              <CardDescription>今日/累计的客户触达情况</CardDescription>
            </CardHeader>
            <CardContent>
              {overviewQuery.isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : overviewQuery.data ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-xl font-semibold">{overviewQuery.data.totalLeads}</div>
                    <div className="text-xs text-muted-foreground">总线索数</div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-xl font-semibold">{overviewQuery.data.totalConversations}</div>
                    <div className="text-xs text-muted-foreground">总对话数</div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">暂无数据</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                渠道分布
              </CardTitle>
              <CardDescription>各渠道线索来源占比</CardDescription>
            </CardHeader>
            <CardContent>
              {overviewQuery.isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : overviewQuery.data?.sourceDistribution && Object.keys(overviewQuery.data.sourceDistribution).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(overviewQuery.data.sourceDistribution as Record<string, number>)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([source, count]) => {
                      const total = overviewQuery.data!.totalLeads || 1;
                      const pct = Math.round((count / total) * 100);
                      return (
                        <div key={source} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-20 truncate">{source}</span>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-[#B8A68D] rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-medium w-8 text-right">{pct}%</span>
                        </div>
                      );
                    })}
                  <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => setLocation("/dashboard/analytics")}>
                    查看详细分析
                  </Button>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground mb-3">暂无渠道数据</p>
                  <Button size="sm" variant="outline" onClick={() => setLocation("/dashboard/analytics")}>
                    打开数据分析
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                重点问题
              </CardTitle>
              <CardDescription>用自然语言问 AI，一个问题看清全局</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                size="sm"
                className="w-full justify-start"
                variant="outline"
                onClick={() => setLocation("/dashboard/ai")}
              >
                <Sparkles className="w-4 h-4 mr-2 text-[#B8A68D]" />
                今天有多少新客户？哪些来自小红书？
              </Button>
              <Button
                size="sm"
                className="w-full justify-start"
                variant="outline"
                onClick={() => setLocation("/dashboard/ai")}
              >
                <Sparkles className="w-4 h-4 mr-2 text-[#B8A68D]" />
                本月转化率和上月相比有什么变化？
              </Button>
              <Button
                size="sm"
                className="w-full justify-start"
                variant="outline"
                onClick={() => setLocation("/dashboard/ai")}
              >
                <Sparkles className="w-4 h-4 mr-2 text-[#B8A68D]" />
                近期最值得重点跟进的 10 位客户是谁？
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>今日优先事项</CardTitle>
            <CardDescription>基于真实数据自动生成的待处理建议</CardDescription>
          </CardHeader>
          <CardContent>
            {prioritiesQuery.isLoading ? (
              <div className="flex items-center justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : (prioritiesQuery.data?.priorities || []).map((p, i) => (
              <div key={i} className="flex items-start gap-2 text-sm py-1.5">
                {p.level === "high"
                  ? <AlertCircle className="w-4 h-4 mt-0.5 text-red-500 shrink-0" />
                  : <Info className="w-4 h-4 mt-0.5 text-stone-400 shrink-0" />}
                <span className={p.level === "high" ? "font-medium" : "text-muted-foreground"}>{p.text}</span>
                {p.level === "high" && <Badge variant="destructive" className="ml-auto shrink-0 text-xs">紧急</Badge>}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>快速入口</CardTitle>
            <CardDescription>常用查看与决策页面</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => setLocation("/dashboard/customers")}
            >
              客户总览
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => setLocation("/dashboard/conversations")}
            >
              对话记录
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => setLocation("/dashboard/content")}
            >
              内容与活动效果
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

