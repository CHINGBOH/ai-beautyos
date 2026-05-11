import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { BarChart3, Users, TrendingUp, Loader2, FileText } from "lucide-react";
import { Streamdown } from "streamdown";
import { Link } from "wouter";

export default function Analytics() {
  const [leadsReport, setLeadsReport] = useState<string>("");
  const [marketingSuggestions, setMarketingSuggestions] = useState<string>("");
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [customerProfile, setCustomerProfile] = useState<string>("");

  const generateLeadsReport = trpc.analytics.generateLeadsReport.useMutation();
  const generateMarketingSuggestions = trpc.analytics.generateMarketingSuggestions.useMutation();
  const generateCustomerProfile = trpc.analytics.generateCustomerProfile.useMutation();
  const overview = trpc.analytics.getOverview.useQuery();

  const handleGenerateLeadsReport = async () => {
    try {
      const result = await generateLeadsReport.mutateAsync();
      if (result.success) {
        setLeadsReport(result.report || "");
        toast.success("报告生成成功！");
      } else {
        toast.error(result.error || "生成失败");
      }
    } catch (error) {
      toast.error("生成报告失败");
      console.error(error);
    }
  };

  const handleGenerateMarketingSuggestions = async () => {
    try {
      const result = await generateMarketingSuggestions.mutateAsync();
      if (result.success) {
        setMarketingSuggestions(result.suggestions || "");
        toast.success("营销建议生成成功！");
      } else {
        toast.error(result.error || "生成失败");
      }
    } catch (error) {
      toast.error("生成营销建议失败");
      console.error(error);
    }
  };

  const handleGenerateCustomerProfile = async (leadId: number) => {
    setSelectedLeadId(leadId);
    try {
      const result = await generateCustomerProfile.mutateAsync({ leadId });
      if (result.success) {
        setCustomerProfile(result.profile || "");
        toast.success("客户画像生成成功！");
      } else {
        toast.error(result.error || "生成失败");
      }
    } catch (error) {
      toast.error("生成客户画像失败");
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      {/* 导航栏 */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-amber-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/yanmei-logo.jpg" alt="深圳妍美" className="h-10" />
            <span className="text-xl font-semibold text-gray-800">深圳妍美医疗美容门诊部</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost">首页</Button>
            </Link>
            <Link href="/chat">
              <Button variant="ghost">在线咨询</Button>
            </Link>
            <Link href="/admin">
              <Button variant="ghost">系统管理</Button>
            </Link>
            <Link href="/analytics">
              <Button variant="default" className="bg-gradient-to-r from-amber-600 to-orange-600">
                数据分析
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* 标题 */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center gap-3">
              <BarChart3 className="text-amber-600" />
              智能数据分析
            </h1>
            <p className="text-gray-600">基于 AI 的数据分析和营销建议</p>
          </div>

          {/* 数据概览 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="text-amber-600" />
                  总线索数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-amber-600">
                  {overview.data?.totalLeads || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="text-orange-600" />
                  总对话数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-orange-600">
                  {overview.data?.totalConversations || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="text-amber-700" />
                  热门项目
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600">
                  {overview.data?.projectDistribution &&
                    Object.entries(overview.data.projectDistribution)
                      .sort(([, a]: any, [, b]: any) => b - a)
                      .slice(0, 3)
                      .map(([proj, count]: any) => (
                        <div key={proj} className="flex justify-between py-1">
                          <span>{proj}</span>
                          <span className="font-semibold">{count}</span>
                        </div>
                      ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 分析功能 */}
          <Tabs defaultValue="leads" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="leads">线索分析报告</TabsTrigger>
              <TabsTrigger value="marketing">营销建议</TabsTrigger>
              <TabsTrigger value="profile">客户画像</TabsTrigger>
            </TabsList>

            {/* 线索分析报告 */}
            <TabsContent value="leads">
              <Card>
                <CardHeader>
                  <CardTitle>线索数据分析报告</CardTitle>
                  <CardDescription>
                    AI 分析所有线索数据，生成转化率报告和优化建议
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    onClick={handleGenerateLeadsReport}
                    disabled={generateLeadsReport.isPending}
                    className="w-full"
                  >
                    {generateLeadsReport.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        生成中...
                      </>
                    ) : (
                      "生成分析报告"
                    )}
                  </Button>

                  {leadsReport && (
                    <div className="prose prose-sm max-w-none bg-gray-50 p-6 rounded-lg">
                      <Streamdown>{leadsReport}</Streamdown>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 营销建议 */}
            <TabsContent value="marketing">
              <Card>
                <CardHeader>
                  <CardTitle>智能营销建议</CardTitle>
                  <CardDescription>
                    基于数据分析，生成针对性的营销策略和优化方向
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    onClick={handleGenerateMarketingSuggestions}
                    disabled={generateMarketingSuggestions.isPending}
                    className="w-full"
                  >
                    {generateMarketingSuggestions.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        生成中...
                      </>
                    ) : (
                      "生成营销建议"
                    )}
                  </Button>

                  {marketingSuggestions && (
                    <div className="prose prose-sm max-w-none bg-gray-50 p-6 rounded-lg">
                      <Streamdown>{marketingSuggestions}</Streamdown>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 客户画像 */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>客户画像生成</CardTitle>
                  <CardDescription>
                    选择一个线索，AI 将基于对话历史生成详细的客户画像
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 线索列表 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">选择线索：</label>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {overview.data?.recentLeads?.map((lead: any) => (
                        <Button
                          key={lead.id}
                          variant={selectedLeadId === lead.id ? "default" : "outline"}
                          className="w-full justify-start"
                          onClick={() => handleGenerateCustomerProfile(lead.id)}
                          disabled={generateCustomerProfile.isPending}
                        >
                          <div className="flex flex-col items-start">
                            <span className="font-semibold">{lead.name}</span>
                            <span className="text-xs text-gray-500">
                              {lead.phone} · {lead.source || "直接访问"}
                            </span>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>

                  {generateCustomerProfile.isPending && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
                    </div>
                  )}

                  {customerProfile && (
                    <div className="prose prose-sm max-w-none bg-gray-50 p-6 rounded-lg">
                      <Streamdown>{customerProfile}</Streamdown>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
