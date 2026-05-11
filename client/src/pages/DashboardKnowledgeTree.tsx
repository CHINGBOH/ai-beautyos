import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Loader2, ChevronRight, ChevronDown, BookOpen, Search, Home } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";
import { KNOWLEDGE_MODULES, MODULE_NAMES, MODULE_DESCRIPTIONS } from "@shared/types";
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
  const [selectedModule, setSelectedModule] = useState<string>(KNOWLEDGE_MODULES.HEALTH_FOUNDATION);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [searchKeyword, setSearchKeyword] = useState("");

  // 获取知识库树
  const { data: knowledgeTree, isLoading } = trpc.knowledge.getTreeByModule.useQuery({
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

  const renderTreeNode = (node: KnowledgeNode, depth: number = 0): JSX.Element => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const indent = depth * 24;

    return (
      <div key={node.id} className="select-none">
        <div
          className={`flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${
            selectedNodeId === node.id ? "bg-blue-50 border border-blue-200" : ""
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
                  {MODULE_NAMES[node.module as keyof typeof MODULE_NAMES] || node.module}
                </Badge>
              )}
              {node.level > 1 && (
                <Badge variant="secondary" className="text-xs">
                  L{node.level}
                </Badge>
              )}
            </div>
            {node.summary && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-1">{node.summary}</p>
            )}
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
              <span>查看: {node.viewCount}</span>
              <span>使用: {node.usedCount}</span>
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="ml-4">
            {node.children!.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">知识库管理</h1>
            <p className="text-muted-foreground mt-2">
              6层嵌套知识体系，让美成为女生一生的事业和陪伴
            </p>
          </div>
        </div>

        {/* 模块选择 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              选择知识模块
            </CardTitle>
            <CardDescription>
              15个知识模块，涵盖健康基础、皮肤管理、牙齿护理、中医养生、医美技术等
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {modulesData?.modules.map((module) => (
                <Button
                  key={module.key}
                  variant={selectedModule === module.key ? "default" : "outline"}
                  className="h-auto py-3 flex flex-col items-start gap-1"
                  onClick={() => {
                    setSelectedModule(module.key);
                    setSelectedNodeId(null);
                    setExpandedNodes(new Set());
                  }}
                >
                  <span className="font-medium">{module.name}</span>
                  <span className="text-xs text-muted-foreground line-clamp-2">
                    {MODULE_DESCRIPTIONS[module.key as keyof typeof MODULE_DESCRIPTIONS]}
                  </span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 搜索 */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索知识库内容..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* 知识库树 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：知识树 */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">知识树</CardTitle>
              <CardDescription>
                {MODULE_NAMES[selectedModule as keyof typeof MODULE_NAMES]}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : searchKeyword && searchResults ? (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground mb-4">
                    找到 {searchResults.length} 个结果
                  </div>
                  {searchResults.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedNodeId(item.id)}
                    >
                      <div className="font-medium text-sm">{item.title}</div>
                      {item.summary && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.summary}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : knowledgeTree && knowledgeTree.length > 0 ? (
                <div className="space-y-1 max-h-[600px] overflow-y-auto">
                  {knowledgeTree.map((node) => renderTreeNode(node))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>该模块暂无知识内容</p>
                  <p className="text-sm mt-2">开始添加知识库内容吧</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 右侧：知识详情 */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>知识详情</CardTitle>
              <CardDescription>
                {selectedNodeId
                  ? "查看知识库详细内容"
                  : "请从左侧选择知识节点"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedNodeId ? (
                <KnowledgeDetail nodeId={selectedNodeId} />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Home className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>选择一个知识节点查看详情</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

// 知识详情组件
function KnowledgeDetail({ nodeId }: { nodeId: number }) {
  const { data: knowledge, isLoading } = trpc.knowledge.getById.useQuery({ id: nodeId });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!knowledge) {
    return <div className="text-center py-12 text-muted-foreground">知识内容未找到</div>;
  }

  return (
    <div className="space-y-6">
      {/* 标题和基本信息 */}
      <div>
        <h2 className="text-2xl font-bold mb-2">{knowledge.title}</h2>
        {knowledge.summary && (
          <p className="text-gray-600 mb-4">{knowledge.summary}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">层级 {knowledge.level}</Badge>
          {knowledge.module && (
            <Badge variant="secondary">
              {MODULE_NAMES[knowledge.module as keyof typeof MODULE_NAMES] || knowledge.module}
            </Badge>
          )}
          {knowledge.difficulty && (
            <Badge variant="outline">难度: {knowledge.difficulty}</Badge>
          )}
          <Badge variant="outline">可信度: {knowledge.credibility}/10</Badge>
        </div>
      </div>

      {/* 完整内容 */}
      <div>
        <h3 className="text-lg font-semibold mb-3">内容</h3>
        <div className="prose max-w-none">
          <div className="whitespace-pre-wrap text-sm">{knowledge.content}</div>
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
          <h3 className="text-lg font-semibold mb-3">实践指导</h3>
          <div className="bg-gray-50 border rounded-lg p-4">
            <pre className="text-sm whitespace-pre-wrap">
              {JSON.stringify(JSON.parse(knowledge.practicalGuide), null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* 案例研究 */}
      {knowledge.caseStudies && (
        <div>
          <h3 className="text-lg font-semibold mb-3">案例研究</h3>
          <div className="bg-gray-50 border rounded-lg p-4">
            <pre className="text-sm whitespace-pre-wrap">
              {JSON.stringify(JSON.parse(knowledge.caseStudies), null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* 专家观点 */}
      {knowledge.expertOpinions && (
        <div>
          <h3 className="text-lg font-semibold mb-3">专家观点</h3>
          <div className="bg-gray-50 border rounded-lg p-4">
            <pre className="text-sm whitespace-pre-wrap">
              {JSON.stringify(JSON.parse(knowledge.expertOpinions), null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* 统计信息 */}
      <div className="border-t pt-4">
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">查看次数</div>
            <div className="font-semibold">{knowledge.viewCount}</div>
          </div>
          <div>
            <div className="text-muted-foreground">使用次数</div>
            <div className="font-semibold">{knowledge.usedCount}</div>
          </div>
          <div>
            <div className="text-muted-foreground">点赞数</div>
            <div className="font-semibold">{knowledge.likeCount || 0}</div>
          </div>
          <div>
            <div className="text-muted-foreground">分享数</div>
            <div className="font-semibold">{knowledge.shareCount || 0}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
