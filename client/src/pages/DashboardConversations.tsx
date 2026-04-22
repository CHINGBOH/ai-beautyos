import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import DashboardLayout from '@/components/DashboardLayout';

export default function DashboardConversations() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/conversations');
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
      console.error('Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300';
      case 'closed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'pending':
        return 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300';
      default:
        return 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy-MM-dd HH:mm');
    } catch {
      return dateString;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">对话管理</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            查看和管理所有客户与AI助手的对话记录
          </p>
        </div>

        <Card className="border-stone-200 shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>对话记录</CardTitle>
                <CardDescription>
                  实时同步前端LLM聊天对话，支持查看详细内容
                </CardDescription>
              </div>
              <Button onClick={fetchConversations} disabled={loading}>
                {loading ? '加载中...' : '刷新'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-4 bg-stone-50 text-stone-600 rounded-lg dark:bg-stone-800 dark:text-stone-300">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8A68D]"></div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">暂无对话记录</p>
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">ID</TableHead>
                      <TableHead>会话信息</TableHead>
                      <TableHead className="w-32">状态</TableHead>
                      <TableHead className="w-40">创建时间</TableHead>
                      <TableHead className="w-40">最后活动</TableHead>
                      <TableHead className="w-20">消息数</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conversations.map((conv) => (
                      <TableRow key={conv.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <TableCell className="font-medium">{conv.id}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback>
                                  {conv.user_id ? conv.user_id.slice(0, 1) : 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">
                                {conv.user_id || '匿名用户'}
                              </span>
                            </div>
                            {conv.last_message && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                {conv.last_message}
                              </p>
                            )}
                            <p className="text-xs text-gray-400">
                              Session: {conv.session_id}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(conv.status)}>
                            {conv.status === 'active' ? '活跃' : 
                             conv.status === 'closed' ? '已关闭' : 
                             conv.status === 'pending' ? '待处理' : conv.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(conv.created_at)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(conv.last_activity)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {conv.message_count}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6 border-stone-200 shadow-lg">
          <CardHeader>
            <CardTitle>系统状态</CardTitle>
            <CardDescription>对话同步状态与统计信息</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-stone-50 rounded-lg dark:bg-stone-800">
                <p className="text-sm text-stone-600 dark:text-stone-300">总对话数</p>
                <p className="text-2xl font-bold text-stone-600 dark:text-stone-200">
                  {conversations.length}
                </p>
              </div>
              <div className="p-4 bg-stone-50 rounded-lg dark:bg-stone-800">
                <p className="text-sm text-stone-600 dark:text-stone-300">活跃对话</p>
                <p className="text-2xl font-bold text-stone-600 dark:text-stone-200">
                  {conversations.filter(c => c.status === 'active').length}
                </p>
              </div>
              <div className="p-4 bg-stone-50 rounded-lg dark:bg-stone-800">
                <p className="text-sm text-[#B8A68D] dark:text-stone-300">总消息数</p>
                <p className="text-2xl font-bold text-stone-600 dark:text-stone-200">
                  {conversations.reduce((sum, c) => sum + c.message_count, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}