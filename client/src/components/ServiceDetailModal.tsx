import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, DollarSign, AlertCircle, CheckCircle, Sparkles, Shield, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { landingApi } from '@/lib/api';
import { toast } from 'sonner';
import { AppointmentChatBot } from './AppointmentChatBot';

interface ServiceDetailModalProps {
  serviceId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ServiceDetailModal({ serviceId, isOpen, onClose }: ServiceDetailModalProps) {
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (serviceId && isOpen) {
      setLoading(true);
      landingApi.getServiceDetail(serviceId)
        .then(data => setService(data))
        .catch(err => {
          toast.error('加载服务详情失败');
          console.error(err);
        })
        .finally(() => setLoading(false));
    }
  }, [serviceId, isOpen]);

  // ESC 关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen || !serviceId) return null;

  const getPainLevelText = (level: number) => {
    if (level <= 2) return '轻微疼痛';
    if (level <= 4) return '轻度疼痛';
    if (level <= 6) return '中度疼痛';
    return '明显疼痛';
  };

  const getPainLevelColor = (level: number) => {
    if (level <= 2) return 'text-stone-400';
    if (level <= 4) return 'text-[#B8A68D]';
    if (level <= 6) return 'text-stone-600';
    return 'text-stone-800';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-stone-900/30 backdrop-blur-md"
          />

          {/* 弹窗内容 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl"
          >
            {loading ? (
              <div className="p-12 text-center">
                <div className="w-8 h-8 border-2 border-stone-300 border-t-[#B8A68D] rounded-full animate-spin mx-auto mb-4" />
                <p className="text-stone-500">加载中...</p>
              </div>
            ) : service ? (
              <>
                {/* 头部 */}
                <div className="sticky top-0 bg-white border-b border-stone-100 px-6 py-4 flex items-center justify-between z-10">
                  <div>
                    <h2 className="text-2xl font-light tracking-tight text-stone-900 font-serif">{service.name}</h2>
                    {service.fullName && (
                      <p className="text-sm text-stone-500 mt-1">{service.fullName}</p>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center hover:bg-[#B8A68D] hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5 text-stone-600" />
                  </button>
                </div>

                {/* 内容 */}
                <div className="p-6 space-y-8">
                  {/* 描述 */}
                  <p className="text-stone-600 leading-relaxed">{service.description}</p>

                  {/* 价格和时长 */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-stone-50 rounded-xl p-4 text-center">
                      <DollarSign className="w-5 h-5 text-[#B8A68D] mx-auto mb-2" />
                      <p className="text-sm text-stone-500 mb-1">价格</p>
                      <p className="text-lg font-medium text-stone-900">
                        ¥{service.priceMin.toLocaleString()}
                        {service.priceMax > service.priceMin && ` - ¥${service.priceMax.toLocaleString()}`}
                      </p>
                      <p className="text-xs text-stone-400">/{service.priceUnit}</p>
                    </div>
                    <div className="bg-stone-50 rounded-xl p-4 text-center">
                      <Clock className="w-5 h-5 text-[#B8A68D] mx-auto mb-2" />
                      <p className="text-sm text-stone-500 mb-1">治疗时长</p>
                      <p className="text-lg font-medium text-stone-900">{service.treatmentDuration}</p>
                    </div>
                    <div className="bg-stone-50 rounded-xl p-4 text-center">
                      <Shield className="w-5 h-5 text-[#B8A68D] mx-auto mb-2" />
                      <p className="text-sm text-stone-500 mb-1">恢复期</p>
                      <p className="text-lg font-medium text-stone-900">{service.recoveryTime}</p>
                    </div>
                  </div>

                  {/* 疼痛度 */}
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-stone-500">疼痛程度：</span>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                          <div
                            key={level}
                            className={`w-3 h-3 rounded-full ${
                              level <= service.painLevel
                                ? getPainLevelColor(service.painLevel)
                                : 'bg-stone-200'
                            }`}
                          />
                        ))}
                      </div>
                      <span className={`text-sm font-medium ${getPainLevelColor(service.painLevel)}`}>
                        {service.painLevel}/10 {getPainLevelText(service.painLevel)}
                      </span>
                    </div>
                  </div>

                  {/* 适应症 */}
                  <div>
                    <h3 className="text-sm font-medium text-stone-900 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-[#B8A68D]" />
                      适合人群
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {service.indications.map((item: string) => (
                        <span key={item} className="px-3 py-1 bg-stone-50 text-stone-600 text-sm rounded-full">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 禁忌症 */}
                  <div>
                    <h3 className="text-sm font-medium text-stone-900 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-stone-600" />
                      不适合人群
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {service.contraindications.map((item: string) => (
                        <span key={item} className="px-3 py-1 bg-stone-50 text-stone-600 text-sm rounded-full">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 效果 */}
                  <div>
                    <h3 className="text-sm font-medium text-stone-900 mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#B8A68D]" />
                      主要效果
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {service.effects.map((item: string) => (
                        <span key={item} className="px-3 py-1 bg-stone-50 text-stone-600 text-sm rounded-full">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 风险说明 */}
                  <div className="bg-stone-50 rounded-xl p-4">
                    <h3 className="text-sm font-medium text-stone-700 mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      可能风险
                    </h3>
                    <ul className="text-sm text-stone-600 space-y-1">
                      {service.risks.map((item: string) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>

                  {/* 术前术后护理 */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-stone-50 rounded-xl p-4">
                      <h3 className="text-sm font-medium text-stone-700 mb-2">术前准备</h3>
                      <p className="text-sm text-stone-600">{service.preCare}</p>
                    </div>
                    <div className="bg-stone-50 rounded-xl p-4">
                      <h3 className="text-sm font-medium text-stone-700 mb-2">术后护理</h3>
                      <p className="text-sm text-stone-600">{service.postCare}</p>
                    </div>
                  </div>

                  {/* 技术和设备 */}
                  {(service.technology || service.equipment) && (
                    <div className="border-t border-stone-100 pt-6">
                      <div className="grid md:grid-cols-2 gap-6 text-sm">
                        {service.technology && (
                          <div>
                            <span className="text-stone-500">使用技术：</span>
                            <span className="text-stone-900 ml-2">{service.technology}</span>
                          </div>
                        )}
                        {service.equipment && (
                          <div>
                            <span className="text-stone-500">使用设备：</span>
                            <span className="text-stone-900 ml-2">{service.equipment}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 推荐疗程 */}
                  {service.recommendedCourses && (
                    <div className="bg-stone-50 rounded-xl p-4">
                      <h3 className="text-sm font-medium text-stone-900 mb-2">推荐疗程</h3>
                      <p className="text-sm text-stone-600">{service.recommendedCourses}</p>
                    </div>
                  )}

                  {/* CTA */}
                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={() => {
                        onClose();
                        setChatOpen(true);
                      }}
                      className="flex-1 bg-[#B8A68D] text-white py-3 rounded-full font-medium hover:bg-[#A69479] transition-colors"
                    >
                      立即预约
                    </button>
                    <button
                      onClick={onClose}
                      className="px-6 py-3 border border-stone-300 rounded-full text-stone-600 hover:bg-stone-50 transition-colors"
                    >
                      关闭
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </motion.div>
        </div>
      )}
      
      {/* 预约聊天机器人 */}
      <AppointmentChatBot
        open={chatOpen}
        onOpenChange={setChatOpen}
        mode="sheet"
        defaultService={serviceId || undefined}
        title={service?.name ? `预约${service.name}` : '预约咨询'}
      />
    </AnimatePresence>
  );
}
