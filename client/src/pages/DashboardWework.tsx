import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Smartphone, QrCode, Users, MessageSquare, Plus, Loader2, CheckCircle2, AlertCircle, Save, RefreshCw } from "lucide-react";

export default function DashboardWework() {
  const [activeTab, setActiveTab] = useState("config");
  
  const config = trpc.wework.getConfig.useQuery();
  const contactWays = trpc.wework.listContactWays.useQuery();
  const customers = trpc.wework.listCustomers.useQuery();
  
  const createContactWay = trpc.wework.createContactWay.useMutation();
  const mockAddCustomer = trpc.wework.mockAddCustomer.useMutation();
  const saveConfig = trpc.wework.saveConfig.useMutation();
  const testConnection = trpc.wework.testConnection.useMutation();
  
  const [formData, setFormData] = useState({
    corpId: "",
    corpSecret: "",
    agentId: "",
    token: "",
    encodingAesKey: "",
    isMockMode: true,
  });

  useEffect(() => {
    if (config.data) {
      setFormData({
        corpId: config.data.corpId || "",
        corpSecret: config.data.corpSecret || "",
        agentId: config.data.agentId?.toString() || "",
        token: config.data.token || "",
        encodingAesKey: config.data.encodingAesKey || "",
        isMockMode: config.data.isMockMode === 1,
      });
    }
  }, [config.data]);
  
  const isMockMode = formData.isMockMode;
  
  const handleSaveConfig = async () => {
    try {
      await saveConfig.mutateAsync({
        ...formData,
        agentId: formData.agentId ? parseInt(formData.agentId) : undefined,
        isMockMode: formData.isMockMode ? 1 : 0,
      });
      toast.success("配置已保存");
      config.refetch();
    } catch (error) {
      toast.error("保存失败");
      console.error(error);
    }
  };

  const handleTestConnection = async () => {
    if (!formData.corpId || !formData.corpSecret) {
      toast.error("请先填写 Corp ID 和 Corp Secret");
      return;
    }
    
    try {
      const result = await testConnection.mutateAsync({
        corpId: formData.corpId,
        corpSecret: formData.corpSecret,
      });
      
      if (result.success) {
        toast.success("连接测试成功！凭证有效。");
      } else {
        toast.error(`连接测试失败: ${result.error}`);
      }
    } catch (error) {
      toast.error("连接测试发生错误");
      console.error(error);
    }
  };
  
  const handleCreateContactWay = async () => {
    try {
      const result = await createContactWay.mutateAsync({
        type: "single",
        scene: "2",
        remark: "小红书引流",
        skipVerify: true,
        state: "xiaohongshu",
        userIds: ["mock_user_001"],
      });
      
      if (result.success) {
        toast.success("二维码创建成功！");
        contactWays.refetch();
      } else {
        toast.error(`创建失败：${result.error}`);
      }
    } catch (error) {
      toast.error("创建失败，请重试");
      console.error(error);
    }
  };
  
  const handleMockAddCustomer = async () => {
    try {
      const result = await mockAddCustomer.mutateAsync({
        state: "xiaohongshu",
      });
      
      if (result.success && result.customer) {
        toast.success(`模拟客户添加成功！客户：${result.customer.name}`);
        customers.refetch();
      } else {
        toast.error(`添加失败：${result.error}`);
      }
    } catch (error) {
      toast.error("添加失败，请重试");
      console.error(error);
    }
  };
  
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 头部 */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Smartphone className="w-8 h-8 text-green-600" />
              <h1 className="text-3xl font-bold text-gray-800">企业微信管理</h1>
            </div>
            <p className="text-gray-600">管理企业微信客户和消息推送</p>
          </div>
          
          {isMockMode && (
            <Badge variant="outline" className="border-orange-500 text-orange-600 px-4 py-2">
              <AlertCircle className="w-4 h-4 mr-2" />
              模拟模式
            </Badge>
          )}
        </div>
        
        {/* 状态卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">二维码数量</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {contactWays.data?.length || 0}
                  </p>
                </div>
                <QrCode className="w-10 h-10 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">客户总数</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {customers.data?.length || 0}
                  </p>
                </div>
                <Users className="w-10 h-10 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">今日新增</p>
                  <p className="text-2xl font-bold text-gray-800">0</p>
                </div>
                <MessageSquare className="w-10 h-10 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* 主要内容 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="config">配置</TabsTrigger>
            <TabsTrigger value="qrcode">二维码管理</TabsTrigger>
            <TabsTrigger value="customers">客户列表</TabsTrigger>
            <TabsTrigger value="messages">消息推送</TabsTrigger>
          </TabsList>
          
          {/* 配置页面 */}
          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>企业微信配置</CardTitle>
                <CardDescription>
                  配置企业微信应用凭证，连接您的企业微信
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-base">模拟模式</Label>
                    <p className="text-sm text-gray-500">
                      开启后将使用模拟数据，无需真实凭证即可测试功能
                    </p>
                  </div>
                  <Switch
                    checked={formData.isMockMode}
                    onCheckedChange={(checked) => setFormData({ ...formData, isMockMode: checked })}
                  />
                </div>

                {isMockMode ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-6 h-6 text-green-600 mt-1" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-green-900 mb-2">
                          模拟模式已启用
                        </h3>
                        <p className="text-sm text-green-800 mb-4">
                          在企业微信认证期间，您可以使用模拟模式测试所有功能。模拟模式会生成虚拟的二维码、客户和消息，帮助您提前熟悉系统操作。
                        </p>
                        <div className="space-y-2 text-sm text-green-800">
                          <p>✓ 可以创建"联系我"二维码</p>
                          <p>✓ 可以模拟客户添加事件</p>
                          <p>✓ 可以测试消息推送功能</p>
                          <p>✓ 所有数据保存在数据库中</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 border p-4 rounded-lg">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="corpId">企业ID (CorpID)</Label>
                        <Input
                          id="corpId"
                          value={formData.corpId}
                          onChange={(e) => setFormData({ ...formData, corpId: e.target.value })}
                          placeholder="ww..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="agentId">应用ID (AgentId)</Label>
                        <Input
                          id="agentId"
                          value={formData.agentId}
                          onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
                          placeholder="1000001"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="corpSecret">应用密钥 (Secret)</Label>
                      <Input
                        id="corpSecret"
                        type="password"
                        value={formData.corpSecret}
                        onChange={(e) => setFormData({ ...formData, corpSecret: e.target.value })}
                        placeholder="应用 Secret"
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="token">回调 Token</Label>
                        <Input
                          id="token"
                          value={formData.token}
                          onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                          placeholder="接收消息服务器配置 Token"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="encodingAesKey">回调 EncodingAESKey</Label>
                        <Input
                          id="encodingAesKey"
                          value={formData.encodingAesKey}
                          onChange={(e) => setFormData({ ...formData, encodingAesKey: e.target.value })}
                          placeholder="接收消息服务器配置 EncodingAESKey"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleTestConnection}
                        disabled={testConnection.isPending}
                      >
                        {testConnection.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            测试中...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            测试连接
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t">
                  <Button 
                    onClick={handleSaveConfig}
                    disabled={saveConfig.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {saveConfig.isPending ? (
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
          </TabsContent>
          
          {/* 二维码管理 */}
          <TabsContent value="qrcode" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>"联系我"二维码</CardTitle>
                    <CardDescription>
                      创建和管理企业微信"联系我"二维码
                    </CardDescription>
                  </div>
                  <Button
                    onClick={handleCreateContactWay}
                    disabled={createContactWay.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {createContactWay.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        创建中...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        创建二维码
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {contactWays.isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                  </div>
                ) : contactWays.data && contactWays.data.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {contactWays.data.map((way) => (
                      <Card key={way.id} className="border-green-100">
                        <CardContent className="pt-6">
                          <div className="flex flex-col items-center gap-4">
                            {way.qrCode && (
                              <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                                <img
                                  src={way.qrCode}
                                  alt="二维码"
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            )}
                            <div className="text-center w-full">
                              <p className="font-medium text-gray-800">
                                {way.remark || "未命名"}
                              </p>
                              <p className="text-sm text-gray-500 mt-1">
                                来源：{way.state || "未设置"}
                              </p>
                              <Badge
                                variant="outline"
                                className="mt-2 border-green-500 text-green-600"
                              >
                                {way.skipVerify ? "自动添加" : "需要验证"}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <QrCode className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">暂无二维码</p>
                    <Button
                      onClick={handleCreateContactWay}
                      variant="outline"
                      className="border-green-600 text-green-600 hover:bg-green-50"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      创建第一个二维码
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* 客户列表 */}
          <TabsContent value="customers" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>客户列表</CardTitle>
                    <CardDescription>
                      通过企业微信添加的客户
                    </CardDescription>
                  </div>
                  {isMockMode && (
                    <Button
                      onClick={handleMockAddCustomer}
                      disabled={mockAddCustomer.isPending}
                      variant="outline"
                      className="border-orange-500 text-orange-600 hover:bg-orange-50"
                    >
                      {mockAddCustomer.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          添加中...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          模拟添加客户
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {customers.isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                  </div>
                ) : customers.data && customers.data.length > 0 ? (
                  <div className="space-y-3">
                    {customers.data.map((customer) => (
                      <Card key={customer.id} className="border-blue-100">
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-4">
                            <img
                              src={customer.avatar || "https://via.placeholder.com/48"}
                              alt={customer.name || "客户"}
                              className="w-12 h-12 rounded-full"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-800">
                                  {customer.name || "未命名"}
                                </p>
                                <Badge variant="outline">
                                  {customer.gender === "1"
                                    ? "男"
                                    : customer.gender === "2"
                                    ? "女"
                                    : "未知"}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-500 mt-1">
                                来源：{customer.state || "未知"} | 添加时间：
                                {customer.createdAt
                                  ? new Date(customer.createdAt).toLocaleDateString()
                                  : "未知"}
                              </p>
                              {customer.remark && (
                                <p className="text-sm text-gray-600 mt-1">
                                  备注：{customer.remark}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">暂无客户</p>
                    {isMockMode && (
                      <Button
                        onClick={handleMockAddCustomer}
                        variant="outline"
                        className="border-orange-500 text-orange-600 hover:bg-orange-50"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        模拟添加第一个客户
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* 消息推送 */}
          <TabsContent value="messages" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>消息推送</CardTitle>
                <CardDescription>
                  向企业微信客户发送消息
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">消息推送功能开发中...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
