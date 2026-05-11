import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, Database, Save } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

export default function DashboardConfig() {
  const [airtableToken, setAirtableToken] = useState("");
  const [airtableBaseId, setAirtableBaseId] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");

  const configQuery = trpc.admin.getAirtableConfig.useQuery();
  const saveConfigMutation = trpc.admin.saveAirtableConfig.useMutation();
  const testConnectionMutation = trpc.admin.testAirtableConnection.useMutation();
  const setupTableMutation = trpc.admin.setupAirtableTables.useMutation();

  useEffect(() => {
    if (configQuery.data) {
      setAirtableToken(configQuery.data.token || "");
      setAirtableBaseId(configQuery.data.baseId || "");
    }
  }, [configQuery.data]);

  const handleTestConnection = async () => {
    if (!airtableToken || !airtableBaseId) {
      toast.error("请先填写 Airtable Token 和 Base ID");
      return;
    }

    setTestStatus("testing");
    try {
      const result = await testConnectionMutation.mutateAsync({
        token: airtableToken,
        baseId: airtableBaseId,
      });

      if (result.success) {
        setTestStatus("success");
        toast.success("连接成功！");
      } else {
        setTestStatus("error");
        toast.error(result.error || "连接失败");
      }
    } catch (error) {
      setTestStatus("error");
      toast.error("连接测试失败");
    }
  };

  const handleSetupTable = async () => {
    if (!airtableToken || !airtableBaseId) {
      toast.error("请先填写 Airtable Token 和 Base ID");
      return;
    }

    try {
      const result = await setupTableMutation.mutateAsync({
        token: airtableToken,
        baseId: airtableBaseId,
      });

      if (result.success) {
        toast.success(`设置完成！创建了 ${result.created.length} 张表`);
      } else {
        toast.error(`设置失败：${result.errors.join(", ")}`);
      }
    } catch (error) {
      toast.error("表结构创建失败");
    }
  };

  const handleSaveConfig = async () => {
    if (!airtableToken || !airtableBaseId) {
      toast.error("请填写所有必填字段");
      return;
    }

    try {
      await saveConfigMutation.mutateAsync({
        token: airtableToken,
        baseId: airtableBaseId,
      });
      toast.success("配置保存成功！");
      configQuery.refetch();
    } catch (error) {
      toast.error("配置保存失败");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">系统配置</h1>
          <p className="text-muted-foreground mt-2">
            配置 Airtable 集成，实现客户数据自动同步
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Airtable 集成配置
            </CardTitle>
            <CardDescription>
              配置 Airtable API Token 和 Base ID，实现线索数据自动同步
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="token">Airtable Personal Access Token *</Label>
              <Input
                id="token"
                type="password"
                placeholder="patXXXXXXXXXXXXXXXX"
                value={airtableToken}
                onChange={(e) => setAirtableToken(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                在 Airtable 账户设置中创建 Personal Access Token，需要 data.records:read 和 data.records:write 权限
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseId">Airtable Base ID *</Label>
              <Input
                id="baseId"
                placeholder="appXXXXXXXXXXXXXX"
                value={airtableBaseId}
                onChange={(e) => setAirtableBaseId(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                在 Airtable Base 的 API 文档中找到 Base ID（格式：app + 14位字符）
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-4">
              <Button
                onClick={handleTestConnection}
                disabled={testConnectionMutation.isPending || !airtableToken || !airtableBaseId}
                variant="outline"
              >
                {testConnectionMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    测试中...
                  </>
                ) : testStatus === "success" ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                    连接成功
                  </>
                ) : testStatus === "error" ? (
                  <>
                    <XCircle className="w-4 h-4 mr-2 text-red-600" />
                    连接失败
                  </>
                ) : (
                  "测试连接"
                )}
              </Button>

              <Button
                onClick={handleSetupTable}
                disabled={setupTableMutation.isPending || !airtableToken || !airtableBaseId}
                variant="outline"
              >
                {setupTableMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    创建中...
                  </>
                ) : (
                  "自动设置表结构"
                )}
              </Button>

              <Button
                onClick={handleSaveConfig}
                disabled={saveConfigMutation.isPending || !airtableToken || !airtableBaseId}
              >
                {saveConfigMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    保存配置
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>配置说明</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <ol className="space-y-2">
              <li>
                <strong>创建 Personal Access Token：</strong>
                <ul className="mt-1">
                  <li>登录 Airtable，进入账户设置</li>
                  <li>选择 "Developer hub" → "Personal access tokens"</li>
                  <li>点击 "Create token"，选择权限：data.records:read 和 data.records:write</li>
                  <li>选择要访问的 Base，创建并复制 Token</li>
                </ul>
              </li>
              <li>
                <strong>获取 Base ID：</strong>
                <ul className="mt-1">
                  <li>打开你的 Airtable Base</li>
                  <li>点击右上角 "Help" → "API documentation"</li>
                  <li>在文档页面找到 Base ID（格式：app + 14位字符）</li>
                </ul>
              </li>
              <li>
                <strong>配置流程：</strong>
                <ul className="mt-1">
                  <li>填写 Token 和 Base ID</li>
                  <li>点击"测试连接"验证配置是否正确</li>
                  <li>点击"自动设置表结构"创建线索表（如果表不存在）</li>
                  <li>点击"保存配置"完成设置</li>
                </ul>
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
