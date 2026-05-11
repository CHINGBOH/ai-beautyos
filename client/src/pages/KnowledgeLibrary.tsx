import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Search, Sparkles, Users, GraduationCap, Heart, Target } from "lucide-react";
import { KnowledgeSearch } from "@/components/KnowledgeSearch";
import { KnowledgeDetailView } from "@/components/KnowledgeDetailView";
import { KNOWLEDGE_MODULES, MODULE_NAMES } from "@shared/types";
import { useAuth } from "@/_core/hooks/useAuth";

/**
 * 客户视角的知识库页面
 * 侧重：了解学习、易懂实用
 */
export default function KnowledgeLibrary() {
  const { user } = useAuth();
  const isEmployee = user?.role === "admin" || user?.role === "staff";
  
  const [selectedModule, setSelectedModule] = useState<string>(KNOWLEDGE_MODULES.HEALTH_FOUNDATION);
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState<number | null>(null);
  const [learningPath, setLearningPath] = useState<any>(null);

  // 获取知识库树
  const { data: knowledgeTree } = trpc.knowledge.getTreeByModule.useQuery({
    module: selectedModule,
  });

  // 生成学习路径
  const generatePathMutation = trpc.learningPath.generateByQuestion.useMutation({
    onSuccess: (data) => {
      setLearningPath(data);
    },
  });

  // 当搜索关键词变化时，自动生成学习路径
  const handleSearchChange = (keyword: string) => {
    if (keyword.length > 3) {
      generatePathMutation.mutate({
        question: keyword,
        module: selectedModule,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      {/* 导航栏 */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-amber-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-amber-600" />
              <span className="text-lg font-semibold text-amber-800">美业知识库</span>
              <Badge variant="outline" className="text-xs">
                {isEmployee ? "员工视角" : "客户视角"}
              </Badge>
            </div>
            <div className="flex gap-3">
              {isEmployee && (
                <Button variant="ghost" size="sm" onClick={() => window.location.href = "/dashboard/knowledge-tree"}>
                  管理后台
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* 欢迎区域 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">
            让美成为您一生的事业和陪伴
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            从健康基础到医美技术，全方位知识体系助您科学变美
          </p>
          
          {/* 快速入口 */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {Object.entries(MODULE_NAMES).slice(0, 5).map(([key, name]) => (
              <Button
                key={key}
                variant={selectedModule === key ? "default" : "outline"}
                onClick={() => setSelectedModule(key)}
                className="gap-2"
              >
                {name}
              </Button>
            ))}
          </div>
        </div>

        {/* 搜索和学习路径 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* 搜索区域 */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                搜索知识库
              </CardTitle>
              <CardDescription>
                输入您的问题或症状，AI将为您推荐学习路径
              </CardDescription>
            </CardHeader>
            <CardContent>
              <KnowledgeSearch
                module={selectedModule}
                onSelectKnowledge={(id) => {
                  setSelectedKnowledgeId(id);
                  // 获取知识详情后可以基于内容生成学习路径
                }}
              />
            </CardContent>
          </Card>

          {/* 学习路径 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                学习路径
              </CardTitle>
              <CardDescription>
                为您推荐的学习计划
              </CardDescription>
            </CardHeader>
            <CardContent>
              {learningPath ? (
                <div className="space-y-3">
                  <div className="text-sm font-medium">{learningPath.question}</div>
                  <div className="space-y-2">
                    {learningPath.path.map((stage: any, index: number) => (
                      <div key={index} className="border rounded p-2">
                        <div className="font-medium text-sm">{stage.stage}</div>
                        <div className="text-xs text-gray-500">{stage.description}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {stage.knowledge.length} 个知识点
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 pt-2 border-t">
                    预计学习时间: {learningPath.estimatedTime} 分钟
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">输入问题生成学习路径</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 知识树浏览 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              {MODULE_NAMES[selectedModule as keyof typeof MODULE_NAMES]} - 知识树
            </CardTitle>
            <CardDescription>
              点击展开，深入了解每个知识点
            </CardDescription>
          </CardHeader>
          <CardContent>
            {knowledgeTree && knowledgeTree.length > 0 ? (
              <KnowledgeTreeView
                tree={knowledgeTree}
                onSelect={(id) => {
                  setSelectedKnowledgeId(id);
                  // 选择知识节点后可以查看详情
                }}
                isEmployee={isEmployee}
              />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>该模块暂无内容</p>
                <p className="text-sm mt-2">运行初始化脚本添加示例内容</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 知识详情展示 */}
        {selectedKnowledgeId && (
          <Card>
            <CardHeader>
              <CardTitle>知识详情</CardTitle>
            </CardHeader>
            <CardContent>
              <KnowledgeDetailView knowledgeId={selectedKnowledgeId} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// 知识树视图组件
function KnowledgeTreeView({
  tree,
  onSelect,
  isEmployee,
}: {
  tree: any[];
  onSelect: (id: number) => void;
  isEmployee: boolean;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set([tree[0]?.id]));

  const toggle = (id: number) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpanded(newExpanded);
  };

  const renderNode = (node: any, depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expanded.has(node.id);

    return (
      <div key={node.id} className="select-none">
        <div
          className={`flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${
            depth === 0 ? "font-semibold" : ""
          }`}
          style={{ paddingLeft: `${12 + depth * 24}px` }}
          onClick={() => {
            if (hasChildren) {
              toggle(node.id);
            }
            onSelect(node.id);
          }}
        >
          {hasChildren && (
            <span className="text-gray-400">{isExpanded ? "▼" : "▶"}</span>
          )}
          <span className="flex-1">{node.title}</span>
          {node.summary && (
            <Badge variant="secondary" className="text-xs">
              {node.summary.substring(0, 20)}...
            </Badge>
          )}
          {isEmployee && (
            <Badge variant="outline" className="text-xs">
              L{node.level}
            </Badge>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div>
            {node.children.map((child: any) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return <div className="space-y-1">{tree.map((node) => renderNode(node))}</div>;
}
