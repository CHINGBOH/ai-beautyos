import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, Search, Filter, Eye, TrendingUp, TrendingDown, Minus } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";

type FilterType = "all" | "A" | "B" | "C" | "D";
type PsychologyFilter = "all" | "恐惧型" | "贪婪型" | "安全型" | "敏感型";

export default function DashboardCustomers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<FilterType>("all");
  const [psychologyFilter, setPsychologyFilter] = useState<PsychologyFilter>("all");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  // 获取客户列表
  const { data: customers, isLoading } = trpc.customers.list.useQuery();

  // 过滤客户
  const filteredCustomers = customers?.filter((customer) => {
    const matchesSearch =
      customer.name.includes(searchQuery) ||
      customer.phone.includes(searchQuery) ||
      (customer.wechat && customer.wechat.includes(searchQuery));
    const matchesTier = tierFilter === "all" || customer.customerTier === tierFilter;
    const matchesPsychology =
      psychologyFilter === "all" || customer.psychologyType === psychologyFilter;
    return matchesSearch && matchesTier && matchesPsychology;
  });

  // 统计数据
  const stats = {
    total: customers?.length || 0,
    tierA: customers?.filter((c: any) => c.customerTier === "A").length || 0,
    tierB: customers?.filter((c: any) => c.customerTier === "B").length || 0,
    tierC: customers?.filter((c: any) => c.customerTier === "C").length || 0,
    tierD: customers?.filter((c: any) => c.customerTier === "D").length || 0,
  };

  // 客户分层标签样式
  const getTierBadge = (tier: string | null) => {
    switch (tier) {
      case "A":
        return <Badge className="bg-purple-500">A级-高价值</Badge>;
      case "B":
        return <Badge className="bg-blue-500">B级-中价值</Badge>;
      case "C":
        return <Badge className="bg-gray-500">C级-低价值</Badge>;
      case "D":
        return <Badge variant="destructive">D级-无效</Badge>;
      default:
        return <Badge variant="outline">未分层</Badge>;
    }
  };

  // 心理类型标签样式
  const getPsychologyBadge = (type: string | null) => {
    switch (type) {
      case "恐惧型":
        return <Badge variant="outline" className="border-red-500 text-red-500">😰 恐惧型</Badge>;
      case "贪婪型":
        return <Badge variant="outline" className="border-green-500 text-green-500">💰 贪婪型</Badge>;
      case "安全型":
        return <Badge variant="outline" className="border-blue-500 text-blue-500">🛡️ 安全型</Badge>;
      case "敏感型":
        return <Badge variant="outline" className="border-purple-500 text-purple-500">💭 敏感型</Badge>;
      default:
        return null;
    }
  };

  // 消费能力标签
  const getBudgetBadge = (level: string | null) => {
    switch (level) {
      case "高":
        return <Badge variant="outline">💎 高消费</Badge>;
      case "中":
        return <Badge variant="outline">💵 中消费</Badge>;
      case "低":
        return <Badge variant="outline">💸 低消费</Badge>;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">客户管理</h1>
            <p className="text-muted-foreground mt-2">
              全面了解客户需求，智能分层管理，提升转化效率
            </p>
          </div>
        </div>

        {/* 客户统计 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>总客户数</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>A级客户</CardDescription>
              <CardTitle className="text-3xl text-purple-500">{stats.tierA}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>B级客户</CardDescription>
              <CardTitle className="text-3xl text-blue-500">{stats.tierB}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>C级客户</CardDescription>
              <CardTitle className="text-3xl text-gray-500">{stats.tierC}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>D级客户</CardDescription>
              <CardTitle className="text-3xl text-destructive">{stats.tierD}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* 筛选和搜索 */}
        <Card>
          <CardHeader>
            <CardTitle>筛选和搜索</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 搜索 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="搜索姓名、手机、微信..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* 客户分层筛选 */}
              <Select value={tierFilter} onValueChange={(v) => setTierFilter(v as FilterType)}>
                <SelectTrigger>
                  <SelectValue placeholder="客户等级（A/B/C/D级）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部分层</SelectItem>
                  <SelectItem value="A">A级-高价值</SelectItem>
                  <SelectItem value="B">B级-中价值</SelectItem>
                  <SelectItem value="C">C级-低价值</SelectItem>
                  <SelectItem value="D">D级-无效</SelectItem>
                </SelectContent>
              </Select>

              {/* 心理类型筛选 */}
              <Select value={psychologyFilter} onValueChange={(v) => setPsychologyFilter(v as PsychologyFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="客户心理画像" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="恐惧型">恐惧型</SelectItem>
                  <SelectItem value="贪婪型">贪婪型</SelectItem>
                  <SelectItem value="安全型">安全型</SelectItem>
                  <SelectItem value="敏感型">敏感型</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 客户列表 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              客户列表
              <span className="text-sm font-normal text-muted-foreground">
                （共 {filteredCustomers?.length || 0} 位客户）
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">加载中...</div>
            ) : filteredCustomers && filteredCustomers.length > 0 ? (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>姓名</TableHead>
                      <TableHead>联系方式</TableHead>
                      <TableHead>年龄</TableHead>
                      <TableHead>来源</TableHead>
                      <TableHead>客户等级</TableHead>
                      <TableHead>心理画像</TableHead>
                      <TableHead>预算水平</TableHead>
                      <TableHead>预算</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer: any) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{customer.phone}</div>
                            {customer.wechat && (
                              <div className="text-muted-foreground">{customer.wechat}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{customer.age || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{customer.source}</Badge>
                        </TableCell>
                        <TableCell>{getTierBadge(customer.customerTier)}</TableCell>
                        <TableCell>{getPsychologyBadge(customer.psychologyType)}</TableCell>
                        <TableCell>{getBudgetBadge(customer.budgetLevel)}</TableCell>
                        <TableCell>{customer.budget || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{customer.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedCustomer(customer)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">暂无客户数据，开始收集线索吧</p>
                <p className="text-sm">请先导入客户数据或等待客户咨询</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 客户详情弹窗 */}
        <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>客户详情</DialogTitle>
              <DialogDescription>查看客户的完整信息和画像分析</DialogDescription>
            </DialogHeader>
            {selectedCustomer && (
              <div className="space-y-4">
                {/* 基本信息 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">姓名</div>
                    <div className="text-lg font-semibold">{selectedCustomer.name}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">年龄</div>
                    <div className="text-lg">{selectedCustomer.age || "-"}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">手机号</div>
                    <div className="text-lg">{selectedCustomer.phone}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">微信号</div>
                    <div className="text-lg">{selectedCustomer.wechat || "-"}</div>
                  </div>
                </div>

                {/* 客户画像 */}
                <div className="border-t pt-4">
                  <div className="text-sm font-medium mb-3">客户画像</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">客户等级</div>
                      {getTierBadge(selectedCustomer.customerTier)}
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">心理画像</div>
                      {getPsychologyBadge(selectedCustomer.psychologyType)}
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">预算水平</div>
                      {getBudgetBadge(selectedCustomer.budgetLevel)}
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">预算范围</div>
                      <div>{selectedCustomer.budget || "-"}</div>
                    </div>
                  </div>
                </div>

                {/* 心理标签 */}
                {selectedCustomer.psychologyTags && (
                  <div className="border-t pt-4">
                    <div className="text-sm font-medium mb-3">心理标签</div>
                    <div className="flex flex-wrap gap-2">
                      {JSON.parse(selectedCustomer.psychologyTags).map((tag: string, index: number) => (
                        <Badge key={index} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* 兴趣项目 */}
                {selectedCustomer.interestedServices && (
                  <div className="border-t pt-4">
                    <div className="text-sm font-medium mb-3">兴趣项目</div>
                    <div className="flex flex-wrap gap-2">
                      {JSON.parse(selectedCustomer.interestedServices).map((service: string, index: number) => (
                        <Badge key={index} variant="outline">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* 备注 */}
                {selectedCustomer.notes && (
                  <div className="border-t pt-4">
                    <div className="text-sm font-medium mb-2">备注</div>
                    <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                      {selectedCustomer.notes}
                    </div>
                  </div>
                )}

                {/* 其他信息 */}
                <div className="border-t pt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">来源渠道：</span>
                    <Badge variant="outline" className="ml-2">{selectedCustomer.source}</Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">当前状态：</span>
                    <Badge variant="secondary" className="ml-2">{selectedCustomer.status}</Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">创建时间：</span>
                    <span className="ml-2">{new Date(selectedCustomer.createdAt).toLocaleDateString()}</span>
                  </div>
                  {selectedCustomer.followUpDate && (
                    <div>
                      <span className="text-muted-foreground">下次跟进：</span>
                      <span className="ml-2">{new Date(selectedCustomer.followUpDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
