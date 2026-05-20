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
  Zap,
  AlertCircle,
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";

export default function DashboardOverview() {
  return (
    <DashboardLayout>
      <DashboardOverviewContent />
    </DashboardLayout>
  );
}

type SystemStatusItem = {
  status: "ok" | "warning" | "error";
  label: string;
  detail: string;
};

function SystemStatusList({
  status,
  loading,
}: {
  status?: {
    runtime: SystemStatusItem;
    database: SystemStatusItem;
    ai: SystemStatusItem;
  };
  loading: boolean;
}) {
  if (loading || !status) {
    return <p className="text-sm text-muted-foreground">状态读取中...</p>;
  }

  const rows = [status.runtime, status.database, status.ai];
  const tone: Record<SystemStatusItem["status"], { text: string; dot: string }> = {
    ok: { text: "text-stone-500", dot: "bg-stone-500" },
    warning: { text: "text-amber-600", dot: "bg-amber-500" },
    error: { text: "text-destructive", dot: "bg-destructive" },
  };

  return (
    <div className="space-y-3">
      {rows.map(item => (
        <div key={item.label} className="flex items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">{item.label}</span>
          <span className={`flex items-center gap-1.5 text-sm ${tone[item.status].text}`}>
            <span className={`w-2 h-2 rounded-full animate-pulse ${tone[item.status].dot}`} />
            {item.detail}
          </span>
        </div>
      ))}
    </div>
  );
}

function DashboardOverviewContent() {
  const [, setLocation] = useLocation();

  const statsQuery = trpc.analytics.getDashboardStats.useQuery(undefined, { retry: false });
  const weeklyTrendQuery = trpc.analytics.getWeeklyTrend.useQuery(undefined, { retry: false });
  const activitiesQuery = trpc.analytics.getRecentActivities.useQuery(undefined, { retry: false });
  const systemStatusQuery = trpc.analytics.getSystemStatus.useQuery(undefined, {
    retry: false,
    refetchInterval: 30_000,
  });
  const dashboardError = statsQuery.error || weeklyTrendQuery.error || activitiesQuery.error;
  const stats = statsQuery.data;
  const weeklyTrend = weeklyTrendQuery.data;
  const activitiesData = activitiesQuery.data;
  const systemStatus = systemStatusQuery.data;
  const totalContacts = stats?.totalContacts ?? stats?.totalCustomers ?? stats?.totalLeads ?? 0;

  const trendData = weeklyTrend?.weeks?.length
    ? weeklyTrend.weeks
    : Array.from({ length: 6 }, (_, i) => ({ label: `第${i + 1}周`, leads: 0, conversations: 0 }));
  const trendMax = Math.max(1, ...trendData.flatMap(item => [item.leads, item.conversations]));

  const recentActivities = activitiesData?.activities || [];

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

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="工作台"
        description="欢迎回来，以下是 PostgreSQL 实时业务概览"
        icon={Activity}
      />

      {dashboardError ? (
        <Card className="mb-8 border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">后台数据读取失败</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {dashboardError.message}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* 快速统计 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="总客户数"
          value={totalContacts}
          description={`customers ${stats?.totalCustomers ?? 0} / leads ${stats?.totalLeads ?? 0}`}
          icon={Users}
          trend="neutral"
          trendValue="累计"
          variant="gradient"
        />
        <StatCard
          title="总对话数"
          value={stats?.totalConversations || 0}
          description="AI 对话总量"
          icon={MessageSquare}
          trend="neutral"
          trendValue="累计"
          variant="default"
        />
        <StatCard
          title="本周新增"
          value={trendData[trendData.length - 1]?.leads ?? 0}
          description="本周新增客户/线索"
          icon={BookOpen}
          trend="neutral"
          trendValue="本周"
          variant="glass"
        />
        <StatCard
          title="转化客户"
          value={`${Math.round(((stats?.convertedCustomers ?? 0) / Math.max(1, totalContacts)) * 100)}%`}
          description="线索转化率"
          icon={Target}
          trend="neutral"
          trendValue="实时"
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
                  近 6 周客户/对话增长趋势
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
                <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-primary/75" />客户/线索</span>
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
                {recentActivities.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">暂无活动记录</p>
                ) : recentActivities.map((activity) => {
                  const Icon = activity.type === "对话" ? MessageSquare : Users;
                  const timeAgo = activity.createdAt
                    ? (() => {
                        const diff = Date.now() - new Date(activity.createdAt).getTime();
                        if (diff < 60000) return "刚刚";
                        if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
                        if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
                        return `${Math.floor(diff / 86400000)} 天前`;
                      })()
                    : "";
                  return (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{activity.content}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{timeAgo}</p>
                      </div>
                    </div>
                  );
                })}
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
              <SystemStatusList status={systemStatus} loading={systemStatusQuery.isLoading} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
