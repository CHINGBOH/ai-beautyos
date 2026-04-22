import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { nanoid } from 'nanoid';
import type { ChatMessage, ChatHistoryItem } from '@shared/api-types';

export type { ChatMessage };

/**
 * AI聊天Hook (tRPC版本)
 * 从REST API迁移到tRPC，提供类型安全的API调用
 */
export function useAIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // 使用nanoid生成标准会话ID
  const sessionId = useMemo(() => nanoid(), []);
  
  // tRPC mutations
  const createSessionMutation = trpc.chat.createSession.useMutation();
  const sendMessageMutation = trpc.chat.sendMessage.useMutation();

  // 初始化欢迎消息
  const initWelcome = useCallback(() => {
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      role: 'assistant',
      content: '您好！我是LUMIÈRE智能医美顾问 🤖\n\n我可以帮您：\n• 了解各种医美项目\n• 获取价格和疗程信息\n• 预约免费面诊\n\n请问有什么可以帮您？',
      timestamp: new Date(),
      type: 'text',
    };
    setMessages([welcomeMessage]);
  }, []);

  // 生成唯一ID
  const generateId = () => Math.random().toString(36).substring(2, 11);

  // 发送消息
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    // 添加用户消息
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
      type: 'text',
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // 添加加载中的消息
    const loadingId = generateId();
    setMessages(prev => [...prev, {
      id: loadingId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      type: 'loading',
    }]);

    try {
      // 统一使用tRPC接口，避免与Python Agent冲突
      const result = await sendMessageMutation.mutateAsync({
        sessionId,
        message: content.trim(),
      });

      // 移除加载消息，添加AI回复
      setMessages(prev => [
        ...prev.filter(m => m.id !== loadingId),
        {
          id: generateId(),
          role: 'assistant',
          content: result.response || '抱歉，我没有理解您的问题，请重新描述一下。',
          timestamp: new Date(),
          type: 'text',
        },
      ]);
    } catch (error) {
      // 移除加载消息
      setMessages(prev => prev.filter(m => m.id !== loadingId));

      const reason = error instanceof Error ? error.message : String(error);
      toast.error(reason.slice(0, 160));
      console.error('AI chat error:', error);

      // 把真实失败原因写进对话里，避免只有一句「遇到了一些问题」无法排查
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: `暂时无法回复。\n\n【原因】${reason}\n\n【常见修复】用 Node 启动整个落地页（含 Express 的 tsx watch），不要只跑 client 里纯 Vite；并启动 backend 的 uvicorn（8000）或配置 DEEPSEEK_API_KEY。也可点「快速预约」。`,
        timestamp: new Date(),
        type: 'text',
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, isLoading, sendMessageMutation]);

  // 快速预约 - 当AI检测到预约意向时
  const suggestAppointment = useCallback(() => {
    setMessages(prev => [...prev, {
      id: generateId(),
      role: 'assistant',
      content: '看起来您对我们的服务很感兴趣！我可以帮您快速预约：',
      timestamp: new Date(),
      type: 'appointment-form',
    }]);
  }, []);

  // 清空对话
  const clearChat = useCallback(() => {
    setMessages([]);
    initWelcome();
  }, [initWelcome]);

  return {
    messages,
    isLoading,
    sendMessage,
    suggestAppointment,
    clearChat,
    initWelcome,
    sessionId,
  };
}
