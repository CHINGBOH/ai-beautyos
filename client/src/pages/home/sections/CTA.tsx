import { motion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { landingApi } from "@/lib/api";
import { FadeIn } from "../animation";

export function CTA() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    service_type: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // 前端校验
    if (!formData.name.trim()) {
      toast.error("请输入您的姓名");
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      toast.error("请输入正确的11位手机号");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await landingApi.createAppointment({
        name: formData.name,
        phone: formData.phone,
        service_type: formData.service_type || undefined,
      });

      if (result.success) {
        toast.success(result.message);
        setFormData({ name: "", phone: "", service_type: "" });
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "提交失败，请稍后重试"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      id="cta"
      className="py-24 lg:py-32 px-6 lg:px-16 bg-[#FBF8F3] relative overflow-hidden"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-[#DED2C4]" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-[#DED2C4]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(111,88,71,0.04)_1px,transparent_1px),linear-gradient(180deg,rgba(111,88,71,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <FadeIn>
          <p className="text-[#B8A68D] text-xs tracking-[0.3em] uppercase mb-4">
            Limited Consultation
          </p>
          <h2 className="text-4xl lg:text-6xl font-light text-stone-900 mb-4">
            最好的投资，<span className="text-stone-400">是投资自己</span>
          </h2>
          <p className="text-stone-500 mb-8 max-w-xl mx-auto">
            本月仅剩 <span className="text-[#B8A68D] font-medium">17</span>{" "}
            个免费面诊名额
          </p>

          {/* 预约表单 */}
          <form onSubmit={handleSubmit} className="max-w-md mx-auto mb-8">
            <div className="space-y-4">
              <input
                type="text"
                placeholder="您的姓名"
                value={formData.name}
                onChange={e =>
                  setFormData({ ...formData, name: e.target.value })
                }
                disabled={isSubmitting}
                className="w-full px-6 py-4 rounded-full bg-white border border-stone-200 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900/30 transition-all disabled:opacity-50"
              />
              <input
                type="tel"
                placeholder="手机号码"
                value={formData.phone}
                onChange={e =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                disabled={isSubmitting}
                className="w-full px-6 py-4 rounded-full bg-white border border-stone-200 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900/30 transition-all disabled:opacity-50"
              />
              <select
                value={formData.service_type}
                onChange={e =>
                  setFormData({ ...formData, service_type: e.target.value })
                }
                disabled={isSubmitting}
                className="w-full px-6 py-4 rounded-full bg-white border border-stone-200 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900/30 transition-all disabled:opacity-50 appearance-none cursor-pointer"
              >
                <option value="">选择感兴趣的服务（选填）</option>
                <option value="skin">皮肤管理</option>
                <option value="injection">注射美容</option>
                <option value="laser">光电项目</option>
                <option value="antiaging">抗衰紧致</option>
                <option value="body">形体管理</option>
              </select>
              <motion.div
                whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
              >
                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting}
                  className="w-full bg-[#B8A68D] hover:bg-[#A69479] text-white px-10 py-6 text-base rounded-full group shadow-xl shadow-[#B8A68D]/20 disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                      提交中...
                    </>
                  ) : (
                    <>
                      抢占名额
                      <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </motion.div>
            </div>
          </form>

          <p className="text-xs text-stone-400 mb-4">
            咨询完全免费 · 无任何隐形消费 · 7天无理由退款
          </p>
          <p className="text-xs text-stone-300">
            提交即表示您同意我们的隐私政策，您的信息将被严格保密
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
