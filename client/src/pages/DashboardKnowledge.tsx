import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Loader2, Plus, Edit, Trash2, BookOpen, Lock, Search, ChevronLeft, ChevronRight } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";

const PAGE_SIZE = 50;
type KnowledgeType = "customer" | "internal";

export default function DashboardKnowledge() {
  const [activeTab, setActiveTab] = useState<KnowledgeType>("customer");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "",
    tags: "",
    isActive: 1,
  });

  const utils = trpc.useUtils();
  const customerQuery = trpc.knowledge.getAll.useQuery({
    type: "customer",
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    searchTerm: searchTerm.trim() || undefined,
  });
  const internalQuery = trpc.knowledge.getAll.useQuery({
    type: "internal",
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    searchTerm: searchTerm.trim() || undefined,
  });
  const getByIdQuery = trpc.knowledge.getById.useQuery(
    { id: editingId! },
    { enabled: !!editingId }
  );
  const createMutation = trpc.knowledge.create.useMutation({
    onSuccess: () => {
      toast.success("知识库创建成功");
      utils.knowledge.getAll.invalidate();
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`创建失败：${error.message}`);
    },
  });
  const updateMutation = trpc.knowledge.update.useMutation({
    onSuccess: () => {
      toast.success("知识库更新成功");
      utils.knowledge.getAll.invalidate();
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`更新失败：${error.message}`);
    },
  });
  const deleteMutation = trpc.knowledge.delete.useMutation({
    onSuccess: () => {
      toast.success("知识库删除成功");
      utils.knowledge.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(`删除失败：${error.message}`);
    },
  });

  const currentQuery = activeTab === "customer" ? customerQuery : internalQuery;
  const currentData = currentQuery.data;
  const rawItems = currentData?.items ?? [];
  // 不在列表中展示占位用「种子知识-xxx」，避免界面杂乱
  const items = rawItems.filter((item) => !item.title?.startsWith("种子知识"));
  const total = currentData?.total ?? 0;

  useEffect(() => {
    setPage(0);
  }, [searchTerm, activeTab]);

  useEffect(() => {
    if (!editingId || !getByIdQuery.data) return;
    const d = getByIdQuery.data;
    const tagsStr =
      typeof d.tags === "string"
        ? (() => {
            try {
              const arr = JSON.parse(d.tags);
              return Array.isArray(arr) ? arr.join(", ") : "";
            } catch {
              return "";
            }
          })()
        : "";
    setFormData({
      title: d.title ?? "",
      content: d.content ?? "",
      category: d.category ?? "",
      tags: tagsStr,
      isActive: d.isActive ?? 1,
    });
  }, [editingId, getByIdQuery.data]);

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      category: "",
      tags: "",
      isActive: 1,
    });
    setEditingId(null);
  };

  const handleCreate = () => {
    setDialogOpen(true);
    resetForm();
  };

  const handleEdit = (item: { id: number }) => {
    setEditingId(item.id);
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("确定要删除这条知识库吗？")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleSubmit = () => {
    const tags = formData.tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t);

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        title: formData.title,
        content: formData.content,
        category: formData.category,
        tags,
        isActive: formData.isActive,
      });
    } else {
      createMutation.mutate({
        type: activeTab,
        title: formData.title,
        content: formData.content,
        category: formData.category,
        tags,
        isActive: formData.isActive,
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">知识库管理</h1>
            <p className="text-muted-foreground mt-2">
              维护AI客服知识库，提升回答准确性和专业性
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            新建知识库
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as KnowledgeType)}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="customer" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              客户咨询知识库
            </TabsTrigger>
            <TabsTrigger value="internal" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              内部管理知识库
            </TabsTrigger>
          </TabsList>

          <div className="mt-6 space-y-4">
            {/* 搜索栏 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索知识库..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <TabsContent value="customer" className="space-y-4 mt-0">
              {customerQuery.isError && (
                <div className="rounded-md bg-amber-50 text-amber-800 border border-amber-200 px-4 py-3 text-sm flex items-center justify-between gap-3">
                  <span>客户咨询知识库暂时不可用</span>
                  <Button variant="outline" size="sm" onClick={() => customerQuery.refetch()}>
                    重新加载
                  </Button>
                </div>
              )}
              {customerQuery.isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : items.length > 0 ? (
                <>
                  {rawItems.length > items.length && (
                    <p className="text-sm text-muted-foreground">已隐藏 {rawItems.length - items.length} 条占位条目（标题以「种子知识」开头）</p>
                  )}
                  {items.map((item) => (
                    <Card key={item.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{item.title}</CardTitle>
                            <CardDescription className="mt-2">
                              <Badge variant="secondary" className="mr-2">
                                {item.category}
                              </Badge>
                              {item.tags && (() => {
                                try {
                                  const arr = JSON.parse(item.tags);
                                  return Array.isArray(arr)
                                    ? arr.map((tag: string, idx: number) => (
                                        <Badge key={idx} variant="outline" className="mr-1">
                                          {tag}
                                        </Badge>
                                      ))
                                    : null;
                                } catch {
                                  return null;
                                }
                              })()}
                            </CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(item)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {item.summary ?? "—"}
                        </p>
                        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                          <span>使用次数: {item.usedCount}</span>
                          <span>查看次数: {item.viewCount}</span>
                          <span>
                            状态: {item.isActive === 1 ? "启用" : "禁用"}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {total > PAGE_SIZE && (
                    <div className="flex items-center justify-between pt-4">
                      <span className="text-sm text-muted-foreground">共 {total} 条</span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page === 0}
                          onClick={() => setPage((p) => Math.max(0, p - 1))}
                        >
                          <ChevronLeft className="w-4 h-4" /> 上一页
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={(page + 1) * PAGE_SIZE >= total}
                          onClick={() => setPage((p) => p + 1)}
                        >
                          下一页 <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    {searchTerm ? "未找到匹配的知识库" : "暂无客户咨询知识库，开始添加知识库内容吧"}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="internal" className="space-y-4 mt-0">
              {internalQuery.isError && (
                <div className="rounded-md bg-amber-50 text-amber-800 border border-amber-200 px-4 py-3 text-sm flex items-center justify-between gap-3">
                  <span>内部管理知识库暂时不可用</span>
                  <Button variant="outline" size="sm" onClick={() => internalQuery.refetch()}>
                    重新加载
                  </Button>
                </div>
              )}
              {internalQuery.isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : items.length > 0 ? (
                <>
                  {rawItems.length > items.length && (
                    <p className="text-sm text-muted-foreground">已隐藏 {rawItems.length - items.length} 条占位条目（标题以「种子知识」开头）</p>
                  )}
                  {items.map((item) => (
                    <Card key={item.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{item.title}</CardTitle>
                            <CardDescription className="mt-2">
                              <Badge variant="secondary" className="mr-2">
                                {item.category}
                              </Badge>
                              {item.tags && (() => {
                                try {
                                  const arr = JSON.parse(item.tags);
                                  return Array.isArray(arr)
                                    ? arr.map((tag: string, idx: number) => (
                                        <Badge key={idx} variant="outline" className="mr-1">
                                          {tag}
                                        </Badge>
                                      ))
                                    : null;
                                } catch {
                                  return null;
                                }
                              })()}
                            </CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(item)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {item.summary ?? "—"}
                        </p>
                        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                          <span>使用次数: {item.usedCount}</span>
                          <span>查看次数: {item.viewCount}</span>
                          <span>
                            状态: {item.isActive === 1 ? "启用" : "禁用"}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {total > PAGE_SIZE && (
                    <div className="flex items-center justify-between pt-4">
                      <span className="text-sm text-muted-foreground">共 {total} 条</span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page === 0}
                          onClick={() => setPage((p) => Math.max(0, p - 1))}
                        >
                          <ChevronLeft className="w-4 h-4" /> 上一页
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={(page + 1) * PAGE_SIZE >= total}
                          onClick={() => setPage((p) => p + 1)}
                        >
                          下一页 <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    {searchTerm ? "未找到匹配的知识库" : "暂无内部管理知识库"}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </div>
        </Tabs>

        {/* 创建/编辑对话框 */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "编辑知识库" : "新建知识库"}</DialogTitle>
              <DialogDescription>
                {activeTab === "customer"
                  ? "客户咨询知识库用于 AI 客服回答客户问题"
                  : "内部管理知识库用于销售人员参考，不对外展示"}
              </DialogDescription>
            </DialogHeader>
            {editingId && getByIdQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : editingId && getByIdQuery.isError ? (
              <div className="rounded-md bg-amber-50 text-amber-800 border border-amber-200 px-4 py-3 text-sm flex items-center justify-between gap-3">
                <span>知识详情暂时不可用</span>
                <Button variant="outline" size="sm" onClick={() => getByIdQuery.refetch()}>
                  重新加载
                </Button>
              </div>
            ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">标题</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="例如：超皮秒祛斑项目介绍"
                />
              </div>
              <div>
                <label className="text-sm font-medium">分类</label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择分类" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeTab === "customer" ? (
                      <>
                        <SelectItem value="项目介绍">项目介绍</SelectItem>
                        <SelectItem value="FAQ">FAQ</SelectItem>
                        <SelectItem value="注意事项">注意事项</SelectItem>
                        <SelectItem value="价格政策">价格政策</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="销售话术">销售话术</SelectItem>
                        <SelectItem value="心理分析">心理分析</SelectItem>
                        <SelectItem value="异议处理">异议处理</SelectItem>
                        <SelectItem value="成交技巧">成交技巧</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">内容</label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="输入知识库内容..."
                  rows={10}
                />
              </div>
              <div>
                <label className="text-sm font-medium">标签（用逗号分隔）</label>
                <Input
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="例如：超皮秒, 祛斑, 激光"
                />
              </div>
              <div>
                <label className="text-sm font-medium">状态</label>
                <Select
                  value={formData.isActive.toString()}
                  onValueChange={(value) =>
                    setFormData({ ...formData, isActive: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">启用</SelectItem>
                    <SelectItem value="0">禁用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  !formData.title ||
                  !formData.content ||
                  !formData.category ||
                  createMutation.isPending ||
                  updateMutation.isPending ||
                  (!!editingId && getByIdQuery.isLoading)
                }
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  "保存"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
