/**
 * 小红书运营管理页面
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Eye, Heart, MessageCircle, Share2, Bookmark, TrendingUp } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useLocation } from "wouter";

export default function DashboardXiaohongshu() {
  // const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("published");
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [, setLocation] = useLocation();

  // 获取统计数据
  const { data: stats, isLoading: statsLoading } = trpc.xiaohongshu.getStats.useQuery();

  // 获取内容列表
  const { data: postsData, isLoading: postsLoading, refetch } = trpc.xiaohongshu.getPosts.useQuery({
    status: activeTab as any,
    limit: 20,
    offset: 0,
  });

  const posts = postsData?.posts || [];
  const selectedPost = selectedPostId ? posts.find(post => post.id === selectedPostId) : null;
  const topPosts = [...posts]
    .filter(post => post.status === "published")
    .sort((a, b) =>
      (b.viewCount || 0) + (b.likeCount || 0) * 5 + (b.commentCount || 0) * 8 -
      ((a.viewCount || 0) + (a.likeCount || 0) * 5 + (a.commentCount || 0) * 8)
    )
    .slice(0, 5);

  const commentsQuery = trpc.xiaohongshu.getComments.useQuery(
    { postId: selectedPostId || 0, limit: 10, offset: 0 },
    { enabled: !!selectedPostId }
  );
  const updateStats = trpc.xiaohongshu.updatePostStats.useMutation({
    onSuccess: () => refetch(),
  });

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">小红书运营管理</h1>
          <p className="text-muted-foreground mt-2">管理小红书内容发布、数据监控和评论互动</p>
        </div>
        <Button onClick={() => setLocation("/dashboard/content")}>
          <Plus className="w-4 h-4 mr-2" />
          创建新内容
        </Button>
      </div>

      {/* 数据统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>已发布内容</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPosts || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              总阅读量
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalViews || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              总点赞数
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalLikes || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              总评论数
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalComments || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>待回复评论</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-stone-600">{stats?.pendingComments || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* 内容列表 */}
      <Card>
        <CardHeader>
          <CardTitle>内容管理</CardTitle>
          <CardDescription>查看和管理所有小红书内容</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="published">已发布</TabsTrigger>
              <TabsTrigger value="scheduled">待发布</TabsTrigger>
              <TabsTrigger value="draft">草稿</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4 mt-4">
              {postsLoading ? (
                <div className="text-center py-8 text-muted-foreground">加载中...</div>
              ) : posts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">暂无内容</div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <Card key={post.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">{post.title}</h3>
                              <Badge variant="outline">{post.contentType}</Badge>
                              {post.project && <Badge variant="secondary">{post.project}</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                              {post.content}
                            </p>
                            
                            {post.status === "published" && (
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Eye className="w-4 h-4" />
                                  {post.viewCount}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Heart className="w-4 h-4" />
                                  {post.likeCount}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MessageCircle className="w-4 h-4" />
                                  {post.commentCount}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Share2 className="w-4 h-4" />
                                  {post.shareCount}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Bookmark className="w-4 h-4" />
                                  {post.collectCount}
                                </span>
                              </div>
                            )}

                            {post.status === "scheduled" && post.scheduledAt && (
                              <div className="text-sm text-muted-foreground">
                                计划发布时间：{new Date(post.scheduledAt).toLocaleString("zh-CN")}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setLocation(`/dashboard/content?postId=${post.id}`)}
                            >
                              编辑
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedPostId(post.id)}
                            >
                              查看详情
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {selectedPost && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>{selectedPost.title}</CardTitle>
                <CardDescription>内容详情、互动数据和评论跟进</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedPostId(null)}>
                关闭详情
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm leading-6 whitespace-pre-wrap text-muted-foreground">{selectedPost.content}</p>
            <div className="grid gap-3 md:grid-cols-5">
              {[
                ["阅读", selectedPost.viewCount || 0],
                ["点赞", selectedPost.likeCount || 0],
                ["评论", selectedPost.commentCount || 0],
                ["分享", selectedPost.shareCount || 0],
                ["收藏", selectedPost.collectCount || 0],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="text-xl font-semibold">{value}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  updateStats.mutate({
                    id: selectedPost.id,
                    viewCount: (selectedPost.viewCount || 0) + 100,
                    likeCount: (selectedPost.likeCount || 0) + 10,
                    commentCount: selectedPost.commentCount || 0,
                    shareCount: (selectedPost.shareCount || 0) + 2,
                    collectCount: (selectedPost.collectCount || 0) + 4,
                  })
                }
                disabled={updateStats.isPending}
              >
                同步模拟数据
              </Button>
              <Button variant="outline" size="sm" onClick={() => setLocation(`/dashboard/content?postId=${selectedPost.id}`)}>
                编辑内容
              </Button>
            </div>
            <div>
              <h3 className="font-medium mb-3">最新评论</h3>
              {commentsQuery.isLoading ? (
                <div className="text-sm text-muted-foreground">加载评论中...</div>
              ) : commentsQuery.data?.comments?.length ? (
                <div className="space-y-2">
                  {commentsQuery.data.comments.map((comment: any) => (
                    <div key={comment.id} className="rounded-lg border p-3 text-sm">
                      <div className="font-medium">{comment.userName || "用户"}</div>
                      <p className="text-muted-foreground mt-1">{comment.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">暂无评论</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 爆款分析 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            爆款内容分析
          </CardTitle>
          <CardDescription>分析表现最好的内容，总结成功经验</CardDescription>
        </CardHeader>
        <CardContent>
          {topPosts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">暂无已发布内容，发布后将自动生成分析</div>
          ) : (
            <div className="space-y-3">
              {topPosts.map((post, index) => {
                const score = (post.viewCount || 0) + (post.likeCount || 0) * 5 + (post.commentCount || 0) * 8;
                return (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => setSelectedPostId(post.id)}
                    className="w-full rounded-lg border p-4 text-left hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">#{index + 1} {post.title}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          阅读 {post.viewCount || 0} · 点赞 {post.likeCount || 0} · 评论 {post.commentCount || 0}
                        </div>
                      </div>
                      <Badge variant="secondary">热度 {score}</Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </DashboardLayout>
  );
}
