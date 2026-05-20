import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useRefParallax } from "../animation";
import { heroSlides } from "../data";
import type { HeroSlide } from "../types";

export function Hero({ onOpenChat }: { onOpenChat: () => void }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const bgRefs = useRef<(HTMLDivElement | null)[]>([]);
  const contentRef = useRefParallax(sectionRef, -0.1);
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // 自动轮播 - 12秒切换
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % heroSlides.length);
    }, 12000);
    return () => clearInterval(intervalRef.current);
  }, []);

  // 视差效果
  useEffect(() => {
    const handleScroll = () => {
      requestAnimationFrame(() => {
        if (!sectionRef.current) return;
        const rect = sectionRef.current.getBoundingClientRect();
        const offset = (window.innerHeight - rect.top) * 0.15;
        bgRefs.current.forEach(ref => {
          if (ref) ref.style.transform = `translate3d(0, ${offset}px, 0)`;
        });
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const slide = heroSlides[currentSlide];

  return (
    <section
      ref={sectionRef}
      className="relative h-screen w-full overflow-hidden bg-[#1f1712]"
    >
      {/* 背景层 - 轮播 */}
      {heroSlides.map((s, index) => (
        <div
          key={s.id}
          ref={el => {
            bgRefs.current[index] = el;
          }}
          className={`absolute inset-[-15%] will-change-transform transition-opacity duration-1000 ${
            index === currentSlide ? "opacity-100" : "opacity-0"
          }`}
        >
          <img
            src={s.image}
            alt={s.title}
            className="w-full h-full object-cover"
            fetchPriority={index === 0 ? "high" : "auto"}
            loading={index === 0 ? "eager" : "lazy"}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1f1712]/72 via-[#6f5847]/32 to-[#f8efe2]/14" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1f1712]/55 via-transparent to-[#1f1712]/20" />
        </div>
      ))}

      {/* 导航栏 - 滚动时变为毛玻璃效果 */}
      <NavigationBar slide={slide} onOpenChat={onOpenChat} />

      {/* 内容层 - 左下角布局，避开人脸 */}
      <div
        ref={contentRef}
        className="relative z-10 h-full flex flex-col justify-end pb-32 lg:pb-40 px-6 lg:px-16 will-change-transform"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="max-w-2xl"
          >
            {/* 副标题 */}
            <motion.p className="text-xs tracking-[0.28em] uppercase mb-4 text-[#EADCC8]">
              {slide.subtitle}
            </motion.p>

            {/* 主标题 */}
            <h1 className="text-5xl lg:text-7xl font-light leading-[1.1] mb-6 tracking-tight text-white">
              {slide.title}
            </h1>

            {/* 统计数据 */}
            <div className="flex items-baseline gap-2 mb-8 text-[#F7E9D2]">
              <span className="text-4xl font-light">{slide.stat}</span>
              <span className="text-sm opacity-80">{slide.statLabel}</span>
            </div>

            {/* 按钮组 - 横向排列 */}
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onOpenChat}
                className="bg-[#F8EFE2] text-[#3D3027] px-6 py-3 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-white transition-colors shadow-lg shadow-black/10"
              >
                {slide.primaryBtn}
                <ArrowRight className="w-4 h-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() =>
                  document
                    .getElementById("cta")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="flex items-center gap-2 text-sm text-white/90 hover:text-white transition-colors"
              >
                <span className="w-10 h-10 rounded-full border border-current flex items-center justify-center text-xs">
                  ▶
                </span>
                {slide.secondaryBtn}
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* 轮播指示器 - 移到右下角 */}
        <div className="absolute bottom-10 right-6 lg:right-16 flex items-center gap-3">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-1 rounded-full transition-all duration-500 ${
                index === currentSlide
                  ? "w-9 bg-[#F8EFE2]"
                  : "w-5 bg-[#F8EFE2]/45 hover:bg-[#F8EFE2]/75"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// 导航栏组件 - 滚动时毛玻璃效果
function NavigationBar({
  slide,
  onOpenChat,
}: {
  slide: HeroSlide;
  onOpenChat: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { label: "首页", href: "/" },
    { label: "服务项目", href: "/services" },
    { label: "真实案例", href: "/cases" },
    { label: "关于我们", href: "/about" },
  ];

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 lg:px-16 py-4 transition-all duration-500 ${
        scrolled
          ? "bg-white/80 backdrop-blur-md shadow-sm py-3"
          : "bg-transparent"
      }`}
    >
      <Link href="/">
        <span
          className={`text-lg font-light tracking-[0.2em] transition-colors duration-300 cursor-pointer ${
            scrolled ? "text-[#3D3027]" : "text-white"
          }`}
        >
          LUMIÈRE
        </span>
      </Link>
      <div className="hidden md:flex items-center gap-8">
        {navItems.map(item => (
          <Link key={item.href} href={item.href}>
            <span
              className={`text-sm cursor-pointer transition-colors duration-300 ${
                scrolled
                  ? "text-[#6F5847] hover:text-[#3D3027]"
                  : "text-white/82 hover:text-white"
              }`}
            >
              {item.label}
            </span>
          </Link>
        ))}
      </div>
      <button
        onClick={onOpenChat}
        className={`px-6 py-2 border rounded-full text-sm transition-all duration-300 ${
          scrolled
            ? "text-[#6F5847] border-[#C8B9A8] hover:bg-[#6F5847] hover:text-white"
            : "text-white border-white/70 hover:bg-white/12"
        }`}
      >
        立即预约
      </button>
    </motion.nav>
  );
}
