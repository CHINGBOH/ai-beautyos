import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { FadeIn } from "../animation";

export function WhyUs() {
  return (
    <section className="py-20 lg:py-28 px-6 lg:px-16 bg-[#F8F6F3]">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <FadeIn>
            <div className="relative isolate">
              <img
                src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80"
                alt="专业团队"
                className="rounded-2xl w-full h-80 lg:h-96 object-cover"
              />
              <div className="absolute -bottom-6 -right-6 w-48 h-48 bg-[#EFE7DA] rounded-2xl -z-10" />
              <div className="absolute -top-6 -left-6 w-32 h-32 bg-[#DED2C4] rounded-2xl -z-10" />
            </div>
          </FadeIn>

          <FadeIn delay={0.2}>
            <div className="space-y-8">
              <div>
                <p className="text-[#B8A68D] text-xs tracking-[0.3em] uppercase mb-2">
                  Why Choose Us
                </p>
                <h2 className="text-3xl lg:text-4xl font-light text-stone-900 mb-4">
                  为什么选择 LUMIÈRE
                </h2>
                <p className="text-stone-500">
                  我们不仅仅是医美机构，更是您美丽旅程的终身伙伴
                </p>
              </div>

              <div className="space-y-6">
                {[
                  {
                    title: "AI美学设计",
                    desc: "东方女性专属数据库，精准预测术后效果",
                  },
                  {
                    title: "三甲医师团队",
                    desc: "平均15年临床经验，零重大事故记录",
                  },
                  {
                    title: "终身无忧保障",
                    desc: "术后终身跟踪服务，免费修复承诺",
                  },
                ].map((item, index) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-[#B8A68D] text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-medium text-stone-900 mb-1">
                        {item.title}
                      </h3>
                      <p className="text-stone-500 text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link href="/about">
                <Button className="bg-[#B8A68D] hover:bg-[#A69479] text-white rounded-full px-8">
                  了解更多 <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
