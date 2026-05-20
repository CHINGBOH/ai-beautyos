import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { FileText, Users, MessageSquare, Zap, Instagram, Smartphone, AlertCircle, Info } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function DashboardMarketing() {
  const [, setLocation] = useLocation();
  const { data: priorities } = trpc.analytics.getTodayPriorities.useQuery();

  const shortcuts = [
    {
      icon: FileText,
      title: "内容管理（小红书/文案）",
      description: "生成和管理项目文案、活动内容，一键产出小红书爽文",
      path: "/dashboard/content",
    },
    {
      icon: Users,
      title: "客户管理",
      description: "查看和筛选客户画像，重点跟进 A/B 级客户与本月生日客户",
      path: "/dashboard/customers",
    },
    {
      icon: MessageSquare,
      title: "对话管理",
      description: "查看 AI 对话记录，总结高效话术与客户常见问题",
      path: "/dashboard/conversations",
    },
    {
      icon: Zap,
      title: "自动化触发器",
      description: "配置生日、节日、术后回访等自动提醒与营销触达",
      path: "/dashboard/triggers",
    },
    {
      icon: Instagram,
      title: "小红书运营",
      description: "管理小红书内容与数据表现（浏览、点赞、评论）",
      path: "/dashboard/xiaohongshu",
    },
    {
      icon: Smartphone,
      title: "企业微信",
      description: "管理企微渠道活码和客户同步，承接进店与复购",
      path: "/dashboard/wework",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">营销工作台</h1>
            <p className="text-muted-foreground mt-2">
              围绕「写内容、拉线索、建私域、做复购」的一站式工作入口
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>今日优先事项</CardTitle>
            <CardDescription>基于当前客户数据自动生成的跟进建议</CardDescription>
          </CardHeader>
          <CardContent>
            {!priorities ? (
              <p className="text-sm text-muted-foreground">加载中...</p>
            ) : priorities.priorities.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无待处理事项</p>
            ) : (
              <ul className="space-y-2">
                {priorities.priorities.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    {p.level === "high" ? (
                      <AlertCircle className="w-4 h-4 mt-0.5 text-red-500 shrink-0" />
                    ) : (
                      <Info className="w-4 h-4 mt-0.5 text-stone-400 shrink-0" />
                    )}
                    <span className={p.level === "high" ? "text-foreground font-medium" : "text-muted-foreground"}>
                      {p.text}
                    </span>
                    {p.level === "high" && (
                      <Badge variant="destructive" className="ml-auto shrink-0 text-xs">紧急</Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>功能入口</CardTitle>
            <CardDescription>从这里进入日常营销与运营相关页面</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {shortcuts.map((item) => (
              <button
                key={item.path}
                type="button"
                onClick={() => setLocation(item.path)}
                className="text-left"
              >
                <Card className="h-full hover:shadow-elevated transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5 text-[#B8A68D]" />
                      <CardTitle className="text-base">{item.title}</CardTitle>
                    </div>
                    <CardDescription className="mt-2 text-xs">
                      {item.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

