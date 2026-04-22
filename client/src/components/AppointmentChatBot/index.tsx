import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Bot, Calendar, X, Send, User, Sparkles, Loader2, Phone, MessageSquare, Clock, Gift } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Streamdown } from 'streamdown';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type ChatMode = 'ai' | 'form';
type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type AppointmentStage = 'greeting' | 'needs' | 'recommendation' | 'contact' | 'appointment' | 'confirmation';

interface CustomerInfo {
  name: string;
  phone: string;
  wechat: string;
  preferredTime: string;
  interestedServices: string[];
  budget: string;
  concerns: string;
  previousTreatment: string;
  urgency: 'low' | 'medium' | 'high';
}

interface AppointmentChatBotProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'sheet' | 'floating';
  defaultService?: string;
  title?: string;
  defaultMode?: ChatMode;
  enableResize?: boolean;
  enableDrag?: boolean;
}

export function AppointmentChatBot({
  open,
  onOpenChange,
  mode = 'sheet',
  title = '预约咨询',
  defaultMode = 'ai',
  defaultService,
}: AppointmentChatBotProps) {
  const [chatMode, setChatMode] = useState<ChatMode>(defaultMode);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [appointmentStage, setAppointmentStage] = useState<AppointmentStage>('greeting');
  const [showContactForm, setShowContactForm] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    phone: '',
    wechat: '',
    preferredTime: '',
    interestedServices: defaultService ? [defaultService] : [],
    budget: '',
    concerns: '',
    previousTreatment: '',
    urgency: 'medium'
  });
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const createSession = trpc.chat.createSession.useMutation();
  const sendMessage = trpc.chat.sendMessage.useMutation();
  const convertToLead = trpc.chat.convertToLead.useMutation();

  // 初始化会话
  useEffect(() => {
    if (open && chatMode === 'ai' && !sessionId) {
      const initSession = async () => {
        try {
          const result = await createSession.mutateAsync();
          setSessionId(result.sessionId);
          const welcomeMessage = defaultService 
            ? `您好！我是LUMIÈRE专属预约顾问小美 😊\n\n看到您对【${defaultService}】项目感兴趣！我是专门负责预约和咨询的，有10年医美行业经验~\n\n为了给您最专业的建议，请问您：\n🌟 主要想改善什么皮肤问题呢？\n🌟 之前有做过医美项目吗？\n\n我会根据您的情况，安排我们最适合的专家为您面诊 💝`
            : '您好！我是LUMIÈRE专属预约顾问小美 😊\n\n我专门负责为客户安排面诊预约，有10年医美行业经验！\n\n🎯 **今日限时**：预约面诊可享受专家一对一分析+3D效果预览\n\n请问您主要想改善什么问题呢？我来为您推荐最适合的专家和方案~';
          
          setMessages([{
            role: 'assistant',
            content: welcomeMessage
          }]);
          setAppointmentStage('needs');
        } catch (error) {
          toast.error('连接AI助手失败，请重试');
          console.error('Failed to create session:', error);
        }
      };
      initSession();
    }
  }, [open, chatMode, sessionId]);

  // 检测是否应该收集联系方式的关键词
  const shouldTriggerContact = (message: string) => {
    const triggers = [
      '价格', '多少钱', '费用', '优惠', '活动',
      '预约', '面诊', '到店', '时间',
      '效果怎么样', '案例', '想做', '考虑',
      '专家', '医生', '方案'
    ];
    return triggers.some(trigger => message.includes(trigger));
  };

  // 提取客户信息
  const extractContactInfo = (response: string) => {
    // 检查AI回复中的JSON标记
    const nameMatch = response.match(/\{"name":\s*"([^"]+)"\}/);
    const phoneMatch = response.match(/\{"phone":\s*"([^"]+)"\}/);
    const wechatMatch = response.match(/\{"wechat":\s*"([^"]+)"\}/);
    const servicesMatch = response.match(/\{"services":\s*\[([^\]]+)\]\}/);
    const budgetMatch = response.match(/\{"budget":\s*"([^"]+)"\}/);
    
    if (nameMatch || phoneMatch || wechatMatch) {
      setCustomerInfo(prev => ({
        ...prev,
        name: nameMatch ? nameMatch[1] : prev.name,
        phone: phoneMatch ? phoneMatch[1] : prev.phone,
        wechat: wechatMatch ? wechatMatch[1] : prev.wechat,
        interestedServices: servicesMatch 
          ? servicesMatch[1].split(',').map(s => s.trim().replace(/"/g, ''))
          : prev.interestedServices,
        budget: budgetMatch ? budgetMatch[1] : prev.budget
      }));
    }
  };
  // 自动滚动到底部
  const scrollToBottom = () => {
    const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement;
    if (viewport) {
      requestAnimationFrame(() => {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: 'smooth'
        });
      });
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !sessionId || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    // 检查是否应该触发联系方式收集
    const shouldCollectContact = shouldTriggerContact(userMessage);

    try {
      // 发送销售导向的消息
      const salesPrompt = `你是LUMIÈRE医美机构的专业预约顾问。你的目标是获取客户联系方式并促成到店预约。

当前对话阶段：${appointmentStage}
客户已提供信息：姓名(${customerInfo.name || '未知'})，电话(${customerInfo.phone || '未收集'})，微信(${customerInfo.wechat || '未收集'})

请根据客户回复，采用以下策略：
1. 如客户表现出兴趣，主动询问姓名并建立亲近感
2. 在推荐方案后，自然地要求留联系方式安排专家面诊
3. 强调今日预约的特殊优惠和限时性
4. 如客户犹豫，使用异议处理话术消除顾虑
5. 营造专业可信的形象，降低客户戒备心

客户消息：${userMessage}`;

      const result = await sendMessage.mutateAsync({
        sessionId,
        message: salesPrompt,
      });

      // 提取客户信息
      extractContactInfo(result.response);

      // 清理AI回复中的JSON标记
      const cleanResponse = result.response
        .replace(/\{[^}]*"(name|phone|wechat|services|budget)"[^}]*\}/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      setMessages(prev => [...prev, { role: 'assistant', content: cleanResponse }]);

      // 更新对话阶段
      if (customerInfo.name && customerInfo.phone) {
        setAppointmentStage('appointment');
      } else if (shouldCollectContact || appointmentStage === 'needs') {
        setAppointmentStage('contact');
        // 如果还没有联系方式且客户表现出强烈兴趣，显示快速表单
        if (!customerInfo.phone && (userMessage.includes('预约') || userMessage.includes('想做'))) {
          setTimeout(() => setShowContactForm(true), 2000);
        }
      }

    } catch (error: any) {
      const msg = error?.message || '网络异常';
      const isBalanceError = /余额不足|Insufficient Balance|402/i.test(msg);
      
      toast.error(isBalanceError ? 'AI服务暂不可用' : '发送失败，请重试');
      
      const fallbackContent = isBalanceError 
        ? '抱歉，AI顾问暂时无法回复。不过我可以直接为您安排预约！请点击下方表单留下联系方式，专业顾问会尽快联系您 📞'
        : '抱歉，暂时无法回复。请切换到表单模式完成预约，或稍后重试。';
        
      setMessages(prev => [...prev, { role: 'assistant', content: fallbackContent }]);
      if (isBalanceError) {
        setShowContactForm(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 处理预约提交
  const handleAppointmentSubmit = async () => {
    if (!customerInfo.name || !customerInfo.phone) {
      toast.error('请填写姓名和手机号');
      return;
    }

    try {
      const result = await convertToLead.mutateAsync({
        sessionId,
        name: customerInfo.name,
        phone: customerInfo.phone,
        wechat: customerInfo.wechat,
        interestedServices: customerInfo.interestedServices,
        budget: customerInfo.budget,
        message: `预约时间：${customerInfo.preferredTime}\n主要关注：${customerInfo.concerns}\n既往治疗：${customerInfo.previousTreatment}\n紧急程度：${customerInfo.urgency}`,
      });

      if (result.success) {
        setAppointmentStage('confirmation');
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `🎉 预约信息已成功提交！\n\n**预约详情**\n• 姓名：${customerInfo.name}\n• 手机：${customerInfo.phone}\n• 项目：${customerInfo.interestedServices.join('、') || '待面诊确定'}\n• 时间：${customerInfo.preferredTime || '待协商'}\n\n👩‍⚕️ **下一步**：\n1. 我们的专业顾问将在15分钟内与您电话联系\n2. 确认面诊时间和具体项目\n3. 发送详细的预约确认信息\n\n请保持手机畅通，期待与您见面！💖`
        }]);
        setShowContactForm(false);
        setChatMode('ai');
        toast.success('预约提交成功！专业顾问将尽快联系您');
      } else {
        toast.error(result.error || '提交失败，请重试');
      }
    } catch (error) {
      toast.error('提交失败，请棄查网络连接');
      console.error('Appointment submission failed:', error);
    }
  };

  // 快速联系表单
  const QuickContactForm = () => (
    <div className="bg-gradient-to-br from-[#F8F6F3] to-[#F1EDE8] p-4 rounded-lg border border-[#E8E2DB] mx-4 my-2">
      <div className="flex items-center gap-2 mb-3">
        <Gift className="w-4 h-4 text-[#B8A68D]" />
        <span className="text-sm font-medium text-stone-700">今日限时优惠：免费专家面诊</span>
      </div>
      
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="您的姓名"
            value={customerInfo.name}
            onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
            className="text-sm h-9"
          />
          <Input
            placeholder="手机号"
            value={customerInfo.phone}
            onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
            className="text-sm h-9"
          />
        </div>
        
        <Input
          placeholder="微信号（可选）"
          value={customerInfo.wechat}
          onChange={(e) => setCustomerInfo(prev => ({ ...prev, wechat: e.target.value }))}
          className="text-sm h-9"
        />
        
        <div className="flex gap-2">
          <Button
            onClick={handleAppointmentSubmit}
            disabled={!customerInfo.name || !customerInfo.phone || convertToLead.isPending}
            className="flex-1 h-9 bg-[#B8A68D] hover:bg-[#A69479] text-white text-sm"
          >
            {convertToLead.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Phone className="w-4 h-4 mr-1" />
                立即预约
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowContactForm(false)}
            className="h-9 text-sm"
          >
            继续聊天
          </Button>
        </div>
      </div>
      
      <p className="text-xs text-stone-500 text-center mt-2">
        提交后15分钟内专业顾问联系您，确认面诊时间
      </p>
    </div>
  );

  const renderChatBody = () => (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-stone-100 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#B8A68D] flex items-center justify-center">
            {chatMode === 'ai' ? <Bot className="w-5 h-5 text-white" /> : <Calendar className="w-5 h-5 text-white" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-stone-900">{title}</h3>
            </div>
            <p className="text-xs text-stone-500">
              {chatMode === 'ai' ? (
                appointmentStage === 'confirmation' ? '预约已成功' :
                appointmentStage === 'contact' ? '正在收集联系方式' :
                appointmentStage === 'appointment' ? '准备预约' :
                'LUMIÈRE 智能医美顾问'
              ) : '快速预约通道'}
              {customerInfo.name && (
                <span className="ml-2">• {customerInfo.name}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setChatMode(chatMode === 'ai' ? 'form' : 'ai')}
            className="p-2 hover:bg-stone-100 rounded-full transition-colors text-xs text-stone-600"
          >
            切换模式
          </button>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 hover:bg-stone-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-stone-500" />
          </button>
        </div>
      </div>

      {chatMode === 'ai' ? (
        <>
          {/* AI聊天区域 */}
          <div ref={scrollAreaRef} className="flex-1 overflow-hidden">
            {messages.length === 0 && !sessionId ? (
              <div className="flex h-full items-center justify-center p-4">
                <div className="text-center text-stone-500">
                  <Bot className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">正在启动AI助手...</p>
                </div>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="space-y-4 p-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex gap-3 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-[#B8A68D]/10 flex items-center justify-center mt-1 flex-shrink-0">
                          <Sparkles className="w-4 h-4 text-[#B8A68D]" />
                        </div>
                      )}
                      
                      <div
                        className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm ${
                          message.role === 'user'
                            ? 'bg-[#B8A68D] text-white'
                            : 'bg-stone-100 text-stone-900'
                        }`}
                      >
                        {message.role === 'assistant' ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <Streamdown>{message.content}</Streamdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        )}
                      </div>

                      {message.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center mt-1 flex-shrink-0">
                          <User className="w-4 h-4 text-stone-600" />
                        </div>
                      )}
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex gap-3 justify-start">
                      <div className="w-8 h-8 rounded-full bg-[#B8A68D]/10 flex items-center justify-center mt-1 flex-shrink-0">
                        <Sparkles className="w-4 h-4 text-[#B8A68D]" />
                      </div>
                      <div className="rounded-xl bg-stone-100 px-4 py-2.5">
                        <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
                      </div>
                    </div>
                  )}
                  
                  {/* 显示快速联系表单 */}
                  {showContactForm && <QuickContactForm />}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* AI聊天输入区域 */}
          <div className="p-4 border-t border-stone-100 bg-white">
            {/* 预约快捷操作 */}
            {appointmentStage === 'contact' && !showContactForm && customerInfo.name && !customerInfo.phone && (
              <div className="mb-3">
                <Button
                  variant="outline"
                  onClick={() => setShowContactForm(true)}
                  className="w-full h-10 border-[#B8A68D] text-[#B8A68D] hover:bg-[#B8A68D] hover:text-white"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  立即预约免费面诊
                </Button>
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="输入您的问题..."
                disabled={!sessionId || isLoading}
                className="flex-1 px-4 py-2.5 rounded-full bg-stone-100 border-0 text-sm focus:outline-none focus:ring-2 focus:ring-[#B8A68D]/20 disabled:opacity-50"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim() || !sessionId || isLoading}
                className="rounded-full bg-[#B8A68D] hover:bg-stone-800 disabled:opacity-50 h-[42px] w-[42px]"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-stone-400 text-center mt-2">
              {appointmentStage === 'confirmation' 
                ? '预约已成功，专业顾问将尽快联系您'
                : 'AI助手提供的信息仅供参考，具体治疗方案请面诊后确定'
              }
            </p>
          </div>
        </>
      ) : (
        /* 完整预约表单区域 */
        <div className="flex-1 p-4 overflow-auto">
          <div className="space-y-4 max-w-md mx-auto">
            <div className="text-center mb-6">
              <Calendar className="w-12 h-12 text-[#B8A68D] mx-auto mb-3" />
              <h3 className="font-semibold text-stone-900">LUMIÈRE 专家预约</h3>
              <p className="text-sm text-stone-600 mt-1">填写信息，免费获得专业面诊</p>
            </div>

            {/* 预约表单 */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium">姓名 *</Label>
                  <Input
                    id="name"
                    placeholder="请输入您的姓名"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-sm font-medium">手机号 *</Label>
                  <Input
                    id="phone"
                    placeholder="手机号码"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="wechat" className="text-sm font-medium">微信号</Label>
                <Input
                  id="wechat"
                  placeholder="微信号（方便后续沟通）"
                  value={customerInfo.wechat}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, wechat: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="services" className="text-sm font-medium">感兴趣的项目</Label>
                <Select
                  value={customerInfo.interestedServices[0] || ''}
                  onValueChange={(value) => setCustomerInfo(prev => ({ ...prev, interestedServices: [value] }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="选择感兴趣的项目" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="超皮秒">超皮秒祖斑</SelectItem>
                    <SelectItem value="水光针">水光针嫩肤</SelectItem>
                    <SelectItem value="热玛吉">热玛吉紧致</SelectItem>
                    <SelectItem value="线雕">线雕提升</SelectItem>
                    <SelectItem value="填充">玻尿酸填充</SelectItem>
                    <SelectItem value="其他">其他项目</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="time" className="text-sm font-medium">预约时间</Label>
                <Select
                  value={customerInfo.preferredTime}
                  onValueChange={(value) => setCustomerInfo(prev => ({ ...prev, preferredTime: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="选择方便的时间" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="上午 9:00-12:00">上午 9:00-12:00</SelectItem>
                    <SelectItem value="下午 14:00-17:00">下午 14:00-17:00</SelectItem>
                    <SelectItem value="晚上 18:00-20:00">晚上 18:00-20:00</SelectItem>
                    <SelectItem value="周末全天">周末全天</SelectItem>
                    <SelectItem value="电话协商">电话协商</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="concerns" className="text-sm font-medium">主要关注问题</Label>
                <Textarea
                  id="concerns"
                  placeholder="请描述您的皮肤问题或期望效果..."
                  value={customerInfo.concerns}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, concerns: e.target.value }))}
                  className="mt-1 h-20 resize-none"
                />
              </div>

              <div>
                <Label htmlFor="budget" className="text-sm font-medium">预算区间</Label>
                <Select
                  value={customerInfo.budget}
                  onValueChange={(value) => setCustomerInfo(prev => ({ ...prev, budget: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="选择预算区间" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3000以下">3000以下</SelectItem>
                    <SelectItem value="3000-8000">3000-8000</SelectItem>
                    <SelectItem value="8000-15000">8000-15000</SelectItem>
                    <SelectItem value="15000-30000">15000-30000</SelectItem>
                    <SelectItem value="30000以上">30000以上</SelectItem>
                    <SelectItem value="面诊确定">面诊确定</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleAppointmentSubmit}
                disabled={!customerInfo.name || !customerInfo.phone || convertToLead.isPending}
                className="w-full h-12 bg-[#B8A68D] hover:bg-[#A69479] text-white font-medium text-base rounded-xl"
              >
                {convertToLead.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Phone className="w-5 h-5 mr-2" />
                )}
                {convertToLead.isPending ? '提交中...' : '立即预约免费面诊'}
              </Button>

              <p className="text-xs text-stone-500 text-center leading-relaxed">
                点击预约表示同意《隐私政策》和《服务条款》<br/>
                提交后15分钟内专业顾问将与您电话联系
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          {renderChatBody()}
        </SheetContent>
      </Sheet>
  );
}
