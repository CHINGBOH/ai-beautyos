import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Zap, Clock, Activity, Cloud, Plus, Play, Trash2, Gift, Cake } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { useLocation } from "wouter";

type TriggerType = "time" | "behavior" | "weather" | "birthday_reminder" | "holiday_reminder";

export default function DashboardTriggers() {
  const [, setLocation] = useLocation();
  const [selectedType, setSelectedType] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createType, setCreateType] = useState<TriggerType>("birthday_reminder");
  const [createDaysAhead, setCreateDaysAhead] = useState(3);
  const [createHolidayNames, setCreateHolidayNames] = useState("春节,生日,纪念日");
  const [createAction, setCreateAction] = useState<"create_task" | "follow_up">("create_task");
  const [createEnabled, setCreateEnabled] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<TriggerType>("birthday_reminder");
  const [editDaysAhead, setEditDaysAhead] = useState(3);
  const [editHolidayNames, setEditHolidayNames] = useState("");
  const [editAction, setEditAction] = useState<"create_task" | "follow_up">("create_task");
  const [editEnabled, setEditEnabled] = useState(true);
  const [executionsOpen, setExecutionsOpen] = useState(false);
  const [executionsTrigger, setExecutionsTrigger] = useState<any | null>(null);

  const { data: triggers, isLoading, refetch } = trpc.triggers.list.useQuery();
  const executeMutation = trpc.triggers.execute.useMutation();
  const deleteMutation = trpc.triggers.delete.useMutation();
  const createMutation = trpc.triggers.create.useMutation({
    onSuccess: () => {
      toast.success("触发器已创建");
      setCreateOpen(false);
      resetCreateForm();
      refetch();
    },
    onError: (e) => {
      toast.error("创建失败", { description: e.message });
    },
  });

  const updateMutation = trpc.triggers.update.useMutation({
    onSuccess: () => {
      toast.success("触发器已更新");
      setEditOpen(false);
      setEditingTrigger(null);
      refetch();
    },
    onError: (e) => {
      toast.error("更新失败", { description: e.message });
    },
  });

  const executionsQuery = trpc.triggers.executions.useQuery(
    { triggerId: executionsTrigger?.id ?? 0 },
    { enabled: !!executionsTrigger }
  );

  function resetCreateForm() {
    setCreateName("");
    setCreateType("birthday_reminder");
    setCreateDaysAhead(3);
    setCreateHolidayNames("春节,生日,纪念日");
    setCreateAction("create_task");
    setCreateEnabled(true);
  }

  function handleOpenCreate() {
    resetCreateForm();
    setCreateOpen(true);
  }

  function handleCreateSubmit() {
    if (!createName.trim()) {
      toast.error("请输入触发器名称");
      return;
    }
    let timeConfig: string;
    if (createType === "birthday_reminder") {
      timeConfig = JSON.stringify({ daysAhead: createDaysAhead });
    } else if (createType === "holiday_reminder") {
      const names = createHolidayNames
        .split(/[,，、\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      timeConfig = JSON.stringify({ holidayNames: names });
    } else {
      timeConfig = JSON.stringify({ schedule: "0 9 * * *", target: "all" });
    }
    const actionConfig = JSON.stringify({ type: createAction });
    createMutation.mutate({
      name: createName.trim(),
      type: createType,
      action: createAction,
      actionConfig,
      timeConfig,
      enabled: createEnabled,
    });
  }

  const handleOpenEdit = (trigger: any) => {
    setEditingTrigger(trigger);
    setEditName(trigger.name || "");
    setEditType(trigger.type as TriggerType);
    setEditEnabled(trigger.isActive === 1);

    let actionType: "create_task" | "follow_up" = "create_task";
    if (trigger.actionConfig) {
      try {
        const extra = JSON.parse(trigger.actionConfig) as Record<string, unknown>;
        const t = (extra as any).type;
        if (t === "create_task" || t === "follow_up") {
          actionType = t;
        }
      } catch {
        // ignore
      }
    } else if (trigger.action === "create_task" || trigger.action === "follow_up") {
      actionType = trigger.action;
    }
    setEditAction(actionType);

    if (trigger.type === "birthday_reminder") {
      try {
        const cfg = trigger.timeConfig ? JSON.parse(trigger.timeConfig) : {};
        const days = typeof cfg.daysAhead === "number" ? cfg.daysAhead : 3;
        setEditDaysAhead(days);
      } catch {
        setEditDaysAhead(3);
      }
      setEditHolidayNames("");
    } else if (trigger.type === "holiday_reminder") {
      try {
        const cfg = trigger.timeConfig ? JSON.parse(trigger.timeConfig) : {};
        const names = Array.isArray(cfg.holidayNames) ? cfg.holidayNames : [];
        setEditHolidayNames(names.join(","));
      } catch {
        setEditHolidayNames("");
      }
      setEditDaysAhead(3);
    } else {
      setEditDaysAhead(3);
      setEditHolidayNames("");
    }

    setEditOpen(true);
  };

  const handleEditSubmit = () => {
    if (!editingTrigger) return;
    if (!editName.trim()) {
      toast.error("请输入触发器名称");
      return;
    }
    const payload: any = {
      id: editingTrigger.id,
      name: editName.trim(),
      enabled: editEnabled,
    };

    if (editingTrigger.type === "birthday_reminder") {
      payload.timeConfig = JSON.stringify({ daysAhead: editDaysAhead });
      payload.action = editAction;
      payload.actionConfig = JSON.stringify({ type: editAction });
    } else if (editingTrigger.type === "holiday_reminder") {
      const names = editHolidayNames
        .split(/[,，、\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      payload.timeConfig = JSON.stringify({ holidayNames: names });
      payload.action = editAction;
      payload.actionConfig = JSON.stringify({ type: editAction });
    }

    updateMutation.mutate(payload);
  };

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

  const handleOpenExecutions = (trigger: any) => {
    setExecutionsTrigger(trigger);
    setExecutionsOpen(true);
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
      } else if ((trigger.type === "birthday_reminder" || trigger.type === "holiday_reminder") && trigger.timeConfig) {
        const config = JSON.parse(trigger.timeConfig);
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
      case "birthday_reminder":
        return <Cake className="h-4 w-4" />;
      case "holiday_reminder":
        return <Gift className="h-4 w-4" />;
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
      case "birthday_reminder":
        return "生日提醒";
      case "holiday_reminder":
        return "节日提醒";
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
    <DashboardLayout>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">自动化触发器</h1>
          <p className="text-muted-foreground mt-2">
            配置基于时间、行为和天气的自动化营销触发规则
          </p>
        </div>
        <Button variant="brand" onClick={handleOpenCreate}>
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
        <Button
          variant={selectedType === "birthday_reminder" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedType("birthday_reminder")}
        >
          <Cake className="h-4 w-4 mr-2" />
          生日提醒
        </Button>
        <Button
          variant={selectedType === "holiday_reminder" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedType("holiday_reminder")}
        >
          <Gift className="h-4 w-4 mr-2" />
          节日提醒
        </Button>
      </div>

      {/* 触发器列表 */}
      <div className="grid gap-4">
        {filteredTriggers && filteredTriggers.length > 0 ? (
          filteredTriggers.map((trigger) => (
            <Card key={trigger.id} className="shadow-card transition-[box-shadow] duration-[var(--motion-duration)] ease-[var(--motion-ease)] hover:shadow-elevated">
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
                      onClick={() => handleOpenEdit(trigger)}
                    >
                      编辑
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenExecutions(trigger)}
                    >
                      执行记录
                    </Button>
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
              <Button className="mt-4" variant="brand" onClick={handleOpenCreate}>
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
          <p>• <strong>时间触发器：</strong>在特定时间自动执行，如定时推送等</p>
          <p>• <strong>生日提醒：</strong>扫描客户生日（今日或未来 N 天内），自动创建跟进任务或执行配置动作</p>
          <p>• <strong>节日提醒：</strong>根据客户重要节日（春节、纪念日等）与今日节日匹配，自动执行跟进</p>
          <p>• <strong>行为触发器：</strong>根据客户行为自动执行，如浏览未咨询、咨询未预约、预约未到店等</p>
          <p>• <strong>天气触发器：</strong>根据天气变化自动执行，如晴天推送防晒项目、雨天推送室内项目等</p>
          <p>• 点击"手动执行"可以立即测试触发器效果</p>
        </CardContent>
      </Card>

      {/* 创建触发器弹窗 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>创建触发器</DialogTitle>
            <DialogDescription>选择类型并配置触发条件与执行动作</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium">名称</Label>
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="如：本月生日客户跟进"
                className="mt-1 h-10 rounded-lg"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">类型</Label>
              <Select value={createType} onValueChange={(v) => setCreateType(v as TriggerType)}>
                <SelectTrigger className="mt-1 h-10 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="birthday_reminder">生日提醒</SelectItem>
                  <SelectItem value="holiday_reminder">节日提醒</SelectItem>
                  <SelectItem value="time">时间触发</SelectItem>
                  <SelectItem value="behavior">行为触发</SelectItem>
                  <SelectItem value="weather">天气触发</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(createType === "birthday_reminder" || createType === "holiday_reminder") && (
              <>
                {createType === "birthday_reminder" && (
                  <div>
                    <Label className="text-sm font-medium">提前天数</Label>
                    <Input
                      type="number"
                      min={0}
                      max={30}
                      value={createDaysAhead}
                      onChange={(e) => setCreateDaysAhead(Number(e.target.value) || 0)}
                      className="mt-1 h-10 rounded-lg"
                    />
                    <p className="text-xs text-muted-foreground mt-1">扫描生日在今日至未来 N 天内的客户</p>
                  </div>
                )}
                {createType === "holiday_reminder" && (
                  <div>
                    <Label className="text-sm font-medium">节日关键词（逗号分隔，留空则用今日节日）</Label>
                    <Input
                      value={createHolidayNames}
                      onChange={(e) => setCreateHolidayNames(e.target.value)}
                      placeholder="春节,生日,纪念日"
                      className="mt-1 h-10 rounded-lg"
                    />
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium">执行动作</Label>
                  <Select value={createAction} onValueChange={(v) => setCreateAction(v as "create_task" | "follow_up")}>
                    <SelectTrigger className="mt-1 h-10 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="create_task">创建跟进任务（设置下次跟进日期）</SelectItem>
                      <SelectItem value="follow_up">创建跟进任务（设置下次跟进日期）</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={createEnabled}
                onChange={(e) => setCreateEnabled(e.target.checked)}
                className="rounded border-input"
              />
              <span className="text-sm">启用触发器</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button variant="brand" onClick={handleCreateSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? "创建中..." : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑触发器弹窗 */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑触发器</DialogTitle>
            <DialogDescription>调整名称、启用状态以及生日/节日条件与执行动作</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium">名称</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="如：本月生日客户跟进"
                className="mt-1 h-10 rounded-lg"
              />
            </div>
            {editingTrigger && (editingTrigger.type === "birthday_reminder" || editingTrigger.type === "holiday_reminder") && (
              <>
                {editingTrigger.type === "birthday_reminder" && (
                  <div>
                    <Label className="text-sm font-medium">提前天数</Label>
                    <Input
                      type="number"
                      min={0}
                      max={30}
                      value={editDaysAhead}
                      onChange={(e) => setEditDaysAhead(Number(e.target.value) || 0)}
                      className="mt-1 h-10 rounded-lg"
                    />
                    <p className="text-xs text-muted-foreground mt-1">扫描生日在今日至未来 N 天内的客户</p>
                  </div>
                )}
                {editingTrigger.type === "holiday_reminder" && (
                  <div>
                    <Label className="text-sm font-medium">节日关键词（逗号分隔）</Label>
                    <Input
                      value={editHolidayNames}
                      onChange={(e) => setEditHolidayNames(e.target.value)}
                      placeholder="春节,生日,纪念日"
                      className="mt-1 h-10 rounded-lg"
                    />
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium">执行动作</Label>
                  <Select value={editAction} onValueChange={(v) => setEditAction(v as "create_task" | "follow_up")}>
                    <SelectTrigger className="mt-1 h-10 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="create_task">创建跟进任务（设置下次跟进日期）</SelectItem>
                      <SelectItem value="follow_up">创建跟进任务（设置下次跟进日期）</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editEnabled}
                onChange={(e) => setEditEnabled(e.target.checked)}
                className="rounded border-input"
              />
              <span className="text-sm">启用触发器</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              取消
            </Button>
            <Button variant="brand" onClick={handleEditSubmit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "更新中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 执行记录弹窗 */}
      <Dialog open={executionsOpen} onOpenChange={setExecutionsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>执行记录{executionsTrigger ? `：${executionsTrigger.name}` : ""}</DialogTitle>
            <DialogDescription>查看最近的触发执行情况，可跳转到客户列表查看受影响客户</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mb-2">
            {executionsTrigger && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setLocation(`/dashboard/customers?fromTrigger=${encodeURIComponent(String(executionsTrigger.id))}`)
                }
              >
                查看相关客户
              </Button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto py-2 space-y-2 text-sm">
            {executionsQuery.isLoading && <p className="text-muted-foreground">加载中...</p>}
            {!executionsQuery.isLoading && executionsQuery.data && executionsQuery.data.length === 0 && (
              <p className="text-muted-foreground">暂时没有执行记录。</p>
            )}
            {!executionsQuery.isLoading &&
              executionsQuery.data &&
              executionsQuery.data.map((item: any) => (
                <div
                  key={item.id}
                  className="border rounded-md px-3 py-2 flex flex-col gap-1 bg-muted/50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {item.executedAt
                        ? new Date(item.executedAt).toLocaleString()
                        : ""}
                    </span>
                    <Badge variant={item.status === "success" ? "default" : "secondary"}>
                      {item.status === "success" ? "成功" : "失败"}
                    </Badge>
                  </div>
                  {item.result && (
                    <pre className="mt-1 text-xs whitespace-pre-wrap break-words">
                      {item.result}
                    </pre>
                  )}
                  {item.errorMessage && (
                    <pre className="mt-1 text-xs text-stone-500 whitespace-pre-wrap break-words">
                      {item.errorMessage}
                    </pre>
                  )}
                </div>
              ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExecutionsOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </DashboardLayout>
  );
}
