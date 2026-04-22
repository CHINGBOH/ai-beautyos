import { useState, useCallback } from 'react';
import { landingApi } from '@/lib/api';
import { toast } from 'sonner';

export type ChatStep = 'name' | 'phone' | 'service' | 'confirm' | 'success';

export interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
}

export interface AppointmentForm {
  name: string;
  phone: string;
  service_type: string;
}

const serviceNames: Record<string, string> = {
  skin: '皮肤管理',
  injection: '注射美容',
  laser: '光电项目',
  antiaging: '抗衰紧致',
  body: '形体管理',
};

export function useAppointmentChat(defaultService?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const initialMessages: ChatMessage[] = [
      {
        id: 'welcome',
        role: 'assistant',
        content: '您好！我是LUMIÈRE智能预约助手 🤖\n\n请问怎么称呼您？',
        timestamp: new Date(),
      },
    ];
    return initialMessages;
  });
  
  const [step, setStep] = useState<ChatStep>('name');
  const [form, setForm] = useState<AppointmentForm>({
    name: '',
    phone: '',
    service_type: defaultService || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [leadId, setLeadId] = useState<string>('');

  // 生成唯一ID
  const generateId = () => Math.random().toString(36).substring(2, 9);

  // 添加用户消息
  const addUserMessage = useCallback((content: string) => {
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);

    // 根据当前步骤处理
    switch (step) {
      case 'name':
        handleNameStep(content);
        break;
      case 'phone':
        handlePhoneStep(content);
        break;
      default:
        break;
    }
  }, [step, form]);

  // 智能提取姓名 - 处理各种用户表达
  const extractName = (input: string): { name: string; title?: string; isSurname?: boolean } => {
    const trimmed = input.trim();
    if (!trimmed) return { name: '' };

    // 1. 处理 "我姓X" / "姓X" - 提取姓氏，需要用中性尊称"老师"
    const surnameMatch = trimmed.match(/^(?:我)?姓([^\s\d]+)$/);
    if (surnameMatch && surnameMatch[1]) {
      return { name: surnameMatch[1], title: '老师', isSurname: true };
    }

    // 2. 处理 "我叫X" - 提取名字
    const callMeMatch = trimmed.match(/^我叫([^\s\d]+)$/);
    if (callMeMatch && callMeMatch[1]) {
      return { name: callMeMatch[1] };
    }

    // 3. 处理 "X女士/X先生/X医生" 等 - 分离姓名和称呼
    const titles = ['女士', '先生', '太太', '夫人', '医生', '护士', '老师', '总', '经理', '姐', '哥'];
    for (const title of titles) {
      if (trimmed.endsWith(title)) {
        const name = trimmed.slice(0, -title.length).trim();
        if (name) {
          return { name, title };
        }
      }
    }

    // 4. 直接返回
    return { name: trimmed };
  };

  // 处理姓名步骤
  const handleNameStep = (input: string) => {
    const extracted = extractName(input);
    const name = extracted.name;

    if (!name) {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: generateId(),
          role: 'assistant',
          content: '姓名不能为空哦，请告诉我您的称呼 😊',
          timestamp: new Date(),
        }]);
      }, 500);
      return;
    }

    setForm(prev => ({ ...prev, name }));

    // 生成回复 - 如果是姓氏用"老师"尊称，否则用原称呼
    let reply = '';
    if (extracted.title) {
      // 如果是"我姓X"情况，优先用姓氏+老师
      if (extracted.isSurname) {
        reply = `很高兴为您服务，${name}老师！\n\n请留下您的手机号码，我们的美学顾问会在24小时内联系您 ✨`;
      } else {
        // 完整称呼，如"张女士"、"李先生"
        reply = `很高兴为您服务，${name}${extracted.title}！\n\n请留下您的手机号码，我们的美学顾问会在24小时内联系您 ✨`;
      }
    } else {
      reply = `很高兴为您服务，${name}！\n\n请留下您的手机号码，我们的美学顾问会在24小时内联系您 ✨`;
    }

    setStep('phone');

    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      }]);
    }, 500);
  };

  // 处理手机号步骤
  const handlePhoneStep = (phone: string) => {
    const trimmed = phone.trim();
    const phoneRegex = /^1[3-9]\d{9}$/;
    
    if (!phoneRegex.test(trimmed)) {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: generateId(),
          role: 'assistant',
          content: '手机号格式不正确，请输入11位手机号 📱',
          timestamp: new Date(),
        }]);
      }, 500);
      return;
    }

    setForm(prev => ({ ...prev, phone: trimmed }));
    setStep('service');

    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: '已记录！\n\n您对哪类服务比较感兴趣呢？（选填）',
        timestamp: new Date(),
      }]);
    }, 500);
  };

  // 选择服务 - 修复依赖数组
  const selectService = useCallback((serviceValue: string) => {
    const serviceName = serviceValue ? serviceNames[serviceValue] : '暂无';
    
    // 先更新消息
    setMessages(prev => [
      ...prev,
      {
        id: generateId(),
        role: 'user',
        content: serviceName,
        timestamp: new Date(),
      },
      {
        id: generateId(),
        role: 'assistant',
        content: '感谢您的选择！请确认预约信息 👇',
        timestamp: new Date(),
      },
    ]);
    
    // 同时更新表单和步骤
    setForm(prev => ({ ...prev, service_type: serviceValue }));
    setStep('confirm');
  }, [setForm, setStep, setMessages]);

  // 提交预约
  const submitAppointment = useCallback(async () => {
    setIsSubmitting(true);
    
    try {
      const result = await landingApi.createAppointment({
        name: form.name,
        phone: form.phone,
        service_type: form.service_type || undefined,
      });

      if (result.success) {
        setLeadId(result.lead_id || '');
        setIsComplete(true);
        setStep('success');
        toast.success('预约成功！');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '预约失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  }, [form]);

  // 重置
  const reset = useCallback(() => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: '您好！我是LUMIÈRE智能预约助手 🤖\n\n请问怎么称呼您？',
        timestamp: new Date(),
      },
    ]);
    setStep('name');
    setForm({ name: '', phone: '', service_type: defaultService || '' });
    setIsComplete(false);
    setLeadId('');
  }, [defaultService]);

  return {
    messages,
    step,
    form,
    isSubmitting,
    isComplete,
    leadId,
    addUserMessage,
    selectService,
    submitAppointment,
    reset,
  };
}
