# 1. 安装 Podman 和 Docker 兼容包（推荐方案：最省资源）
sudo dnf install -y podman podman-docker docker-compose

# 2. 配置 Podman rootless 模式（无需 sudo）
podman system connection add --identity ~/.ssh/id_rsa myrootlessssh
# 或者直接运行（会自动配置）
podman info

# 3. 启用并启动 Podman 服务
systemctl --user enable podman.socket
systemctl --user start podman.socket

# 4. 配置 Docker 命令别名到 Podman（可选，如果未安装 podman-docker）
echo 'alias docker=podman' >> ~/.bashrc
echo 'alias docker-compose=podman-compose' >> ~/.bashrc
source ~/.bashrc
# 1. 安装 Podman 和 Docker 兼容包（推荐方案：最省资源）
sudo dnf install -y podman podman-docker docker-compose

# 2. 配置 Podman rootless 模式（无需 sudo）
podman system connection add --identity ~/.ssh/id_rsa myrootlessssh
# 或者直接运行（会自动配置）
podman info

# 3. 启用并启动 Podman 服务
systemctl --user enable podman.socket
systemctl --user start podman.socket

# 4. 配置 Docker 命令别名到 Podman（可选，如果未安装 podman-docker）
echo 'alias docker=podman' >> ~/.bashrc
echo 'alias docker-compose=podman-compose' >> ~/.bashrc
source ~/.bashrc
import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Edit2, Home } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

interface DynamicPageProps {
  pageKey: string;
  isAdmin?: boolean;
}

export default function DynamicPage({ pageKey: propPageKey, isAdmin = false }: DynamicPageProps) {
  const params = useParams();
  const [location, setLocation] = useLocation();
  
  // 使用传入的 pageKey 或从路由参数获取
  const pageKey = propPageKey || params.pageKey || "home";
  
  // 获取页面内容
  const { data: contentData, isLoading: contentLoading } = trpc.website.getPageContent.useQuery({
    pageKey,
  });

  // 获取导航信息
  const { data: navigationData } = trpc.website.getNavigationByNavKey.useQuery({
    navKey: pageKey,
  });

  useEffect(() => {
    // 设置页面标题
    if (navigationData?.title) {
      document.title = `${navigationData.title} - 焱磊医美`;
    }
  }, [navigationData]);

  // 按区块分组内容
  const groupedContent = contentData?.reduce((acc, item) => {
    if (!acc[item.sectionKey]) {
      acc[item.sectionKey] = [];
    }
    acc[item.sectionKey].push(item);
    return acc;
  }, {} as Record<string, typeof contentData>) || {};

  const renderContentItem = (item: any) => {
    switch (item.contentType) {
      case "text":
        return (
          <div key={item.id} className="mb-4">
            {item.title && <h3 className="text-xl font-semibold mb-2">{item.title}</h3>}
            <p className="text-gray-700 whitespace-pre-line">{item.content}</p>
            {item.linkUrl && (
              <Button
                variant="link"
                onClick={() => setLocation(item.linkUrl)}
                className="mt-2"
              >
                {item.linkText || "了解更多"} →
              </Button>
            )}
          </div>
        );
      case "html":
        return (
          <div
            key={item.id}
            dangerouslySetInnerHTML={{ __html: item.content }}
            className="mb-4"
          />
        );
      case "image":
        return (
          <div key={item.id} className="mb-4">
            {item.title && <h3 className="text-xl font-semibold mb-2">{item.title}</h3>}
            <img
              src={item.imageUrl}
              alt={item.title || ""}
              className="rounded-lg max-w-full h-auto"
            />
          </div>
        );
      default:
        return null;
    }
  };

  if (contentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  const pageContent = (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      {/* 导航栏 */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-amber-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Liora Yan" className="h-8 w-8 object-contain" />
              <span className="text-lg font-bold text-amber-800 font-serif">
                焱磊医美
              </span>
            </div>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/")}
                className="gap-2"
              >
                <Home className="w-4 h-4" />
                首页
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/chat")}
                className="gap-2"
              >
                在线咨询
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* 返回按钮 */}
      <div className="container mx-auto px-4 py-4">
        <Button
          variant="ghost"
          onClick={() => location === '/' ? setLocation('/') : setLocation(-1 as any)}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </Button>
      </div>

      {/* 页面内容 */}
      <div className="container mx-auto px-4 py-8">
        {/* 页面标题 */}
        {navigationData && (
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 font-serif text-amber-900">
              {navigationData.title}
            </h1>
            {navigationData.description && (
              <p className="text-gray-600 text-lg">{navigationData.description}</p>
            )}
          </div>
        )}

        {/* 内容区块 */}
        {Object.entries(groupedContent).map(([sectionKey, items]) => (
          <Card key={sectionKey} className="mb-8 border-amber-100 shadow-sm">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {items.map(renderContentItem)}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* 无内容提示 */}
        {contentData && contentData.length === 0 && (
          <Card className="border-amber-100">
            <CardContent className="pt-12 pb-12 text-center">
              <p className="text-gray-500 mb-4">页面内容正在建设中...</p>
              <Button onClick={() => setLocation("/")}>返回首页</Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 底部 */}
      <footer className="bg-gray-900 text-white py-8 mt-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold font-serif">焱磊医美</span>
            </div>
            <div className="flex items-center gap-6 text-gray-400 text-sm">
              <span>服务时间：9:00 - 21:00</span>
              <span>|</span>
              <span>© 2026 Liora Yan. All rights reserved.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );

  return isAdmin ? (
    <DashboardLayout>
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{navigationData?.title || "页面管理"}</h1>
            <p className="text-muted-foreground mt-2">管理页面内容</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLocation("/")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </Button>
          </div>
        </div>

        {Object.entries(groupedContent).map(([sectionKey, items]) => (
          <Card key={sectionKey}>
            <CardHeader>
              <CardTitle>{sectionKey}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {items.map(item => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{item.title}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLocation(`/dashboard/website/content/${item.id}`)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600 whitespace-pre-line">{item.content}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  ) : (
    pageContent
  );
}
