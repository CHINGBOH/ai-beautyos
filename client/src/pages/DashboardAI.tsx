import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Send, Sparkles, Database, TrendingUp, Users } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

export default function DashboardAI() {
  const [question, setQuestion] = useState("");
  const [conversation, setConversation] = useState<Array<{ role: "user" | "assistant"; content: string; data?: any }>>([]);

  const queryMutation = trpc.adminAi.query.useMutation({
    onSuccess: (data) => {
      const answerText = typeof data.answer === 'string' ? data.answer : JSON.stringify(data.answer);
      setConversation((prev) => [
        ...prev,
        {
          role: "assistant",
          content: answerText,
          data: data.queryResult,
        },
      ]);
      setQuestion("");
    },
    onError: (error) => {
      toast.error("查询失败：" + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      toast.error("请输入问题");
      return;
    }

    // 添加用户问题到对话
    setConversation((prev) => [
      ...prev,
      {
        role: "user",
        content: question,
      },
    ]);

    // 发送查询
    queryMutation.mutate({ question });
  };

  const quickQuestions = [
    { icon: Users, text: "今天有多少新客户？", color: "text-blue-600" },
    { icon: TrendingUp, text: "本月转化率是多少？", color: "text-green-600" },
    { icon: Database, text: "找出所有A级客户", color: "text-purple-600" },
    { icon: Sparkles, text: "哪些客户咨询过超皮秒但未预约？", color: "text-amber-600" },
  ];

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-amber-600" />
          AI 数据助手
        </h1>
        <p className="text-gray-600">
          用自然语言查询客户数据、对话记录、统计信息等
        </p>
      </div>

      {/* 快捷问题 */}
      {conversation.length === 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">快捷查询</CardTitle>
            <CardDescription>点击下方问题快速开始</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {quickQuestions.map((q, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="justify-start h-auto py-4 px-4"
                  onClick={() => {
                    setQuestion(q.text);
                  }}
                >
                  <q.icon className={`w-5 h-5 mr-3 ${q.color}`} />
                  <span className="text-left">{q.text}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 对话历史 */}
      {conversation.length > 0 && (
        <div className="space-y-4 mb-6">
          {conversation.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <Card className={`max-w-3xl ${msg.role === "user" ? "bg-amber-50" : "bg-white"}`}>
                <CardContent className="p-4">
                  {msg.role === "user" ? (
                    <p className="text-gray-800">{msg.content}</p>
                  ) : (
                    <div>
                      <div className="prose prose-sm max-w-none mb-4">
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      
                      {/* 显示查询结果数据 */}
                      {msg.data && msg.data.data && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Database className="w-4 h-4 text-gray-600" />
                            <span className="text-sm font-medium text-gray-700">
                              查询结果：{msg.data.type}（共 {msg.data.count} 条）
                            </span>
                          </div>
                          {msg.data.count > 0 && (
                            <div className="text-xs text-gray-500">
                              显示前 {Math.min(5, msg.data.count)} 条数据
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* 输入框 */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="输入您的问题，比如：今天有多少新客户？本月转化率是多少？"
              className="min-h-[100px]"
              disabled={queryMutation.isPending}
            />
            <Button
              type="submit"
              disabled={queryMutation.isPending || !question.trim()}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {queryMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 使用提示 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">使用提示</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• 可以查询客户信息：「找出所有A级客户」「哪些客户来自小红书」</li>
            <li>• 可以查询对话记录：「今天有多少对话」「哪些客户咨询过超皮秒」</li>
            <li>• 可以查询统计数据：「本月新增客户数」「本周转化率」</li>
            <li>• 可以进行复杂查询：「找出本周咨询过超皮秒但未预约的客户」</li>
          </ul>
        </CardContent>
      </Card>
      </div>
    </DashboardLayout>
  );
}
