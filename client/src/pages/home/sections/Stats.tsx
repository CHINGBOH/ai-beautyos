import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export function Stats() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const stats = [
    { value: 12000, suffix: "+", label: "成功案例" },
    { value: 98.7, suffix: "%", label: "满意度" },
    { value: 50, suffix: "+", label: "专业医师" },
    { value: 15, suffix: "年", label: "技术沉淀" },
  ];

  return (
    <section ref={ref} className="py-16 lg:py-20 px-6 lg:px-16 bg-[#EFE7DA]">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {stats.map((stat, index) => (
            <div key={stat.label} className="text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <span className="text-4xl lg:text-5xl font-light text-[#3D3027]">
                  {isInView ? (
                    <CountUp
                      end={stat.value}
                      duration={2}
                      decimals={stat.value % 1 !== 0 ? 1 : 0}
                    />
                  ) : (
                    "0"
                  )}
                  {stat.suffix}
                </span>
              </motion.div>
              <p className="text-[#7D6A59] text-sm mt-2">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// 数字增长动画组件
function CountUp({
  end,
  duration = 2,
  decimals = 0,
}: {
  end: number;
  duration?: number;
  decimals?: number;
}) {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const startTime = performance.now();
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      countRef.current = end * easeOutQuart;
      setCount(countRef.current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [end, duration]);

  return (
    <span>{decimals > 0 ? count.toFixed(decimals) : Math.floor(count)}</span>
  );
}
