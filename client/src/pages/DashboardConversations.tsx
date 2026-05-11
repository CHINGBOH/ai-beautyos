import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, Search, Calendar, User } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function DashboardConversations() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);

  const conversationsQuery = trpc.chat.getConversations.useQuery();
  const messagesQuery = trpc.chat.getMessages.useQuery(
    { conversationId: selectedConvId! },
    { enabled: selectedConvId !== null }
  );

  const conversations = conversationsQuery.data || [];
  const filteredConversations = conversations.filter((conv) =>
    (conv.visitorName || conv.sessionId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">对话管理</h1>
          <p className="text-muted-foreground mt-2">
            查看和管理所有 AI 客服对话记录
          </p>
        </div>

        {/* 搜索栏 */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索对话..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={() => conversationsQuery.refetch()}>
            刷新
          </Button>
        </div>

        {/* 对话列表 */}
        <div className="grid gap-4">
          {conversationsQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {searchTerm ? "未找到匹配的对话" : "暂无对话记录"}
              </CardContent>
            </Card>
          ) : (
            filteredConversations.map((conv) => (
              <Card
                key={conv.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedConvId(conv.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        {conv.visitorName || `对话 #${conv.id}`}
                      </CardTitle>
                      <CardDescription className="mt-2 flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {conv.visitorPhone || "访客"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(conv.createdAt).toLocaleString("zh-CN")}
                        </span>
                      </CardDescription>
                    </div>
                    <Badge variant={conv.status === "converted" ? "default" : "secondary"}>
                      {conv.status === "converted" ? "已转化" : "未转化"}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>

        {/* 对话详情弹窗 */}
        <Dialog open={selectedConvId !== null} onOpenChange={() => setSelectedConvId(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>对话详情</DialogTitle>
              <DialogDescription>
                查看完整的对话历史记录
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {messagesQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : messagesQuery.data && messagesQuery.data.length > 0 ? (
                messagesQuery.data.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <div className="text-xs opacity-70 mb-1">
                        {msg.role === "user" ? "客户" : "AI 客服"}
                      </div>
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                      <div className="text-xs opacity-50 mt-1">
                        {new Date(msg.createdAt).toLocaleTimeString("zh-CN")}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">暂无消息</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
