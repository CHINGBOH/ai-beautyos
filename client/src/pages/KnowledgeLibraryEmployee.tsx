import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, GraduationCap, CheckCircle2, Clock, Award } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { KNOWLEDGE_MODULES, MODULE_NAMES } from "@shared/types";

/**
 * 员工视角的知识库页面
 * 侧重：系统化学习、专业培训、考试认证
 */
export default function KnowledgeLibraryEmployee() {
  const [selectedModule, setSelectedModule] = useState<string>(KNOWLEDGE_MODULES.HEALTH_FOUNDATION);
  const [learningProgress, setLearningProgress] = useState<Record<string, number>>({});

  // 获取推荐的学习路径
  const { data: recommendedPaths } = trpc.learningPath.getRecommendedPaths.useQuery({
    module: selectedModule,
    limit: 5,
  });

  // 获取知识库树
  const { data: knowledgeTree } = trpc.knowledge.getTreeByModule.useQuery({
    module: selectedModule,
  });

  // 计算学习进度
  const calculateProgress = (module: string) => {
    // 这里应该从数据库获取员工的学习记录
    // 暂时返回模拟数据
    return learningProgress[module] || 0;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <GraduationCap className="w-8 h-8" />
            员工知识培训中心
          </h1>
          <p className="text-muted-foreground mt-2">
            系统化学习专业知识，提升服务能力和专业水平
          </p>
        </div>

        {/* 学习进度概览 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Object.entries(MODULE_NAMES).slice(0, 5).map(([key, name]) => {
            const progress = calculateProgress(key);
            return (
              <Card key={key}>
                <CardHeader className="pb-3">
                  <CardDescription className="text-xs">{name}</CardDescription>
                  <CardTitle className="text-2xl">{progress}%</CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={progress} className="h-2" />
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 推荐学习路径 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              推荐学习路径
            </CardTitle>
            <CardDescription>
              系统为您推荐的专业学习计划
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendedPaths?.map((path) => (
                <Card key={path.id} className="cursor-pointer hover:bg-gray-50">
                  <CardHeader>
                    <CardTitle className="text-lg">{path.title}</CardTitle>
                    <CardDescription>{path.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{path.estimatedTime} 分钟</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-gray-400" />
                        <span>{path.knowledgeCount} 个知识点</span>
                      </div>
                    </div>
                    <Button className="w-full mt-4" variant="outline">
                      开始学习
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 模块选择 */}
        <Card>
          <CardHeader>
            <CardTitle>选择学习模块</CardTitle>
            <CardDescription>按模块系统化学习专业知识</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(MODULE_NAMES).map(([key, name]) => (
                <Button
                  key={key}
                  variant={selectedModule === key ? "default" : "outline"}
                  className="h-auto py-4 flex flex-col gap-2"
                  onClick={() => setSelectedModule(key)}
                >
                  <span className="font-medium">{name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {calculateProgress(key)}% 完成
                  </Badge>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 知识库树（员工版 - 显示更多技术细节） */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              {MODULE_NAMES[selectedModule as keyof typeof MODULE_NAMES]} - 知识体系
            </CardTitle>
            <CardDescription>
              完整的知识体系结构，支持6层嵌套
            </CardDescription>
          </CardHeader>
          <CardContent>
            {knowledgeTree && knowledgeTree.length > 0 ? (
              <EmployeeKnowledgeTreeView tree={knowledgeTree} />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>该模块暂无内容</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 考试认证 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              考试认证
            </CardTitle>
            <CardDescription>
              完成学习后参加考试，获得专业认证
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>考试功能即将推出</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

// 员工版知识树视图（显示更多技术细节）
function EmployeeKnowledgeTreeView({ tree }: { tree: any[] }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

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
          className={`flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border-l-2 ${
            depth === 0 ? "border-blue-500 font-semibold" : "border-transparent"
          }`}
          style={{ paddingLeft: `${12 + depth * 24}px` }}
          onClick={() => {
            if (hasChildren) {
              toggle(node.id);
            }
          }}
        >
          {hasChildren && (
            <span className="text-gray-400 w-4">{isExpanded ? "▼" : "▶"}</span>
          )}
          <span className="flex-1">{node.title}</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              L{node.level}
            </Badge>
            {node.viewCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                查看 {node.viewCount}
              </Badge>
            )}
            {node.usedCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                使用 {node.usedCount}
              </Badge>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {node.children.map((child: any) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return <div className="space-y-1 max-h-[600px] overflow-y-auto">{tree.map((node) => renderNode(node))}</div>;
}
