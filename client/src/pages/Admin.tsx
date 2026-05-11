import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Settings, Database, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

export default function Admin() {
  const [airtableToken, setAirtableToken] = useState("");
  const [airtableBaseId, setAirtableBaseId] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [isConfigured, setIsConfigured] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const saveConfig = trpc.admin.saveAirtableConfig.useMutation();
  const testConnection = trpc.admin.testAirtableConnection.useMutation();
  const setupTables = trpc.admin.setupAirtableTables.useMutation();
  const getConfig = trpc.admin.getAirtableConfig.useQuery();

  // 加载现有配置
  useEffect(() => {
    if (getConfig.data) {
      const hasConfig = !!getConfig.data.token && !!getConfig.data.baseId;
      setIsConfigured(hasConfig);
      if (hasConfig && !airtableToken && !airtableBaseId) {
        setAirtableToken(getConfig.data.token || "");
        setAirtableBaseId(getConfig.data.baseId || "");
      }
    }
  }, [getConfig.data]);

  const handleSave = async () => {
    if (!airtableToken || !airtableBaseId) {
      toast.error("请填写完整的配置信息");
      return;
    }

    try {
      await saveConfig.mutateAsync({
        token: airtableToken,
        baseId: airtableBaseId,
      });
      setIsConfigured(true);
      setIsEditing(false);
      toast.success("配置已保存并锁定！");
    } catch (error) {
      toast.error("保存失败，请重试");
      console.error(error);
    }
  };

  const handleSetup = async () => {
    if (!airtableToken || !airtableBaseId) {
      toast.error("请先填写配置信息");
      return;
    }

    try {
      const result = await setupTables.mutateAsync({
        token: airtableToken,
        baseId: airtableBaseId,
      });

      if (result.success) {
        toast.success(
          `设置完成！创建了 ${result.created.length} 张表，跳过了 ${result.skipped.length} 张已存在的表。`
        );
      } else {
        toast.error(`设置失败：${result.errors.join(", ")}`);
      }
    } catch (error) {
      toast.error("自动设置失败");
      console.error(error);
    }
  };

  const handleTest = async () => {
    if (!airtableToken || !airtableBaseId) {
      toast.error("请先填写配置信息");
      return;
    }

    setTestStatus("testing");
    try {
      const result = await testConnection.mutateAsync({
        token: airtableToken,
        baseId: airtableBaseId,
      });

      if (result.success) {
        setTestStatus("success");
        toast.success("连接测试成功！");
      } else {
        setTestStatus("error");
        toast.error(`连接失败：${result.error}`);
      }
    } catch (error) {
      setTestStatus("error");
      toast.error("连接测试失败");
      console.error(error);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
          {/* 头部 */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Settings className="w-8 h-8 text-amber-600" />
              <h1 className="text-3xl font-bold text-gray-800">系统管理</h1>
            </div>
            <p className="text-gray-600">配置和管理系统集成</p>
          </div>

          {/* Airtable 配置卡片 */}
          <Card className="border-amber-100 shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Database className="w-6 h-6 text-amber-600" />
                <div>
                  <CardTitle>Airtable CRM 集成</CardTitle>
                  <CardDescription>
                    配置 Airtable API 以自动同步线索数据
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 配置状态提示 */}
              {isConfigured && !isEditing && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <p className="text-green-800 font-medium">Airtable 已配置并锁定</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="border-green-600 text-green-600 hover:bg-green-50"
                    >
                      修改配置
                    </Button>
                  </div>
                  <p className="text-sm text-green-700 mt-2">
                    配置已保存，线索数据将自动同步到 Airtable
                  </p>
                </div>
              )}

              {/* API Token */}
              {(!isConfigured || isEditing) && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="token" className="text-base font-semibold">
                      API Token (个人访问令牌)
                    </Label>
                    <Input
                      id="token"
                      type="password"
                      value={airtableToken}
                      onChange={(e) => setAirtableToken(e.target.value)}
                      placeholder="pat..."
                      className="h-12 font-mono text-sm"
                    />
                    <p className="text-sm text-gray-500">
                      获取方式：访问{" "}
                      <a
                        href="https://airtable.com/create/tokens"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-600 hover:underline"
                      >
                        Airtable Tokens
                      </a>
                      ，创建新 Token 并添加 data.records:read 和 data.records:write 权限
                    </p>
                  </div>

                  {/* Base ID */}
                  <div className="space-y-2">
                    <Label htmlFor="baseId" className="text-base font-semibold">
                      Base ID
                    </Label>
                    <Input
                      id="baseId"
                      value={airtableBaseId}
                      onChange={(e) => setAirtableBaseId(e.target.value)}
                      placeholder="appXXXXXXXXXXXXXX"
                      className="h-12 font-mono text-sm"
                    />
                    <p className="text-sm text-gray-500">
                      获取方式：打开 Airtable Base → Help → API documentation，在页面顶部可以看到 Base ID
                    </p>
                  </div>
                </>
              )}

              {/* 操作按钮 */}
              {(!isConfigured || isEditing) && (
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleTest}
                    variant="outline"
                    size="lg"
                    disabled={testStatus === "testing"}
                    className="flex-1"
                  >
                    {testStatus === "testing" && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    {testStatus === "success" && (
                      <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                    )}
                    {testStatus === "error" && (
                      <XCircle className="w-4 h-4 mr-2 text-red-600" />
                    )}
                    {testStatus === "idle" && "测试连接"}
                    {testStatus === "testing" && "测试中..."}
                    {testStatus === "success" && "连接成功"}
                    {testStatus === "error" && "连接失败"}
                  </Button>
                  <Button
                    onClick={handleSetup}
                    variant="outline"
                    size="lg"
                    disabled={setupTables.isPending}
                    className="flex-1 border-amber-600 text-amber-600 hover:bg-amber-50"
                  >
                    {setupTables.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        设置中...
                      </>
                    ) : (
                      "自动设置表结构"
                    )}
                  </Button>
                  <Button
                    onClick={handleSave}
                    size="lg"
                    disabled={saveConfig.isPending}
                    className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
                  >
                    {saveConfig.isPending ? "保存中..." : "保存配置"}
                  </Button>
                  {isEditing && (
                    <Button
                      onClick={() => setIsEditing(false)}
                      variant="outline"
                      size="lg"
                    >
                      取消
                    </Button>
                  )}
                </div>
              )}

              {/* 配置说明 */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
                <h4 className="font-semibold text-amber-900 mb-2">配置完成后</h4>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li>• 落地页表单提交的线索将自动同步到 Airtable</li>
                  <li>• AI 客服对话转化的线索也会自动记录</li>
                  <li>• 可以在 Airtable 中管理客户信息和跟进记录</li>
                </ul>
              </div>
            </CardContent>
          </Card>
      </div>
    </DashboardLayout>
  );
}
