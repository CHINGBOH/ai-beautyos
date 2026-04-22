import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Loader2, TrendingUp, Users, MessageSquare, Sparkles } from "lucide-react";
import { useLocation } from "wouter";

export default function DashboardBoss() {
  const overviewQuery = trpc.analytics.getOverview.useQuery();
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
                转化与渠道
              </CardTitle>
              <CardDescription>简单感知渠道表现和转化趋势</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                详细的转化率与渠道分析请前往「数据分析」页面查看。
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLocation("/dashboard/analytics")}
              >
                打开数据分析
              </Button>
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

