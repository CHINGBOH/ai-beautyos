import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Database, Brain, Zap, ExternalLink } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function Admin() {
  const [, setLocation] = useLocation();
  const overviewQuery = trpc.analytics.getOverview.useQuery();

  const sections = [
    {
      icon: Database,
      title: "Airtable 集成",
      description: "配置 Airtable API Token 和 Base ID，将线索数据同步至外部表格",
      action: () => setLocation("/dashboard/config"),
      actionLabel: "前往配置",
    },
    {
      icon: Zap,
      title: "自动化触发器",
      description: "管理生日提醒、节日营销、术后回访等自动化跟进规则",
      action: () => setLocation("/dashboard/triggers"),
      actionLabel: "管理触发器",
    },
    {
      icon: Brain,
      title: "知识库管理",
      description: "维护 AI 客服使用的产品知识、话术和常见问题数据",
      action: () => setLocation("/dashboard/knowledge"),
      actionLabel: "管理知识库",
    },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="w-8 h-8 text-[#B8A68D]" />
          <div>
            <h1 className="text-3xl font-bold text-gray-800">系统管理</h1>
            <p className="text-gray-600">配置集成、自动化规则和知识库</p>
          </div>
        </div>

        {/* 系统状态 */}
        <Card className="border-stone-200">
          <CardHeader>
            <CardTitle>系统状态</CardTitle>
            <CardDescription>当前数据库和业务数据概览</CardDescription>
          </CardHeader>
          <CardContent>
            {overviewQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">加载中...</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-muted text-center">
                  <div className="text-2xl font-bold">{overviewQuery.data?.totalLeads ?? 0}</div>
                  <div className="text-xs text-muted-foreground mt-1">线索总数</div>
                </div>
                <div className="p-3 rounded-lg bg-muted text-center">
                  <div className="text-2xl font-bold">{overviewQuery.data?.totalConversations ?? 0}</div>
                  <div className="text-xs text-muted-foreground mt-1">对话总数</div>
                </div>
                <div className="p-3 rounded-lg bg-muted text-center">
                  <div className="text-2xl font-bold">{Object.keys(overviewQuery.data?.sourceDistribution ?? {}).length}</div>
                  <div className="text-xs text-muted-foreground mt-1">渠道数</div>
                </div>
                <div className="p-3 rounded-lg bg-muted text-center">
                  <div className="text-sm font-medium text-green-600">正常</div>
                  <div className="text-xs text-muted-foreground mt-1">数据库状态</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 配置入口 */}
        <div className="grid gap-4 md:grid-cols-1">
          {sections.map(s => (
            <Card key={s.title} className="border-stone-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <s.icon className="w-5 h-5 text-[#B8A68D]" />
                  {s.title}
                </CardTitle>
                <CardDescription>{s.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" onClick={s.action}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {s.actionLabel}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-stone-200">
          <CardHeader>
            <CardTitle>说明</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>• 线索与对话数据保存在本系统数据库，可在「客户管理」「对话管理」中查看</p>
            <p>• Hermes AI Agent 工具服务运行在 /tools/* 路径下，已接入真实数据</p>
            <p>• 企业微信集成请在「企业微信」页面配置凭证后生效</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
