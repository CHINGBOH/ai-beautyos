import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useRefParallax } from "../animation";
import { testimonials } from "../data";

export function Testimonial() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const bgRef = useRefParallax(sectionRef, 0.15);
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // 自动轮播 - 10秒切换
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % testimonials.length);
    }, 10000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const current = testimonials[currentIndex];

  return (
    <section
      ref={sectionRef}
      className="relative py-32 lg:py-40 px-6 lg:px-16 overflow-hidden"
    >
      {/* 上下柔和过渡 - 模糊边缘 */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#FAF9F7] to-transparent z-10" />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#FAF9F7] to-transparent z-10" />

      {/* 视差背景 - 轮播 */}
      <div className="absolute inset-0">
        <div
          ref={bgRef}
          className="absolute inset-[-20%] will-change-transform"
        >
          <AnimatePresence mode="wait">
            <motion.img
              key={current.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              src={current.bg}
              alt="Testimonial Background"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </AnimatePresence>
        </div>
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-[#2f251f]/78 via-[#6f5847]/42 to-[#fbf8f3]/12"
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-xs tracking-[0.28em] uppercase mb-6 text-[#EADCC8]">
              {current.category}
            </p>

            <blockquote className="text-4xl lg:text-6xl font-light text-white leading-[1.2] mb-10 whitespace-pre-line">
              {current.quote}
            </blockquote>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full border border-[#F8EFE2]/50 bg-[#F8EFE2]/16 flex items-center justify-center">
                <span className="text-[#F8EFE2] text-lg">
                  {current.initial}
                </span>
              </div>
              <div>
                <p className="text-white font-medium">{current.author}</p>
                <p className="text-[#EADCC8] text-sm">{current.role}</p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* 轮播指示器 - 触感优化 */}
        <div className="flex items-center gap-3 mt-12">
          {testimonials.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => setCurrentIndex(index)}
              whileHover={{ scale: 1.5, y: -2 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "w-9 bg-[#F8EFE2] shadow-[0_0_10px_rgba(248,239,226,0.25)]"
                  : "w-5 bg-[#F8EFE2]/40 hover:bg-[#F8EFE2]/75"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
