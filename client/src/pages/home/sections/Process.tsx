import { motion } from "framer-motion";
import { FadeIn } from "../animation";

export function Process() {
  const steps = [
    { step: "01", title: "免费面诊", desc: "AI + 专家双诊断，定制专属方案" },
    { step: "02", title: "方案确认", desc: "3D模拟效果，明明白白消费" },
    { step: "03", title: "专业治疗", desc: "三甲医院医师，安全有保障" },
    { step: "04", title: "术后护理", desc: "终身跟踪服务，效果持久" },
  ];

  return (
    <section className="py-20 lg:py-28 px-6 lg:px-16 bg-[#FAF9F7]">
      <div className="max-w-6xl mx-auto">
        <FadeIn>
          <div className="text-center mb-16">
            <p className="text-[#B8A68D] text-xs tracking-[0.3em] uppercase mb-2">
              Process
            </p>
            <h2 className="text-3xl lg:text-4xl font-light text-stone-900 mb-4">
              服务流程
            </h2>
            <p className="text-stone-500 max-w-xl mx-auto">
              四步开启您的美丽之旅，每一步都有专业团队保驾护航
            </p>
          </div>
        </FadeIn>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((item, index) => (
            <FadeIn key={item.step} delay={index * 0.15}>
              <div className="relative text-center">
                {/* 步骤圆圈 */}
                <div className="relative inline-flex items-center justify-center w-16 h-16 mb-6">
                  <div className="absolute inset-0 rounded-full bg-stone-100" />
                  <div className="absolute inset-2 rounded-full bg-white shadow-sm" />
                  <span className="relative text-lg font-light text-stone-900">
                    {item.step}
                  </span>

                  {/* 连接线 */}
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 left-full w-full h-px bg-stone-200">
                      <motion.div
                        initial={{ scaleX: 0 }}
                        whileInView={{ scaleX: 1 }}
                        transition={{ duration: 0.8, delay: index * 0.2 + 0.5 }}
                        className="h-full bg-stone-300 origin-left"
                        viewport={{ once: true }}
                      />
                    </div>
                  )}
                </div>

                <h3 className="text-lg font-medium text-stone-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-stone-500 text-sm leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
