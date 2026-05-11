import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Clock, Activity, Cloud, Plus, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function DashboardTriggers() {
  const [selectedType, setSelectedType] = useState<"time" | "behavior" | "weather" | "all">("all");

  const { data: triggers, isLoading, refetch } = trpc.triggers.list.useQuery();
  const executeMutation = trpc.triggers.execute.useMutation();
  const deleteMutation = trpc.triggers.delete.useMutation();

  const filteredTriggers = triggers?.filter(
    (t) => selectedType === "all" || t.type === selectedType
  );

  const handleExecute = async (id: number) => {
    try {
      const result = await executeMutation.mutateAsync({ id });
      toast.success("触发器执行成功", {
        description: result.result,
      });
      refetch();
    } catch (error: any) {
      toast.error("触发器执行失败", {
        description: error.message,
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除这个触发器吗？")) return;

    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("触发器已删除");
      refetch();
    } catch (error: any) {
      toast.error("删除失败", {
        description: error.message,
      });
    }
  };

  const getConditionText = (trigger: any) => {
    try {
      if (trigger.type === "time" && trigger.timeConfig) {
        const config = JSON.parse(trigger.timeConfig);
        return JSON.stringify(config, null, 2);
      } else if (trigger.type === "behavior" && trigger.behaviorConfig) {
        const config = JSON.parse(trigger.behaviorConfig);
        return JSON.stringify(config, null, 2);
      } else if (trigger.type === "weather" && trigger.weatherConfig) {
        const config = JSON.parse(trigger.weatherConfig);
        return JSON.stringify(config, null, 2);
      }
    } catch (e) {
      // ignore parse errors
    }
    return trigger.timeConfig || trigger.behaviorConfig || trigger.weatherConfig || "未配置";
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "time":
        return <Clock className="h-4 w-4" />;
      case "behavior":
        return <Activity className="h-4 w-4" />;
      case "weather":
        return <Cloud className="h-4 w-4" />;
      default:
        return <Zap className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "time":
        return "时间触发";
      case "behavior":
        return "行为触发";
      case "weather":
        return "天气触发";
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">自动化触发器</h1>
          <p className="text-muted-foreground mt-2">
            配置基于时间、行为和天气的自动化营销触发规则
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          创建触发器
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">全部触发器</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{triggers?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">时间触发</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {triggers?.filter((t) => t.type === "time").length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">行为触发</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {triggers?.filter((t) => t.type === "behavior").length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">天气触发</CardTitle>
            <Cloud className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {triggers?.filter((t) => t.type === "weather").length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选按钮 */}
      <div className="flex gap-2">
        <Button
          variant={selectedType === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedType("all")}
        >
          全部
        </Button>
        <Button
          variant={selectedType === "time" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedType("time")}
        >
          <Clock className="h-4 w-4 mr-2" />
          时间触发
        </Button>
        <Button
          variant={selectedType === "behavior" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedType("behavior")}
        >
          <Activity className="h-4 w-4 mr-2" />
          行为触发
        </Button>
        <Button
          variant={selectedType === "weather" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedType("weather")}
        >
          <Cloud className="h-4 w-4 mr-2" />
          天气触发
        </Button>
      </div>

      {/* 触发器列表 */}
      <div className="grid gap-4">
        {filteredTriggers && filteredTriggers.length > 0 ? (
          filteredTriggers.map((trigger) => (
            <Card key={trigger.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getTypeIcon(trigger.type)}
                    <div>
                      <CardTitle className="text-lg">{trigger.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {getTypeLabel(trigger.type)}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={trigger.isActive === 1 ? "default" : "secondary"}>
                      {trigger.isActive === 1 ? "已启用" : "已禁用"}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExecute(trigger.id)}
                      disabled={executeMutation.isPending}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      手动执行
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(trigger.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium">触发条件：</span>
                    <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                      {getConditionText(trigger)}
                    </pre>
                  </div>
                  <div>
                    <span className="text-sm font-medium">执行动作：</span>
                    <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                      {trigger.action}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Zap className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                {selectedType === "all"
                  ? "还没有创建任何触发器"
                  : `还没有创建${getTypeLabel(selectedType)}触发器`}
              </p>
              <Button className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                创建第一个触发器
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 使用提示 */}
      <Card>
        <CardHeader>
          <CardTitle>使用提示</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• <strong>时间触发器：</strong>在特定时间自动执行，如生日提醒、节日营销、定时推送等</p>
          <p>• <strong>行为触发器：</strong>根据客户行为自动执行，如浏览未咨询、咨询未预约、预约未到店等</p>
          <p>• <strong>天气触发器：</strong>根据天气变化自动执行，如晴天推送防晒项目、雨天推送室内项目等</p>
          <p>• 点击"手动执行"可以立即测试触发器效果</p>
        </CardContent>
      </Card>
    </div>
  );
}
