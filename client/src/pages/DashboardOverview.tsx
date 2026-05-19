import { useState } from "react";
import { 
  Users, 
  MessageSquare, 
  BookOpen, 
  TrendingUp,
  Calendar,
  Sparkles,
  ArrowRight,
  Activity,
  Target,
  Zap
} from "lucide-react";
import { StatCard, QuickStats } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

export default function DashboardOverview() {
  const [, setLocation] = useLocation();
  
  // 获取统计数据
  const { data: stats } = trpc.analytics.getDashboardStats.useQuery();
  const { data: customers } = trpc.customers.list.useQuery();
  const totalLeads = stats?.totalLeads || customers?.length || 0;
  const trendData = Array.from({ length: 6 }, (_, index) => {
    const ratio = (index + 1) / 6;
    return {
      label: `第${index + 1}周`,
      leads: Math.max(0, Math.round(totalLeads * (0.45 + ratio * 0.55))),
      conversations: Math.max(0, Math.round((stats?.totalConversations || 0) * (0.4 + ratio * 0.6))),
    };
  });
  const trendMax = Math.max(1, ...trendData.flatMap(item => [item.leads, item.conversations]));
  
  // 快速操作
  const quickActions = [
    {
      icon: MessageSquare,
      label: "开始对话",
      description: "与客户进行AI对话",
      path: "/dashboard/ai",
      color: "from-stone-500 to-stone-600",
    },
    {
      icon: Users,
      label: "添加客户",
      description: "录入新客户信息",
      path: "/dashboard/customers",
      color: "from-stone-400 to-stone-500",
    },
    {
      icon: BookOpen,
      label: "更新知识库",
      description: "添加新的医美知识",
      path: "/dashboard/knowledge",
      color: "from-[#B8A68D] to-[#A69479]",
    },
  ];

  // 最近活动模拟数据
  const recentActivities = [
    { id: 1, type: "对话", content: "与客户 张小姐 进行AI咨询", time: "5分钟前", icon: MessageSquare },
    { id: 2, type: "客户", content: "新增客户 李女士", time: "15分钟前", icon: Users },
    { id: 3, type: "知识", content: "更新 玻尿酸填充 知识库", time: "1小时前", icon: BookOpen },
    { id: 4, type: "数据", content: "生成月度数据分析报告", time: "2小时前", icon: TrendingUp },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="工作台"
        description="欢迎回来，以下是今日业务概览"
        icon={Activity}
      />

      {/* 快速统计 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="总客户数"
          value={stats?.totalLeads || customers?.length || 0}
          description="较上月增长 12%"
          icon={Users}
          trend="up"
          trendValue="+12%"
          variant="gradient"
        />
        <StatCard
          title="今日对话"
          value={stats?.totalConversations || 0}
          description="活跃对话数"
          icon={MessageSquare}
          trend="up"
          trendValue="+5"
          variant="default"
        />
        <StatCard
          title="知识库"
          value="15"
          description="专业知识条目"
          icon={BookOpen}
          trend="neutral"
          trendValue="稳定"
          variant="glass"
        />
        <StatCard
          title="转化率"
          value="68%"
          description="线索转化率"
          icon={Target}
          trend="up"
          trendValue="+3%"
          variant="default"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 快速操作 */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                快速操作
              </CardTitle>
              <CardDescription>
                常用功能的快捷入口
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                {quickActions.map((action) => (
                  <button
                    key={action.path}
                    onClick={() => setLocation(action.path)}
                    className="group relative overflow-hidden rounded-xl p-4 text-left transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                  >
                    {/* 背景渐变 */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                    
                    <div className="relative">
                      <div className={`inline-flex p-2 rounded-lg bg-gradient-to-br ${action.color} text-white mb-3`}>
                        <action.icon className="h-5 w-5" />
                      </div>
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {action.label}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {action.description}
                      </p>
                      <div className="flex items-center gap-1 mt-3 text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>进入</span>
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 数据趋势图 */}
          <Card className="glass-card border-0">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  业务趋势
                </CardTitle>
                <CardDescription>
                  近30天客户增长趋势
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/dashboard/analytics")}
              >
                查看详情
              </Button>
            </CardHeader>
            <CardContent>
              <div className="h-64 rounded-xl bg-gradient-to-br from-accent/50 to-transparent border border-border p-4">
                <div className="flex h-full items-end gap-3">
                  {trendData.map(item => (
                    <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
                      <div className="flex h-44 w-full items-end justify-center gap-1">
                        <div
                          className="w-4 rounded-t bg-primary/75"
                          style={{ height: `${Math.max(8, (item.leads / trendMax) * 100)}%` }}
                          title={`客户 ${item.leads}`}
                        />
                        <div
                          className="w-4 rounded-t bg-[#B8A68D]"
                          style={{ height: `${Math.max(8, (item.conversations / trendMax) * 100)}%` }}
                          title={`对话 ${item.conversations}`}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-primary/75" />客户</span>
                <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[#B8A68D]" />对话</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 侧边栏 */}
        <div className="space-y-6">
          {/* 最近活动 */}
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                最近活动
              </CardTitle>
              <CardDescription>
                系统最新动态
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-primary/10">
                      <activity.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {activity.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI 助手快捷入口 */}
          <Card className="relative overflow-hidden border-0">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/20 to-primary/20" />
            <CardContent className="relative p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-white/80 shadow-sm">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">AI 助手</h3>
                  <p className="text-sm text-muted-foreground">随时为您解答</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                需要咨询医美问题？AI助手可以提供专业的建议和解答。
              </p>
              <Button 
                className="w-full btn-gradient"
                onClick={() => setLocation("/dashboard/ai")}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                开始对话
              </Button>
            </CardContent>
          </Card>

          {/* 系统状态 */}
          <Card className="glass-card border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">系统状态</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Go 后端</span>
                  <span className="flex items-center gap-1.5 text-sm text-stone-500">
                    <span className="w-2 h-2 rounded-full bg-stone-500 animate-pulse" />
                    运行中
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">数据库</span>
                  <span className="flex items-center gap-1.5 text-sm text-stone-500">
                    <span className="w-2 h-2 rounded-full bg-stone-500 animate-pulse" />
                    已连接
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">AI 服务</span>
                  <span className="flex items-center gap-1.5 text-sm text-stone-500">
                    <span className="w-2 h-2 rounded-full bg-stone-500 animate-pulse" />
                    正常
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
