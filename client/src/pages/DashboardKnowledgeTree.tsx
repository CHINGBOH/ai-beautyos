import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Search,
  Home,
  AlertCircle,
  Globe,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import {
  KNOWLEDGE_MODULES,
  MODULE_NAMES,
  MODULE_DESCRIPTIONS,
} from "@shared/types";
import { KnowledgeComparison } from "@/components/KnowledgeComparison";

interface KnowledgeNode {
  id: number;
  title: string;
  summary?: string | null;
  level: number;
  parentId?: number | null;
  module: string;
  category?: string | null;
  children?: KnowledgeNode[];
  viewCount: number;
  usedCount: number;
  isActive: number;
}

export default function DashboardKnowledgeTree() {
  const [selectedModule, setSelectedModule] = useState<string>(
    KNOWLEDGE_MODULES.HEALTH_FOUNDATION
  );
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [searchKeyword, setSearchKeyword] = useState("");

  // 获取知识库树
  const {
    data: knowledgeTree,
    isLoading,
    isError: treeError,
    refetch: refetchTree,
  } = trpc.knowledge.getTreeByModule.useQuery({
    module: selectedModule,
  });

  // 搜索知识库
  const { data: searchResults } = trpc.knowledge.search.useQuery(
    {
      keyword: searchKeyword,
      module: selectedModule,
      limit: 20,
    },
    {
      enabled: searchKeyword.length > 0,
    }
  );

  // 获取模块列表
  const { data: modulesData } = trpc.knowledge.getModules.useQuery();

  const toggleNode = (nodeId: number) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const renderTreeNode = (
    node: KnowledgeNode,
    depth: number = 0
  ): React.ReactElement => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const indent = depth * 24;

    return (
      <div key={node.id} className="select-none">
        <div
          className={`flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/60 cursor-pointer transition-colors ${
            selectedNodeId === node.id
              ? "bg-primary/10 border border-primary/20"
              : ""
          }`}
          style={{ paddingLeft: `${12 + indent}px` }}
          onClick={() => {
            if (hasChildren) {
              toggleNode(node.id);
            }
            setSelectedNodeId(node.id);
          }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )
          ) : (
            <div className="w-4 h-4" />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{node.title}</span>
              {node.level === 1 && (
                <Badge variant="outline" className="text-xs">
                  {MODULE_NAMES[node.module as keyof typeof MODULE_NAMES] ||
                    node.module}
                </Badge>
              )}
              {node.level > 1 && (
                <Badge variant="secondary" className="text-xs">
                  L{node.level}
                </Badge>
              )}
            </div>
            {node.summary && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                {node.summary}
              </p>
            )}
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
              <span>查看: {node.viewCount}</span>
              <span>使用: {node.usedCount}</span>
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="ml-4">
            {node.children!.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* 标题行：标题 + 副标题 + 搜索 */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">知识库管理</h1>
            <p className="text-sm text-muted-foreground mt-1">
              6 层嵌套 · 15 个模块
            </p>
          </div>
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索知识库..."
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* 模块选择：下拉 + 当前模块说明 */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              知识模块
            </span>
          </div>
          <Select
            value={selectedModule}
            onValueChange={key => {
              setSelectedModule(key);
              setSelectedNodeId(null);
              setExpandedNodes(new Set());
            }}
          >
            <SelectTrigger className="w-full max-w-md h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {modulesData?.modules.map(module => (
                <SelectItem key={module.key} value={module.key}>
                  <span className="font-medium">{module.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground max-w-md">
            {
              MODULE_DESCRIPTIONS[
                selectedModule as keyof typeof MODULE_DESCRIPTIONS
              ]
            }
          </p>
        </div>

        {/* 知识库树 + 详情 (Tabs: 浏览 / 爬虫导入) */}
        <Tabs defaultValue="browse">
          <TabsList className="mb-3">
            <TabsTrigger value="browse">
              <BookOpen className="w-4 h-4 mr-1.5" />
              浏览知识树
            </TabsTrigger>
            <TabsTrigger value="crawl">
              <Globe className="w-4 h-4 mr-1.5" />
              爬虫导入
            </TabsTrigger>
          </TabsList>

          <TabsContent value="crawl">
            <CrawlerImport module={selectedModule} onImported={() => refetchTree()} />
          </TabsContent>

          <TabsContent value="browse">
        {/* 知识库树 + 详情 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 左侧：知识树 */}
          <Card className="lg:col-span-1">
            <CardHeader className="py-4">
              <CardTitle className="text-base">
                {MODULE_NAMES[selectedModule as keyof typeof MODULE_NAMES]} ·
                知识树
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : treeError ? (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-80 text-amber-600" />
                  <p className="text-sm mb-3">知识树暂时不可用</p>
                  <Button variant="outline" size="sm" onClick={() => refetchTree()}>
                    重新加载
                  </Button>
                </div>
              ) : searchKeyword && searchResults ? (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground mb-2">
                    共 {searchResults.length} 条
                  </div>
                  <div className="space-y-1 max-h-[520px] overflow-y-auto">
                    {searchResults.map(item => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-md border hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => setSelectedNodeId(item.id)}
                      >
                        <div className="font-medium text-sm">{item.title}</div>
                        {item.summary && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {item.summary}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : knowledgeTree && knowledgeTree.length > 0 ? (
                <div className="space-y-0.5 max-h-[520px] overflow-y-auto">
                  {knowledgeTree.map(node => renderTreeNode(node))}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p>该模块暂无内容</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 右侧：知识详情 */}
          <Card className="lg:col-span-2">
            <CardHeader className="py-4">
              <CardTitle className="text-base">知识详情</CardTitle>
              {!selectedNodeId && (
                <CardDescription className="text-xs">
                  从左侧选择节点查看
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              {selectedNodeId ? (
                <KnowledgeDetail nodeId={selectedNodeId} />
              ) : (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  <Home className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p>在左侧选择节点查看详情</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// 爬虫导入组件
function CrawlerImport({ module, onImported }: { module: string; onImported: () => void }) {
  const [url, setUrl] = useState("");
  const [crawlResult, setCrawlResult] = useState<{ title?: string; content?: string; text?: string } | null>(null);

  const crawlMutation = trpc.crawler.crawlHtml.useMutation({
    onSuccess(data) {
      setCrawlResult(data.data as { title?: string; content?: string; text?: string });
      toast.success("页面爬取成功");
    },
    onError(e) {
      toast.error(`爬取失败: ${e.message}`);
    },
  });

  const importMutation = trpc.knowledge.create.useMutation({
    onSuccess() {
      toast.success("已导入知识库");
      setCrawlResult(null);
      setUrl("");
      onImported();
    },
    onError(e) {
      toast.error(`导入失败: ${e.message}`);
    },
  });

  const title = crawlResult?.title || "";
  const content = crawlResult?.text || crawlResult?.content || "";

  return (
    <div className="space-y-4 max-w-2xl">
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4" />
            从 URL 爬取内容
          </CardTitle>
          <CardDescription>
            输入公开页面地址，自动提取标题和正文，导入到当前模块知识库
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="https://example.com/article"
              value={url}
              onChange={e => setUrl(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={() => crawlMutation.mutate({ url, extractImages: false })}
              disabled={!url || crawlMutation.isPending}
            >
              {crawlMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "爬取"}
            </Button>
          </div>

          {crawlResult && (
            <div className="space-y-3 pt-2 border-t">
              <div>
                <p className="text-xs text-muted-foreground mb-1">标题</p>
                <p className="text-sm font-medium">{title || "（未识别到标题）"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">内容预览</p>
                <div className="rounded border bg-muted/30 p-3 text-xs max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {content ? content.slice(0, 2000) : "（未提取到内容）"}
                </div>
              </div>
              <Button
                className="w-full"
                disabled={!title || !content || importMutation.isPending}
                onClick={() =>
                  importMutation.mutate({
                    title: title || url,
                    content,
                    module,
                    sources: JSON.stringify([url]),
                    credibility: 5,
                  })
                }
              >
                {importMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                导入到「{module}」知识库
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// 知识详情组件
function KnowledgeDetail({ nodeId }: { nodeId: number }) {
  const { data: knowledge, isLoading } = trpc.knowledge.getById.useQuery({
    id: nodeId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!knowledge) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        知识内容未找到
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 标题和基本信息 */}
      <div>
        <h2 className="text-xl font-bold mb-1.5">{knowledge.title}</h2>
        {knowledge.summary && (
          <p className="text-muted-foreground text-sm mb-3">
            {knowledge.summary}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-xs">
            L{knowledge.level}
          </Badge>
          {knowledge.module && (
            <Badge variant="secondary" className="text-xs">
              {MODULE_NAMES[knowledge.module as keyof typeof MODULE_NAMES] ||
                knowledge.module}
            </Badge>
          )}
          {knowledge.difficulty && (
            <Badge variant="outline" className="text-xs">
              {knowledge.difficulty}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            可信度 {knowledge.credibility}/10
          </Badge>
        </div>
      </div>

      {/* 完整内容 */}
      <div>
        <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
          内容
        </h3>
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {knowledge.content}
          </div>
        </div>
      </div>

      {/* 正反对比展示 */}
      <KnowledgeComparison
        positiveEvidence={knowledge.positiveEvidence}
        negativeEvidence={knowledge.negativeEvidence}
        neutralAnalysis={knowledge.neutralAnalysis}
      />

      {/* 实践指导 */}
      {knowledge.practicalGuide && (
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
            实践指导
          </h3>
          <div className="rounded-md border bg-muted/30 p-3">
            <pre className="text-xs whitespace-pre-wrap overflow-x-auto">
              {JSON.stringify(JSON.parse(knowledge.practicalGuide), null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* 案例研究 */}
      {knowledge.caseStudies && (
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
            案例研究
          </h3>
          <div className="rounded-md border bg-muted/30 p-3">
            <pre className="text-xs whitespace-pre-wrap overflow-x-auto">
              {JSON.stringify(JSON.parse(knowledge.caseStudies), null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* 专家观点 */}
      {knowledge.expertOpinions && (
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
            专家观点
          </h3>
          <div className="rounded-md border bg-muted/30 p-3">
            <pre className="text-xs whitespace-pre-wrap overflow-x-auto">
              {JSON.stringify(JSON.parse(knowledge.expertOpinions), null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* 统计信息 */}
      <div className="border-t pt-3 mt-3">
        <div className="grid grid-cols-4 gap-3 text-xs">
          <div>
            <div className="text-muted-foreground">查看</div>
            <div className="font-medium">{knowledge.viewCount}</div>
          </div>
          <div>
            <div className="text-muted-foreground">使用</div>
            <div className="font-medium">{knowledge.usedCount}</div>
          </div>
          <div>
            <div className="text-muted-foreground">点赞</div>
            <div className="font-medium">{knowledge.likeCount || 0}</div>
          </div>
          <div>
            <div className="text-muted-foreground">分享</div>
            <div className="font-medium">{knowledge.shareCount || 0}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
