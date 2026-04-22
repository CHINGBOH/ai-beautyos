import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { ArrowRight, Sparkles, Shield, Clock, Star, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { landingApi } from '@/lib/api';
import { toast } from 'sonner';
import { ServiceDetailModal } from '@/components/ServiceDetailModal';

// 淡入动画组件
function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.8, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// 图标映射
const iconMap: Record<string, any> = {
  Sparkles,
  Shield,
  Star,
  Clock,
};

// 颜色映射
const colorMap: Record<string, { bg: string; border: string }> = {
  skin: { bg: 'from-stone-50 to-stone-100', border: 'border-stone-100' },
  injection: { bg: 'from-stone-50 to-stone-100', border: 'border-stone-100' },
  laser: { bg: 'from-stone-50 to-stone-100', border: 'border-stone-100' },
  antiaging: { bg: 'from-stone-50 to-stone-100', border: 'border-stone-100' },
};

// 特色服务数据
const featuredServices = [
  {
    title: 'LUMIÈRE 智能面诊',
    description: 'AI + 专家双诊断，3D模拟术后效果，让您在决定前看到未来的自己',
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&q=80',
    badge: '独家技术',
  },
  {
    title: '私人美学管家',
    description: '1对1终身服务，从术前咨询到术后护理，专属顾问全程陪伴',
    image: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1200&q=80',
    badge: '尊享服务',
  },
  {
    title: '术后无忧保障',
    description: '终身免费修复承诺，24小时紧急响应，让您美得安心',
    image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1200&q=80',
    badge: '品质承诺',
  },
];

// 导航栏组件
function NavigationBar() {
  const [scrolled, setScrolled] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  });
  
  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 lg:px-16 py-4 transition-all duration-500 ${
        scrolled ? 'bg-white/95 backdrop-blur-xl shadow-[0_1px_2px_rgba(0,0,0,0.02)]' : 'bg-transparent'
      }`}
    >
      <Link href="/">
        <span className="text-lg font-light tracking-[0.2em] text-stone-900 font-serif">
          LUMIÈRE
        </span>
      </Link>
      <div className="hidden md:flex items-center gap-8">
        {['首页', '服务项目', '真实案例', '关于我们'].map((item, index) => {
          const paths = ['/', '/services', '/cases', '/about'];
          return (
            <Link key={item} href={paths[index]}>
              <span className={`relative text-sm cursor-pointer transition-colors duration-300 group ${
                index === 1 ? 'text-[#B8A68D] font-medium' : 'text-stone-500 hover:text-[#B8A68D]'
              }`}>
                {item}
                <span className={`absolute -bottom-1 left-0 w-0 h-px transition-all duration-300 group-hover:w-full ${index === 1 ? 'bg-[#B8A68D]' : 'bg-[#B8A68D]'}`} />
              </span>
            </Link>
          );
        })}
      </div>
      <Link href="/">
        <button className="px-6 py-2 border rounded-full text-sm border-[#B8A68D] text-[#B8A68D] hover:bg-[#B8A68D] hover:text-white transition-all shadow-sm hover:shadow-md hover:shadow-[#B8A68D]/10">
          预约咨询
        </button>
      </Link>
    </motion.nav>
  );
}

// Hero 区域
function Hero() {
  return (
    <section className="relative min-h-[70vh] flex items-center justify-center pt-20 pb-16 px-6 lg:px-16 bg-gradient-to-b from-[#FAF9F7] to-[#FAF9F7]">
      <div className="max-w-4xl mx-auto text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-[#B8A68D] text-xs tracking-[0.3em] uppercase mb-4"
        >
          Our Services
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-4xl lg:text-6xl font-light leading-[1.1] tracking-tight text-stone-900 mb-6 font-serif"
        >
          为您定制的<span className="text-stone-400">美丽方案</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-stone-500 text-lg max-w-2xl mx-auto mb-8"
        >
          四大核心服务领域，覆盖您变美的每一个需求。从皮肤管理到抗衰紧致，我们用科技重新定义东方美学。
        </motion.p>
      </div>
    </section>
  );
}

// 服务分类网格
function ServiceCategories() {
  const [serviceCategories, setServiceCategories] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    landingApi.getServices()
      .then(data => {
        setServiceCategories(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load services:', err);
        toast.error('加载服务数据失败');
        setLoading(false);
      });
  }, []);

  const handleServiceClick = (serviceId: string) => {
    setSelectedService(serviceId);
    setIsModalOpen(true);
  };

  const getCategoryPrice = (category: any) => {
    if (!category.services || category.services.length === 0) return '';
    const minPrice = Math.min(...category.services.map((s: any) => s.priceMin));
    return `¥${minPrice.toLocaleString()}起`;
  };

  if (loading) {
    return (
      <section className="py-20 px-6 lg:px-16 bg-[#FAF9F7]">
        <div className="max-w-7xl mx-auto text-center">
          <div className="w-8 h-8 border-2 border-stone-300 border-t-[#B8A68D] rounded-full animate-spin mx-auto" />
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-6 lg:px-16 bg-[#FAF9F7]">
      <div className="max-w-7xl mx-auto">
        <FadeIn>
          <div className="text-center mb-16">
            <p className="text-[#B8A68D] text-xs tracking-[0.3em] uppercase mb-2">Service Categories</p>
            <h2 className="text-3xl lg:text-4xl font-light tracking-tight text-stone-900 font-serif">四大核心服务</h2>
          </div>
        </FadeIn>

        <div className="grid md:grid-cols-2 gap-6">
          {serviceCategories.map((category, index) => {
            const Icon = iconMap[category.icon] || Sparkles;
            const colors = colorMap[category.id] || { bg: 'from-stone-50 to-gray-50', border: 'border-stone-100' };
            const firstService = category.services?.[0];
            
            return (
              <FadeIn key={category.id} delay={index * 0.1}>
                <motion.div
                  whileHover={{ y: -4 }}
                  className={`p-8 rounded-2xl bg-gradient-to-br ${colors.bg} border ${colors.border} cursor-pointer group`}
                  onClick={() => firstService && handleServiceClick(firstService.id)}
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm">
                      <Icon className="w-6 h-6 text-stone-700" />
                    </div>
                    <span className="text-stone-400 text-sm">{getCategoryPrice(category)}</span>
                  </div>
                  
                  <p className="text-xs text-stone-400 tracking-wider mb-1">{category.name}</p>
                  <h3 className="text-2xl font-light tracking-tight text-stone-900 mb-3 font-serif">{category.name}</h3>
                  <p className="text-stone-500 text-sm mb-6 leading-relaxed">{category.description}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-6">
                    {category.services?.slice(0, 4).map((service: any) => (
                      <span key={service.id} className="px-3 py-1 bg-white/60 rounded-full text-xs text-stone-600">
                        {service.name}
                      </span>
                    ))}
                    {category.services?.length > 4 && (
                      <span className="px-3 py-1 bg-white/60 rounded-full text-xs text-stone-600">
                        +{category.services.length - 4}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center text-[#B8A68D] text-sm font-medium group-hover:gap-2 transition-all">
                    了解详情 <ChevronRight className="w-4 h-4" />
                  </div>
                </motion.div>
              </FadeIn>
            );
          })}
        </div>
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

// 特色服务
function FeaturedServices() {
  return (
    <section className="py-20 px-6 lg:px-16 bg-[#F8F6F3]">
      <div className="max-w-7xl mx-auto">
        <FadeIn>
          <div className="text-center mb-16">
            <p className="text-[#B8A68D] text-xs tracking-[0.3em] uppercase mb-2">Featured</p>
            <h2 className="text-3xl lg:text-4xl font-light tracking-tight text-stone-900 font-serif">尊享特色服务</h2>
          </div>
        </FadeIn>

        <div className="space-y-12">
          {featuredServices.map((service, index) => (
            <FadeIn key={service.title} delay={index * 0.1}>
              <div className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-8 items-center`}>
                <div className="w-full lg:w-1/2">
                  <div className="relative overflow-hidden rounded-2xl">
                    <img
                      src={service.image}
                      alt={service.title}
                      className="w-full h-64 lg:h-80 object-cover"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs text-stone-700 border border-white/50">
                        {service.badge}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-full lg:w-1/2 text-center lg:text-left">
                  <h3 className="text-2xl lg:text-3xl font-light tracking-tight text-stone-900 mb-4 font-serif">{service.title}</h3>
                  <p className="text-stone-500 leading-relaxed mb-6">{service.description}</p>
                  <Link href="/">
                    <Button className="bg-[#B8A68D] hover:bg-[#A69479] text-white rounded-full px-8 shadow-lg shadow-[#B8A68D]/20 hover:shadow-xl hover:shadow-[#B8A68D]/30 transition-all">
                      立即预约 <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// CTA 区域
function CTA() {
  return (
    <section className="py-20 px-6 lg:px-16 bg-gradient-to-b from-[#FAF9F7] to-[#FAF9F7]">
      <div className="max-w-4xl mx-auto text-center">
        <FadeIn>
          <h2 className="text-3xl lg:text-4xl font-light tracking-tight text-stone-900 font-serif mb-4 font-serif">
            不确定哪个项目<span className="text-stone-400">适合您？</span>
          </h2>
          <p className="text-stone-500 mb-8">
            我们的美学顾问将为您提供免费的1对1咨询服务，帮您找到最适合的变美方案
          </p>
          <Link href="/">
            <Button size="lg" className="bg-[#B8A68D] hover:bg-[#A69479] text-white rounded-full px-10 py-6 shadow-lg shadow-[#B8A68D]/20 hover:shadow-xl hover:shadow-[#B8A68D]/30 transition-all">
              免费咨询 <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </FadeIn>
      </div>
    </section>
  );
}

// 页脚
function Footer() {
  return (
    <footer className="bg-[#1C1C1C] text-stone-400 py-12 px-6 lg:px-16">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <Link href="/">
            <span className="text-xl font-light text-[#FAF9F7] tracking-[0.2em]">LUMIÈRE</span>
          </Link>
          <div className="flex gap-8 text-sm">
            <Link href="/services"><span className="hover:text-[#FAF9F7] transition-colors cursor-pointer">服务项目</span></Link>
            <Link href="/cases"><span className="hover:text-[#FAF9F7] transition-colors cursor-pointer">真实案例</span></Link>
            <Link href="/about"><span className="hover:text-[#FAF9F7] transition-colors cursor-pointer">关于我们</span></Link>
          </div>
          <p className="text-xs">© 2024 LUMIÈRE. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default function Services() {
  return (
    <div className="min-h-screen bg-[#FAF9F7]">
      <NavigationBar />
      <Hero />
      <ServiceCategories />
      <FeaturedServices />
      <CTA />
      <Footer />
    </div>
  );
}
