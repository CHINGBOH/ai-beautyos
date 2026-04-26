import { useEffect, useMemo, useState } from "react";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  ArrowRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from "lucide-react";

type LeadFormState = {
  name: string;
  phone: string;
  wechat: string;
  budget: string;
};

const quickPrompts = [
  "我想做皮肤检测，适合从哪里开始？",
  "超皮秒和水光针有什么区别？",
  "我有痘印和毛孔问题，推荐什么方案？",
  "想预约免费面诊，需要准备什么？",
];

const welcomeMessage =
  "您好，我是 LUMIERE 妍美 AI 顾问。您可以直接咨询项目方案、恢复期、预算区间，也可以留下联系方式预约免费面诊。";

export default function YanmeiAI() {
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: welcomeMessage },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"connecting" | "ready" | "error">("connecting");
  const [leadForm, setLeadForm] = useState<LeadFormState>({
    name: "",
    phone: "",
    wechat: "",
    budget: "",
  });

  const createSession = trpc.chat.createSession.useMutation();
  const sendMessage = trpc.chat.sendMessage.useMutation();
  const convertToLead = trpc.chat.convertToLead.useMutation();

  useEffect(() => {
    let active = true;

    const initSession = async () => {
      try {
        const result = await createSession.mutateAsync();
        if (!active) return;
        setSessionId(result.sessionId);
        setStatus("ready");
      } catch (error) {
        if (!active) return;
        setStatus("error");
        toast.error("AI 助手连接失败，请确认主服务已启动");
        console.error("[YanmeiAI createSession]", error);
      }
    };

    initSession();
    return () => {
      active = false;
    };
  }, []);

  const statusMeta = useMemo(() => {
    switch (status) {
      case "ready":
        return {
          label: "AI 已就绪",
          tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
        };
      case "error":
        return {
          label: "连接失败",
          tone: "bg-rose-50 text-rose-700 border-rose-200",
        };
      default:
        return {
          label: "连接中",
          tone: "bg-stone-100 text-stone-600 border-stone-200",
        };
    }
  }, [status]);

  const handleSendMessage = async (content: string) => {
    if (!sessionId) {
      toast.error("会话尚未初始化，请稍后再试");
      return;
    }

    const userMessage: Message = { role: "user", content };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const result = await sendMessage.mutateAsync({
        sessionId,
        message: content,
      });

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.response },
      ]);

      if (result.extractedInfo) {
        setLeadForm((prev) => ({
          ...prev,
          name: result.extractedInfo?.name || prev.name,
          phone: result.extractedInfo?.phone || prev.phone,
          wechat: result.extractedInfo?.wechat || prev.wechat,
          budget: result.extractedInfo?.budget || prev.budget,
        }));
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "网络异常";
      setStatus("error");
      toast.error(`发送失败：${message}`);
      console.error("[YanmeiAI sendMessage]", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "抱歉，当前无法完成回复。请确认 Node 主服务已启动，并通过主应用的 tRPC 接口访问后再试。",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeadSubmit = async () => {
    if (!sessionId) {
      toast.error("会话尚未初始化");
      return;
    }
    if (!leadForm.name || !leadForm.phone) {
      toast.error("请先填写姓名和手机号");
      return;
    }

    try {
      const result = await convertToLead.mutateAsync({
        sessionId,
        name: leadForm.name,
        phone: leadForm.phone,
        wechat: leadForm.wechat || undefined,
        budget: leadForm.budget || undefined,
        source: "yanmei-ai",
      });

      if (result.success) {
        toast.success("预约信息已提交，顾问会尽快联系您");
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `已为您提交预约：${leadForm.name}，手机号 ${leadForm.phone}。顾问将尽快与您联系确认面诊时间。`,
          },
        ]);
      } else {
        toast.error(result.error || "预约提交失败");
      }
    } catch (error) {
      toast.error("预约提交失败，请稍后重试");
      console.error("[YanmeiAI convertToLead]", error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-[linear-gradient(180deg,rgba(184,166,141,0.12),rgba(250,249,247,0.85))]">
        <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/80 px-4 py-1.5 text-xs tracking-[0.25em] text-primary shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                YANMEI AI EXPERIENCE
              </div>
              <h1 className="font-serif text-4xl leading-tight text-foreground lg:text-5xl">
                妍美 AI 顾问
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
                现在直接使用主工程的聊天、留资和预约接口，不再走旧版静态页。界面、配色和交互都与主站保持同一套视觉系统。
              </p>
            </div>

            <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${statusMeta.tone}`}>
              {status === "connecting" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : status === "ready" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
              {statusMeta.label}
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <FeatureCard
              icon={<Stethoscope className="h-5 w-5 text-primary" />}
              title="智能方案建议"
              description="基于当前聊天路由和知识库能力，给出更贴近医美咨询场景的回答。"
            />
            <FeatureCard
              icon={<ShieldCheck className="h-5 w-5 text-primary" />}
              title="统一视觉体系"
              description="页面改为主工程 React UI，沿用当前品牌色和统一组件风格。"
            />
            <FeatureCard
              icon={<CalendarDays className="h-5 w-5 text-primary" />}
              title="直接预约留资"
              description="在同一页面里完成咨询和预约，避免旧版静态页的断链问题。"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)] lg:px-8">
        <Card className="border-primary/10 bg-card/90 shadow-sm backdrop-blur">
          <CardHeader className="border-b border-border/60">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Bot className="h-5 w-5 text-primary" />
              智能咨询对话
            </CardTitle>
            <CardDescription>
              直接连接当前主工程 chat router。推荐先试试下面这些问题。
            </CardDescription>
            <div className="mt-3 flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <Button
                  key={prompt}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleSendMessage(prompt)}
                  disabled={status !== "ready" || isLoading}
                  className="rounded-full border-primary/20 bg-white/70 text-stone-700 hover:bg-primary hover:text-white"
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <AIChatBox
              messages={messages}
              onSendMessage={(content) => {
                void handleSendMessage(content);
              }}
              isLoading={isLoading}
              height="720px"
              placeholder="请输入您的问题，例如：我适合做什么项目？"
              emptyStateMessage="开始和妍美 AI 顾问对话"
              suggestedPrompts={quickPrompts}
              className="rounded-none border-0 shadow-none"
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-primary/10 bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">快速预约</CardTitle>
              <CardDescription>
                留下联系方式后，顾问将尽快和您确认面诊时间。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="yanmei-name">姓名</Label>
                <Input
                  id="yanmei-name"
                  value={leadForm.name}
                  onChange={(e) =>
                    setLeadForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="请输入您的姓名"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yanmei-phone">手机号</Label>
                <Input
                  id="yanmei-phone"
                  value={leadForm.phone}
                  onChange={(e) =>
                    setLeadForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="请输入手机号"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yanmei-wechat">微信号</Label>
                <Input
                  id="yanmei-wechat"
                  value={leadForm.wechat}
                  onChange={(e) =>
                    setLeadForm((prev) => ({ ...prev, wechat: e.target.value }))
                  }
                  placeholder="方便后续联系"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yanmei-budget">预算区间</Label>
                <Input
                  id="yanmei-budget"
                  value={leadForm.budget}
                  onChange={(e) =>
                    setLeadForm((prev) => ({ ...prev, budget: e.target.value }))
                  }
                  placeholder="例如：5000-10000"
                />
              </div>

              <Button
                type="button"
                onClick={() => void handleLeadSubmit()}
                disabled={convertToLead.isPending || !leadForm.name || !leadForm.phone}
                className="w-full"
              >
                {convertToLead.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    立即预约免费面诊
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-primary/10 bg-[linear-gradient(135deg,rgba(184,166,141,0.12),rgba(255,255,255,0.92))] shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">本次修复点</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <FixItem text="移除旧版 iframe 静态页入口，改走 React 主界面" />
              <FixItem text="直接连接主工程 chat / convertToLead 接口" />
              <FixItem text="使用统一品牌色和现有设计 token" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="border-primary/10 bg-white/75 shadow-sm backdrop-blur">
      <CardContent className="flex items-start gap-3 p-5">
        <div className="rounded-full bg-primary/10 p-2">{icon}</div>
        <div>
          <h3 className="font-medium text-foreground">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function FixItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
      <span>{text}</span>
    </div>
  );
}
