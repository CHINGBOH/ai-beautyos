import { motion } from "framer-motion";
import {
  ArrowRight,
  ChevronRight,
  Clock,
  Shield,
  Sparkles,
  Star,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ServiceDetailModal } from "@/components/ServiceDetailModal";
import { Button } from "@/components/ui/button";
import { fallbackServiceCategories } from "@/lib/fallback-services";
import { landingApi } from "@/lib/api";
import { FadeIn } from "../animation";
import type { LandingService, LandingServiceCategory } from "../types";

export function ServicesPreview() {
  const [serviceCategories, setServiceCategories] = useState<
    LandingServiceCategory[]
  >([]);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    landingApi
      .getServices()
      .then(data => {
        setServiceCategories(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load services:", err);
        setServiceCategories(fallbackServiceCategories);
        setLoading(false);
      });
  }, []);

  const handleServiceClick = (serviceId: string) => {
    setSelectedService(serviceId);
    setIsModalOpen(true);
  };

  const iconMap: Record<string, LucideIcon> = {
    Sparkles,
    Shield,
    Star,
    Clock,
  };

  const serviceToneMap: Record<string, { iconWrap: string; icon: string }> = {
    skin: { iconWrap: "bg-[#F4E6DD]", icon: "text-[#9C5F4D]" },
    injection: { iconWrap: "bg-[#EFE5D4]", icon: "text-[#8A6D45]" },
    laser: { iconWrap: "bg-[#E5ECE8]", icon: "text-[#547268]" },
    antiaging: { iconWrap: "bg-[#EAE3DA]", icon: "text-[#6F5847]" },
  };

  return (
    <section className="py-20 lg:py-28 px-6 lg:px-16 bg-[#FAF9F7]">
      <div className="max-w-6xl mx-auto">
        <FadeIn>
          <div className="text-center mb-12">
            <p className="text-[#B8A68D] text-xs tracking-[0.3em] uppercase mb-2">
              Our Services
            </p>
            <h2 className="text-3xl lg:text-4xl font-light text-stone-900 mb-4">
              四大核心服务
            </h2>
            <p className="text-stone-500 max-w-xl mx-auto">
              覆盖您变美的每一个需求，从皮肤管理到抗衰紧致，用科技重新定义东方美学
            </p>
          </div>
        </FadeIn>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-stone-300 border-t-[#B8A68D] rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {serviceCategories.map((category, index) => {
                const Icon = iconMap[category.icon] || Sparkles;
                const tone = serviceToneMap[category.id] || serviceToneMap.skin;
                const firstService = category.services?.[0];

                return (
                  <FadeIn key={category.id} delay={index * 0.1}>
                    <motion.div
                      whileHover={{ y: -8 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                      }}
                      className="group p-6 bg-white/90 rounded-xl border border-[#E8DDD0] shadow-sm hover:shadow-lg hover:shadow-[#6F5847]/10 transition-all cursor-pointer h-full"
                      onClick={() =>
                        firstService && handleServiceClick(firstService.id)
                      }
                    >
                      <div
                        className={`w-12 h-12 rounded-xl ${tone.iconWrap} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}
                      >
                        <Icon className={`w-6 h-6 ${tone.icon}`} />
                      </div>
                      <h3 className="text-lg font-medium text-stone-900 mb-2">
                        {category.name}
                      </h3>
                      <p className="text-stone-500 text-sm mb-4">
                        {category.description}
                      </p>

                      {/* 显示子服务 */}
                      {category.services && category.services.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {category.services
                            .slice(0, 3)
                            .map((s: LandingService) => (
                              <span
                                key={s.id}
                                className="text-xs px-2 py-0.5 bg-stone-100 text-stone-600 rounded"
                              >
                                {s.name}
                              </span>
                            ))}
                          {category.services.length > 3 && (
                            <span className="text-xs px-2 py-0.5 bg-stone-100 text-stone-600 rounded">
                              +{category.services.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center text-stone-400 text-sm group-hover:text-stone-600 transition-colors">
                        了解详情{" "}
                        <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </motion.div>
                  </FadeIn>
                );
              })}
            </div>

            <FadeIn delay={0.4}>
              <div className="text-center mt-10">
                <Link href="/services">
                  <Button
                    variant="outline"
                    className="rounded-full px-8 border-stone-300 hover:border-[#B8A68D] hover:bg-[#B8A68D] hover:text-white transition-all"
                  >
                    查看全部服务 <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </FadeIn>
          </>
        )}
      </div>

      {/* 服务详情弹窗 */}
      <ServiceDetailModal
        serviceId={selectedService}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </section>
  );
}
