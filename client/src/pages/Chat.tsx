import { useState, useEffect } from "react";
import { AIChatBox } from "@/components/AIChatBox";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DatabaseButton } from "@/components/ui/database-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/_core/hooks/useAuth";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export default function Chat() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [leadData, setLeadData] = useState({
    name: "",
    phone: "",
    wechat: "",
    interestedServices: [] as string[],
    budget: "",
    message: "",
  });

  const createSession = trpc.chat.createSession.useMutation();
  const sendMessage = trpc.chat.sendMessage.useMutation();
  const convertToLead = trpc.chat.convertToLead.useMutation();

  useEffect(() => {
    const params =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : null;
    const fromBooking =
      params?.get("fromBooking") === "1" ||
      sessionStorage.getItem("fromBooking") === "1";
    const leadIdFromUrl = params?.get("leadId") ?? null;
    const kbIdFromUrl = params?.get("kbId") ?? null;
    if (fromBooking) {
      sessionStorage.removeItem("fromBooking");
      if (leadIdFromUrl) sessionStorage.setItem("bookingLeadId", leadIdFromUrl);
      else sessionStorage.removeItem("bookingLeadId");
    }
    const storedLeadId =
      leadIdFromUrl || sessionStorage.getItem("bookingLeadId");
    if (storedLeadId) {
      setLeadId(storedLeadId);
    } else {
      setLeadId(null);
    }

    const initSession = async () => {
      try {
        const result = await createSession.mutateAsync();
        setSessionId(result.sessionId);

        const baseWelcome =
          "您好！我是您的专属医美咨询顾问 😊\n\n很高兴为您服务！我们是一家专业的医美机构，拥有10年以上的临床经验，致力于帮助每一位客户安全、有效地变美。\n\n我可以为您提供：\n\n✨ 专业医美项目介绍（超皮秒、水光针、热玛吉等）\n✨ 个性化治疗方案推荐\n✨ 价格和优惠信息咨询\n✨ 免费面诊预约服务\n\n请随时告诉我您的需求，我会用专业和温暖的态度为您服务~";
        const welcome = fromBooking
          ? "您已提交预约，顾问将尽快联系您；您也可以在此补充需求或咨询项目。\n\n" +
            baseWelcome
          : baseWelcome;

        const initialMessages: ChatMessage[] = [];
        if (kbIdFromUrl) {
          initialMessages.push({
            role: "system",
            content: `本次对话关联知识库条目 ID=${kbIdFromUrl}，请基于该知识为客户提供解释和建议。`,
          });
        }
        initialMessages.push({ role: "assistant", content: welcome });
        setMessages(initialMessages);
      } catch (error) {
        toast.error("连接失败，请检查网络后重试");
        console.error(error);
      }
    };
    initSession();
  }, []);

  const handleSendMessage = async (content: string) => {
    if (!sessionId) {
      toast.error("会话未初始化");
      return;
    }

    // 添加用户消息
    setMessages(prev => [...prev, { role: "user", content }]);
    setIsLoading(true);

    try {
      const result = await sendMessage.mutateAsync({
        sessionId,
        message: content,
      });

      // 添加 AI 回复
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: result.response },
      ]);

      // 如果提取到客户信息，自动填充表单
      if (result.extractedInfo) {
        const info = result.extractedInfo;
        setLeadData(prev => ({
          ...prev,
          name: info.name || prev.name,
          phone: info.phone || prev.phone,
          wechat: info.wechat || prev.wechat,
          interestedServices:
            info.interestedServices || prev.interestedServices,
          budget: info.budget || prev.budget,
        }));
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "网络异常";
      const isBalanceError = /余额不足|Insufficient Balance|402/i.test(msg);
      toast.error(
        isBalanceError ? "AI 服务暂不可用（账户余额不足）" : `发送失败：${msg}`
      );
      console.error("[Chat sendMessage]", error);
      const friendlyContent = isBalanceError
        ? "抱歉，AI 顾问暂时无法回复（服务账户余额不足）。请联系客服或稍后再试。"
        : `抱歉，暂时无法回复。请检查网络或稍后重试。`;
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: friendlyContent },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConvertToLead = async () => {
    if (!leadData.name || !leadData.phone) {
      toast.error("请填写姓名和手机号");
      return;
    }

    try {
      const result = await convertToLead.mutateAsync({
        sessionId,
        ...leadData,
      });

      if (result.success) {
        toast.success(
          "预约信息已提交成功！我们的顾问将在1小时内与您联系，请保持手机畅通 💝"
        );
        setShowLeadForm(false);
      } else {
        toast.error(
          result.error ||
            "提交失败，请检查网络连接或稍后重试。如问题持续，请联系客服"
        );
      }
    } catch (error) {
      toast.error("提交失败，请检查网络连接或稍后重试。如问题持续，请联系客服");
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-page-soft">
      <nav className="bg-white/80 backdrop-blur-sm border-b border-stone-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold text-stone-600">
                在线咨询
              </span>
            </div>
            <div className="flex gap-3">
              {leadId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setLocation(
                      `/dashboard/customers?leadId=${encodeURIComponent(leadId)}&showDetail=1`
                    )
                  }
                >
                  查看客户详情
                </Button>
              )}
              <DatabaseButton
                variant="ghost"
                size="sm"
                pageKey="chat"
                buttonKey="返回首页"
                fallbackText="返回首页"
                onClick={() => setLocation("/")}
              ></DatabaseButton>
              {user && (
                <>
                  <DatabaseButton
                    variant="ghost"
                    size="sm"
                    pageKey="chat"
                    buttonKey="后台管理"
                    fallbackText="后台管理"
                    onClick={() => setLocation("/dashboard/admin")}
                  ></DatabaseButton>
                  <DatabaseButton
                    variant="ghost"
                    size="sm"
                    pageKey="chat"
                    buttonKey="数据助手"
                    fallbackText="数据助手"
                    onClick={() => setLocation("/dashboard/ai")}
                  ></DatabaseButton>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* 头部 */}
          <div className="text-center mb-8">
            <h1 className="mb-2 text-foreground">医美咨询顾问</h1>
            <p className="text-muted-foreground leading-relaxed">
              专业、温暖、耐心的医美咨询服务，为您解答任何疑问
            </p>
          </div>

          {/* 留资与预约入口 */}
          <div className="mb-4 text-center flex flex-wrap items-center justify-center gap-3">
            <DatabaseButton
              size="lg"
              pageKey="chat"
              buttonKey="free-consultation"
              fallbackText="💝 免费咨询，专业顾问1对1服务"
              onClick={() => setShowLeadForm(true)}
              variant="brand"
              className="px-8 py-4 text-base rounded-full shadow-lg hover:shadow-xl transition-all"
            />
            <Button
              variant="outline"
              size="lg"
              className="rounded-full"
              onClick={() => {
                try {
                  sessionStorage.setItem(
                    "bookingPrefill",
                    JSON.stringify({
                      name: leadData.name,
                      phone: leadData.phone,
                      message: leadData.message,
                    })
                  );
                } catch (_) {}
                setLocation("/#form-section");
              }}
            >
              填写预约表单
            </Button>
          </div>

          {/* 聊天界面 */}
          <div className="bg-card rounded-[var(--radius)] shadow-card overflow-hidden transition-[box-shadow] duration-[var(--motion-duration)] ease-[var(--motion-ease)] hover:shadow-elevated">
            <AIChatBox
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              placeholder="输入您的问题，比如：我想了解超皮秒祛斑..."
              height="600px"
            />
          </div>
        </div>
      </div>

      {/* 留资表单弹窗 */}
      <Dialog open={showLeadForm} onOpenChange={setShowLeadForm}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>预约面诊</DialogTitle>
            <DialogDescription>
              请留下您的联系方式，我们的专业顾问会尽快与您联系
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">姓名 *</Label>
              <Input
                id="name"
                value={leadData.name}
                onChange={e =>
                  setLeadData({ ...leadData, name: e.target.value })
                }
                placeholder="请输入您的真实姓名，方便我们联系您"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">手机号 *</Label>
              <Input
                id="phone"
                value={leadData.phone}
                onChange={e =>
                  setLeadData({ ...leadData, phone: e.target.value })
                }
                placeholder="请输入11位手机号码，用于接收预约确认"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wechat">微信号</Label>
              <Input
                id="wechat"
                value={leadData.wechat}
                onChange={e =>
                  setLeadData({ ...leadData, wechat: e.target.value })
                }
                placeholder="请输入您的微信号（选填）"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="budget">预算区间</Label>
              <Input
                id="budget"
                value={leadData.budget}
                onChange={e =>
                  setLeadData({ ...leadData, budget: e.target.value })
                }
                placeholder="您的预算范围，如：5000-10000元（选填，帮助我们推荐合适方案）"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="message">留言</Label>
              <Input
                id="message"
                value={leadData.message}
                onChange={e =>
                  setLeadData({ ...leadData, message: e.target.value })
                }
                placeholder="还有什么想了解的？告诉我们您的具体需求（选填）"
              />
            </div>
          </div>
          <DialogFooter>
            <DatabaseButton
              type="submit"
              pageKey="chat"
              buttonKey="submit-lead"
              fallbackText={convertToLead.isPending ? "提交中..." : "提交"}
              onClick={handleConvertToLead}
              disabled={convertToLead.isPending}
              className="w-full"
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
