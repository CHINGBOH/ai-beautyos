import { motion, AnimatePresence, useInView } from "framer-motion";
import { useRef, useEffect, useCallback, useState } from "react";
import { Link } from "wouter";
import {
  Flower2,
  Sparkles,
  ArrowRight,
  Star,
  Loader2,
  Shield,
  Clock,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { landingApi } from "@/lib/api";
import { toast } from "sonner";
import { ServiceDetailModal } from "@/components/ServiceDetailModal";
import { AppointmentChatBot } from "@/components/AppointmentChatBot";

// ============ 性能优化：使用 ref 而非 state 进行视差计算 ============
function useRefParallax(
  ref: React.RefObject<HTMLElement | null>,
  speed: number = 0.5
) {
  const targetRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const handleScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        const el = ref.current;
        const target = targetRef.current;
        if (!el || !target) {
          rafRef.current = undefined;
          return;
        }

        const rect = el.getBoundingClientRect();
        const offset =
          (window.innerHeight / 2 - (rect.top + rect.height / 2)) * speed;
        target.style.transform = `translate3d(0, ${offset}px, 0)`;

        rafRef.current = undefined;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [ref, speed]);

  return targetRef;
}

// 分割文字动画
function SplitText({
  text,
  className = "",
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <span ref={ref} className={className}>
      {text.split("").map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{
            duration: 0.6,
            delay: delay + i * 0.04,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          className="inline-block"
          style={{ whiteSpace: char === " " ? "pre" : "normal" }}
        >
          {char}
        </motion.span>
      ))}
    </span>
  );
}

// 淡入动画
function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

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

// ============ 页面区块 ============

// Hero 轮播数据 - 20张专属大图（1920px，不与其他区域重复）
const heroSlides = [
  {
    id: 1,
    brand: "LUMIÈRE",
    subtitle: "AI 驱动的肌肤未来",
    title: "预见更美的你",
    stat: "2,847",
    statLabel: "位正在进化",
    primaryBtn: "智能分析",
    secondaryBtn: "了解科技",
    image:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=1920&q=80",
    theme: "blue",
    textColor: "text-white",
    subColor: "text-blue-100",
    statColor: "text-blue-200",
    gradient: "from-blue-900/40 via-purple-900/20 to-stone-50",
  },
  {
    id: 2,
    brand: "FUTURE SELF",
    subtitle: "科技重塑东方美学",
    title: "下一个人生版本",
    stat: "10,000+",
    statLabel: "次精准预测",
    primaryBtn: "预约体验",
    secondaryBtn: "观看纪录片",
    image:
      "https://images.unsplash.com/photo-1514315384763-ba401779410f?w=1920&q=80",
    theme: "violet",
    textColor: "text-white",
    subColor: "text-violet-100",
    statColor: "text-violet-200",
    gradient: "from-violet-900/40 via-purple-900/20 to-stone-50",
  },
  {
    id: 3,
    brand: "LUMIÈRE",
    subtitle: "精准定制，千人千面",
    title: "你的专属方案",
    stat: "5,231",
    statLabel: "份独特方案",
    primaryBtn: "开始定制",
    secondaryBtn: "查看原理",
    image:
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=1920&q=80",
    theme: "emerald",
    textColor: "text-white",
    subColor: "text-emerald-100",
    statColor: "text-emerald-200",
    gradient: "from-emerald-900/40 via-teal-900/20 to-stone-50",
  },
  {
    id: 4,
    brand: "NEXT GEN",
    subtitle: "超越传统医美边界",
    title: "无感焕新",
    stat: "0",
    statLabel: "恢复期",
    primaryBtn: "技术解析",
    secondaryBtn: "实验室参观",
    image:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=1920&q=80",
    theme: "cyan",
    textColor: "text-white",
    subColor: "text-cyan-100",
    statColor: "text-cyan-200",
    gradient: "from-cyan-900/40 via-blue-900/20 to-stone-50",
  },
  {
    id: 5,
    brand: "LUMIÈRE",
    subtitle: "全球顶尖医师团队",
    title: "匠心臻选",
    stat: "50+",
    statLabel: "位三甲医师",
    primaryBtn: "选择医师",
    secondaryBtn: "团队介绍",
    image:
      "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=1920&q=80",
    theme: "amber",
    textColor: "text-white",
    subColor: "text-amber-100",
    statColor: "text-amber-200",
    gradient: "from-amber-900/40 via-orange-900/20 to-stone-50",
  },
  {
    id: 6,
    brand: "VISION 2030",
    subtitle: "定义未来十年审美",
    title: " timeless 之美",
    stat: "15",
    statLabel: "年技术沉淀",
    primaryBtn: "美学测试",
    secondaryBtn: "趋势报告",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=1920&q=80",
    theme: "rose",
    textColor: "text-white",
    subColor: "text-rose-100",
    statColor: "text-rose-200",
    gradient: "from-rose-900/40 via-pink-900/20 to-stone-50",
  },
  {
    id: 7,
    brand: "LUMIÈRE",
    subtitle: "数据驱动的精准蜕变",
    title: "科学之美",
    stat: "12,038",
    statLabel: "组数据模型",
    primaryBtn: "查看数据",
    secondaryBtn: "案例库",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1920&q=80",
    theme: "indigo",
    textColor: "text-white",
    subColor: "text-indigo-100",
    statColor: "text-indigo-200",
    gradient: "from-indigo-900/40 via-blue-900/20 to-stone-50",
  },
  {
    id: 8,
    brand: "INFINITE",
    subtitle: "探索美的无限可能",
    title: "不止于美",
    stat: "∞",
    statLabel: "种可能性",
    primaryBtn: "品牌故事",
    secondaryBtn: "加入我们",
    image:
      "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=1920&q=80",
    theme: "fuchsia",
    textColor: "text-white",
    subColor: "text-fuchsia-100",
    statColor: "text-fuchsia-200",
    gradient: "from-fuchsia-900/40 via-purple-900/20 to-stone-50",
  },
  {
    id: 9,
    brand: "LUMIÈRE",
    subtitle: "微分子靶向技术",
    title: "精准到细胞",
    stat: "99.7%",
    statLabel: "靶向准确率",
    primaryBtn: "技术详情",
    secondaryBtn: "对比传统",
    image:
      "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=1920&q=80",
    theme: "teal",
    textColor: "text-white",
    subColor: "text-teal-100",
    statColor: "text-teal-200",
    gradient: "from-teal-900/40 via-cyan-900/20 to-stone-50",
  },
  {
    id: 10,
    brand: "PURE",
    subtitle: "零添加纯净配方",
    title: "回归本真",
    stat: "0",
    statLabel: "有害成分",
    primaryBtn: "成分查询",
    secondaryBtn: "安全报告",
    image:
      "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=1920&q=80",
    theme: "lime",
    textColor: "text-white",
    subColor: "text-lime-100",
    statColor: "text-lime-200",
    gradient: "from-lime-900/40 via-green-900/20 to-stone-50",
  },
  {
    id: 11,
    brand: "LUMIÈRE",
    subtitle: "东方女性肤质数据库",
    title: "更懂你的美",
    stat: "100万+",
    statLabel: "组肤质样本",
    primaryBtn: "肤质测试",
    secondaryBtn: "数据洞察",
    image:
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=1920&q=80",
    theme: "orange",
    textColor: "text-white",
    subColor: "text-orange-100",
    statColor: "text-orange-200",
    gradient: "from-orange-900/40 via-amber-900/20 to-stone-50",
  },
  {
    id: 12,
    brand: "BLOOM",
    subtitle: "全生命周期管理",
    title: "美，不间断",
    stat: "365",
    statLabel: "天全程陪伴",
    primaryBtn: "了解服务",
    secondaryBtn: "客户旅程",
    image:
      "https://images.unsplash.com/photo-1589571894960-20bbe4ec65b6?w=1920&q=80",
    theme: "pink",
    textColor: "text-white",
    subColor: "text-pink-100",
    statColor: "text-pink-200",
    gradient: "from-pink-900/40 via-rose-900/20 to-stone-50",
  },
  {
    id: 13,
    brand: "LUMIÈRE",
    subtitle: "诺贝尔奖实验室背书",
    title: "科学的力量",
    stat: "3",
    statLabel: "位诺奖顾问",
    primaryBtn: "科研团队",
    secondaryBtn: "专利展示",
    image:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1920&q=80",
    theme: "slate",
    textColor: "text-white",
    subColor: "text-slate-100",
    statColor: "text-slate-200",
    gradient: "from-slate-900/40 via-gray-900/20 to-stone-50",
  },
  {
    id: 14,
    brand: "GLOW",
    subtitle: "夜间黄金修复期",
    title: "睡出来的美",
    stat: "8",
    statLabel: "小时深度修护",
    primaryBtn: "了解原理",
    secondaryBtn: "产品系列",
    image:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1920&q=80",
    theme: "purple",
    textColor: "text-white",
    subColor: "text-purple-100",
    statColor: "text-purple-200",
    gradient: "from-purple-900/40 via-violet-900/20 to-stone-50",
  },
  {
    id: 15,
    brand: "LUMIÈRE",
    subtitle: "全球严选原料溯源",
    title: "每一滴可追溯",
    stat: "27",
    statLabel: "个国家产地",
    primaryBtn: "原料地图",
    secondaryBtn: "品质认证",
    image:
      "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=1920&q=80",
    theme: "sky",
    textColor: "text-white",
    subColor: "text-sky-100",
    statColor: "text-sky-200",
    gradient: "from-sky-900/40 via-blue-900/20 to-stone-50",
  },
  {
    id: 16,
    brand: "ELITE",
    subtitle: "私人美学管家服务",
    title: "专属，不止于美",
    stat: "1:1",
    statLabel: "终身服务配比",
    primaryBtn: "预约管家",
    secondaryBtn: "服务详情",
    image:
      "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=1920&q=80",
    theme: "yellow",
    textColor: "text-white",
    subColor: "text-yellow-100",
    statColor: "text-yellow-200",
    gradient: "from-yellow-900/40 via-amber-900/20 to-stone-50",
  },
  {
    id: 17,
    brand: "LUMIÈRE",
    subtitle: "光影美学设计理念",
    title: "在不同光线下",
    stat: "360°",
    statLabel: "无死角精致",
    primaryBtn: "设计理念",
    secondaryBtn: "案例对比",
    image:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=1920&q=80",
    theme: "red",
    textColor: "text-white",
    subColor: "text-red-100",
    statColor: "text-red-200",
    gradient: "from-red-900/40 via-rose-900/20 to-stone-50",
  },
  {
    id: 18,
    brand: "AURA",
    subtitle: "从内而外的光彩",
    title: "不止皮相",
    stat: "7",
    statLabel: "维健康管理",
    primaryBtn: " holistic 方案",
    secondaryBtn: "营养咨询",
    image:
      "https://images.unsplash.com/photo-1542596768-5d1d21f1cf98?w=1920&q=80",
    theme: "green",
    textColor: "text-white",
    subColor: "text-green-100",
    statColor: "text-green-200",
    gradient: "from-green-900/40 via-emerald-900/20 to-stone-50",
  },
  {
    id: 19,
    brand: "LUMIÈRE",
    subtitle: "术后无忧保障体系",
    title: "安心的美",
    stat: "终身",
    statLabel: "免费修复承诺",
    primaryBtn: "保障详情",
    secondaryBtn: "理赔流程",
    image:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=1920&q=80",
    theme: "zinc",
    textColor: "text-white",
    subColor: "text-zinc-100",
    statColor: "text-zinc-200",
    gradient: "from-zinc-900/40 via-gray-900/20 to-stone-50",
  },
  {
    id: 20,
    brand: "ORIGIN",
    subtitle: "回归东方美学本源",
    title: "原生高级感",
    stat: "5000年",
    statLabel: "美学传承",
    primaryBtn: "东方美学",
    secondaryBtn: "文化传承",
    image:
      "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=1920&q=80",
    theme: "stone",
    textColor: "text-white",
    subColor: "text-stone-100",
    statColor: "text-stone-200",
    gradient: "from-stone-900/40 via-neutral-900/20 to-stone-50",
  },
];

function Hero({ onOpenChat }: { onOpenChat: () => void }) {
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
      className="relative h-screen w-full overflow-hidden"
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
          />
          <div className={`absolute inset-0 bg-gradient-to-b ${s.gradient}`} />
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
            <motion.p
              className={`text-xs tracking-[0.3em] uppercase mb-4 ${slide.subColor}`}
            >
              {slide.subtitle}
            </motion.p>

            {/* 主标题 */}
            <h1
              className={`text-5xl lg:text-7xl font-light leading-[1.1] mb-6 tracking-tight ${slide.textColor}`}
            >
              {slide.title}
            </h1>

            {/* 统计数据 */}
            <div
              className={`flex items-baseline gap-2 mb-8 ${slide.statColor}`}
            >
              <span className="text-4xl font-light">{slide.stat}</span>
              <span className="text-sm opacity-80">{slide.statLabel}</span>
            </div>

            {/* 按钮组 - 横向排列 */}
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onOpenChat}
                className="bg-white text-stone-900 px-6 py-3 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-stone-100 transition-colors"
              >
                {slide.primaryBtn}
                <ArrowRight className="w-4 h-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center gap-2 text-sm ${slide.textColor} hover:opacity-80 transition-opacity`}
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
                  ? "w-8 bg-white"
                  : "w-2 bg-white/40 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// 客户评价轮播数据 - 20个专属故事背景（1920px，与其他区域零重复）
const testimonials = [
  {
    id: 1,
    bg: "https://images.unsplash.com/photo-1554151228-14d9def656e4?w=1920&q=80",
    category: "HER MORNING",
    quote: "现在每天早上，\n会多照五分钟镜子。",
    author: "林小姐",
    role: "32岁 · 市场总监",
    initial: "林",
    theme: "pink",
    gradient: "from-pink-900/70 via-pink-800/50 to-transparent",
  },
  {
    id: 2,
    bg: "https://images.unsplash.com/photo-1542596594-649edbc13630?w=1920&q=80",
    category: "HER MEETING",
    quote: "提案通过率高了，\n不知道和颜值有没有关系。",
    author: "张女士",
    role: "36岁 · 投资经理",
    initial: "张",
    theme: "purple",
    gradient: "from-purple-900/70 via-purple-800/50 to-transparent",
  },
  {
    id: 3,
    bg: "https://images.unsplash.com/photo-1485893086445-ed75865251e0?w=1920&q=80",
    category: "HER DATE",
    quote: " divorced 五年后，\n第一次被要微信。",
    author: "王女士",
    role: "41岁 · 独立摄影师",
    initial: "王",
    theme: "rose",
    gradient: "from-rose-900/70 via-rose-800/50 to-transparent",
  },
  {
    id: 4,
    bg: "https://images.unsplash.com/photo-1508186225823-0963cf9ab0de?w=1920&q=80",
    category: "HER SHOP",
    quote: "顾客说老板娘变美了，\n咖啡是不是也变好喝了。",
    author: "李小姐",
    role: "28岁 · 咖啡店主",
    initial: "李",
    theme: "amber",
    gradient: "from-amber-900/70 via-orange-800/50 to-transparent",
  },
  {
    id: 5,
    bg: "https://images.unsplash.com/photo-1464863979621-258859e62245?w=1920&q=80",
    category: "HER SITE",
    quote: '工地上的男人不再叫"喂"，\n开始叫"那位设计师"。',
    author: "陈小姐",
    role: "30岁 · 建筑设计师",
    initial: "陈",
    theme: "cyan",
    gradient: "from-cyan-900/70 via-blue-800/50 to-transparent",
  },
  {
    id: 6,
    bg: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1920&q=80",
    category: "HER CLASS",
    quote: "学员说老师示范动作时，\n她们更容易集中注意力。",
    author: "赵小姐",
    role: "35岁 · 瑜伽教练",
    initial: "赵",
    theme: "emerald",
    gradient: "from-emerald-900/70 via-teal-800/50 to-transparent",
  },
  {
    id: 7,
    bg: "https://images.unsplash.com/photo-1504703395950-b89145a5425b?w=1920&q=80",
    category: "HER COURT",
    quote: "对方律师在庭后问，\n我是不是刚毕业。",
    author: "周小姐",
    role: "38岁 · 执业律师",
    initial: "周",
    theme: "violet",
    gradient: "from-violet-900/70 via-purple-800/50 to-transparent",
  },
  {
    id: 8,
    bg: "https://images.unsplash.com/photo-1519742866993-66d3cfef4bcd?w=1920&q=80",
    category: "HER GALLERY",
    quote: "画廊主说我的脸，\n比我的画更值得收藏。",
    author: "杨小姐",
    role: "29岁 · 青年画家",
    initial: "杨",
    theme: "indigo",
    gradient: "from-indigo-900/70 via-blue-800/50 to-transparent",
  },
  {
    id: 9,
    bg: "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=1920&q=80",
    category: "HER STORE",
    quote: "进货时供应商给的价格，\n好像比别的店主低一点。",
    author: "何小姐",
    role: "33岁 · 买手店主",
    initial: "何",
    theme: "fuchsia",
    gradient: "from-fuchsia-900/70 via-pink-800/50 to-transparent",
  },
  {
    id: 10,
    bg: "https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=1920&q=80",
    category: "HER STAGE",
    quote: "聚光灯下，\n不再害怕特写镜头。",
    author: "林小姐",
    role: "26岁 · 现代舞者",
    initial: "林",
    theme: "orange",
    gradient: "from-orange-900/70 via-red-800/50 to-transparent",
  },
  {
    id: 11,
    bg: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1920&q=80",
    category: "HER LECTURE",
    quote: "学生说看我的脸，\n比看PPT更提神。",
    author: "黄小姐",
    role: "43岁 · 大学教授",
    initial: "黄",
    theme: "teal",
    gradient: "from-teal-900/70 via-cyan-800/50 to-transparent",
  },
  {
    id: 12,
    bg: "https://images.unsplash.com/photo-1485893086445-ed75865251e0?w=1920&q=80",
    category: "HER PITCH",
    quote: "投资人记住的不是商业计划，\n是我这个人。",
    author: "郑小姐",
    role: "31岁 · 连续创业者",
    initial: "郑",
    theme: "sky",
    gradient: "from-sky-900/70 via-blue-800/50 to-transparent",
  },
  {
    id: 13,
    bg: "https://images.unsplash.com/photo-1554151228-14d9def656e4?w=1920&q=80",
    category: "HER HOSPITAL",
    quote: "病人家属说看到我的脸，\n心情会好一点。",
    author: "吴小姐",
    role: "34岁 · 儿科医生",
    initial: "吴",
    theme: "red",
    gradient: "from-red-900/70 via-rose-800/50 to-transparent",
  },
  {
    id: 14,
    bg: "https://images.unsplash.com/photo-1508186225823-0963cf9ab0de?w=1920&q=80",
    category: "HER FLIGHT",
    quote: "空姐同事问我在哪家航司培训的，\n我说我是乘客。",
    author: "徐小姐",
    role: "37岁 · 航空公司HR",
    initial: "徐",
    theme: "blue",
    gradient: "from-blue-900/70 via-indigo-800/50 to-transparent",
  },
  {
    id: 15,
    bg: "https://images.unsplash.com/photo-1519742866993-66d3cfef4bcd?w=1920&q=80",
    category: "HER AUDITION",
    quote: '导演说这个角色需要"有故事的脸"，\n现在我的脸就是故事。',
    author: "孙小姐",
    role: "27岁 · 话剧演员",
    initial: "孙",
    theme: "yellow",
    gradient: "from-yellow-900/70 via-amber-800/50 to-transparent",
  },
  {
    id: 16,
    bg: "https://images.unsplash.com/photo-1464863979621-258859e62245?w=1920&q=80",
    category: "HER INTERVIEW",
    quote: '最后一个问题总是"你平时怎么保养"，\n而不是"你期望薪资多少"。',
    author: "马小姐",
    role: "24岁 · 应届毕业生",
    initial: "马",
    theme: "green",
    gradient: "from-green-900/70 via-emerald-800/50 to-transparent",
  },
  {
    id: 17,
    bg: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=1920&q=80",
    category: "HER GYM",
    quote: "私教说我的体脂率和他的工资一样，\n都达到了理想状态。",
    author: "朱小姐",
    role: "39岁 · 健身达人",
    initial: "朱",
    theme: "lime",
    gradient: "from-lime-900/70 via-green-800/50 to-transparent",
  },
  {
    id: 18,
    bg: "https://images.unsplash.com/photo-1504703395950-b89145a5425b?w=1920&q=80",
    category: "HER WEDDING",
    quote: "前男友在婚礼现场没认出我，\n直到新娘提醒他看礼金簿。",
    author: "胡小姐",
    role: "30岁 · 新娘",
    initial: "胡",
    theme: "rose",
    gradient: "from-rose-900/70 via-pink-800/50 to-transparent",
  },
  {
    id: 19,
    bg: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1920&q=80",
    category: "HER REUNION",
    quote: '同学会结束建群，\n我的备注是"那个很好看的女同学"。',
    author: "郭小姐",
    role: "40岁 · 全职妈妈",
    initial: "郭",
    theme: "orange",
    gradient: "from-orange-900/70 via-amber-800/50 to-transparent",
  },
  {
    id: 20,
    bg: "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=1920&q=80",
    category: "HER NIGHT",
    quote: "夜店保安看我的身份证看了三次，\n怀疑我盗用他人证件。",
    author: "梁小姐",
    role: "42岁 ·  nightclub 老板",
    initial: "梁",
    theme: "purple",
    gradient: "from-purple-900/70 via-violet-800/50 to-transparent",
  },
];

function Testimonial() {
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
          className={`absolute inset-0 bg-gradient-to-r ${current.gradient}`}
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
            <p
              className={`text-xs tracking-[0.3em] uppercase mb-6 text-${current.theme}-200`}
            >
              {current.category}
            </p>

            <blockquote className="text-4xl lg:text-6xl font-light text-white leading-[1.2] mb-10 whitespace-pre-line">
              {current.quote}
            </blockquote>

            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-full bg-${current.theme}-300/30 flex items-center justify-center`}
              >
                <span className={`text-${current.theme}-100 text-lg`}>
                  {current.initial}
                </span>
              </div>
              <div>
                <p className="text-white font-medium">{current.author}</p>
                <p className={`text-${current.theme}-200 text-sm`}>
                  {current.role}
                </p>
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
                  ? "w-8 bg-white shadow-[0_0_12px_rgba(255,255,255,0.4)]"
                  : "w-2 bg-white/40 hover:bg-white/80 hover:shadow-[0_0_8px_rgba(255,255,255,0.2)]"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// 服务预览区块
function ServicesPreview() {
  const [serviceCategories, setServiceCategories] = useState<any[]>([]);
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
        // 使用默认数据
        setServiceCategories([
          {
            id: "skin",
            name: "皮肤管理",
            description: "从基础护理到深度修复",
            icon: "Sparkles",
            services: [],
          },
          {
            id: "injection",
            name: "注射美容",
            description: "精准塑形，自然不假面",
            icon: "Shield",
            services: [],
          },
          {
            id: "laser",
            name: "光电项目",
            description: "无创焕新，零恢复期",
            icon: "Star",
            services: [],
          },
          {
            id: "antiaging",
            name: "抗衰紧致",
            description: "逆转时光，定格黄金年龄",
            icon: "Clock",
            services: [],
          },
        ]);
        setLoading(false);
      });
  }, []);

  const handleServiceClick = (serviceId: string) => {
    setSelectedService(serviceId);
    setIsModalOpen(true);
  };

  const iconMap: Record<string, any> = {
    Sparkles,
    Shield,
    Star,
    Clock,
  };

  const colorMap: Record<string, string> = {
    skin: "rose",
    injection: "amber",
    laser: "blue",
    antiaging: "emerald",
  };

  return (
    <section className="py-20 lg:py-28 px-6 lg:px-16 bg-[#FAF9F7]">
      <div className="max-w-6xl mx-auto">
        <FadeIn>
          <div className="text-center mb-12">
            <p className="text-amber-600 text-xs tracking-[0.3em] uppercase mb-2">
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
                const color = colorMap[category.id] || "stone";
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
                      className="group p-6 bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-xl transition-all cursor-pointer h-full"
                      onClick={() =>
                        firstService && handleServiceClick(firstService.id)
                      }
                    >
                      <div
                        className={`w-12 h-12 rounded-xl bg-${color}-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                      >
                        <Icon className={`w-6 h-6 text-${color}-500`} />
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
                          {category.services.slice(0, 3).map((s: any) => (
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

// 数据统计区块
function Stats() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const stats = [
    { value: 12000, suffix: "+", label: "成功案例" },
    { value: 98.7, suffix: "%", label: "满意度" },
    { value: 50, suffix: "+", label: "专业医师" },
    { value: 15, suffix: "年", label: "技术沉淀" },
  ];

  return (
    <section ref={ref} className="py-16 lg:py-20 px-6 lg:px-16 bg-[#1C1C1C]">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {stats.map((stat, index) => (
            <div key={stat.label} className="text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <span className="text-4xl lg:text-5xl font-light text-[#FAF9F7]">
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
              <p className="text-[#C5BFB7] text-sm mt-2">{stat.label}</p>
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

// 服务流程区块
function Process() {
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
            <p className="text-amber-600 text-xs tracking-[0.3em] uppercase mb-2">
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

// 品牌优势区块
function WhyUs() {
  return (
    <section className="py-20 lg:py-28 px-6 lg:px-16 bg-[#F8F6F3]">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <FadeIn>
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80"
                alt="专业团队"
                className="rounded-2xl w-full h-80 lg:h-96 object-cover"
              />
              <div className="absolute -bottom-6 -right-6 w-48 h-48 bg-amber-100 rounded-2xl -z-10" />
              <div className="absolute -top-6 -left-6 w-32 h-32 bg-rose-100 rounded-2xl -z-10" />
            </div>
          </FadeIn>

          <FadeIn delay={0.2}>
            <div className="space-y-8">
              <div>
                <p className="text-amber-600 text-xs tracking-[0.3em] uppercase mb-2">
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

// CTA 区域 - 行动召唤（紧迫感）
function CTA() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    service_type: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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
      className="py-24 lg:py-32 px-6 lg:px-16 bg-gradient-to-b from-[#FAF9F7] via-[#FDFCFB] to-[#FAF9F7] relative overflow-hidden"
    >
      {/* 柔和光晕 - 边缘虚化 */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[#F8F6F3] to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#F8F6F3] to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#FFF8F0] rounded-full opacity-40 blur-[100px]" />
      {/* 背景装饰 */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-amber-100 rounded-full blur-3xl opacity-50 -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-100 rounded-full blur-3xl opacity-50 translate-x-1/2 translate-y-1/2" />

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <FadeIn>
          <p className="text-amber-600 text-xs tracking-[0.3em] uppercase mb-4">
            Limited Consultation
          </p>
          <h2 className="text-4xl lg:text-6xl font-light text-stone-900 mb-4">
            最好的投资，<span className="text-stone-400">是投资自己</span>
          </h2>
          <p className="text-stone-500 mb-8 max-w-xl mx-auto">
            本月仅剩 <span className="text-amber-600 font-medium">17</span>{" "}
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

// 页脚组件
function Footer() {
  return (
    <footer className="bg-[#1C1C1C] text-[#D5CFC7] py-16 px-6 lg:px-16 relative">
      {/* 顶部柔和过渡 */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#FAF9F7] to-[#3D3832]" />
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* 品牌 */}
          <div className="md:col-span-2">
            <Link href="/">
              <h3 className="text-2xl font-light text-[#FAF9F7] mb-4 tracking-[0.2em] cursor-pointer">
                LUMIÈRE
              </h3>
            </Link>
            <p className="text-sm leading-relaxed max-w-md mb-6">
              以科技之力，重塑东方美学。我们相信，每一位女性都值得拥有自信的光芒。
            </p>
            <div className="flex gap-4">
              {["微信", "微博", "小红书", "抖音"].map(social => (
                <button
                  key={social}
                  className="w-10 h-10 rounded-full border border-[#6B6560] flex items-center justify-center hover:border-[#A39E97] hover:text-[#FAF9F7] transition-colors text-xs"
                >
                  {social[0]}
                </button>
              ))}
            </div>
          </div>

          {/* 快速链接 */}
          <div>
            <h4 className="text-[#FAF9F7] text-sm font-medium mb-4 tracking-wider">
              快速链接
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/services">
                  <span className="hover:text-[#FAF9F7] transition-colors cursor-pointer">
                    服务项目
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/cases">
                  <span className="hover:text-[#FAF9F7] transition-colors cursor-pointer">
                    真实案例
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/about">
                  <span className="hover:text-[#FAF9F7] transition-colors cursor-pointer">
                    关于我们
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/#cta">
                  <span className="hover:text-[#FAF9F7] transition-colors cursor-pointer">
                    预约咨询
                  </span>
                </Link>
              </li>
            </ul>
          </div>

          {/* 联系 */}
          <div>
            <h4 className="text-[#FAF9F7] text-sm font-medium mb-4 tracking-wider">
              联系我们
            </h4>
            <ul className="space-y-3 text-sm">
              <li>400-888-9999</li>
              <li>hello@lumiere.com</li>
              <li>上海市静安区南京西路1266号</li>
              <li>营业时间：10:00 - 22:00</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#5A5450] pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <p>© 2024 LUMIÈRE. All rights reserved.</p>
          <div className="flex gap-6">
            <button className="hover:text-[#FAF9F7] transition-colors">
              隐私政策
            </button>
            <button className="hover:text-[#FAF9F7] transition-colors">
              服务条款
            </button>
            <button className="hover:text-[#FAF9F7] transition-colors">
              沪ICP备12345678号
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

// 回到顶部按钮
function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 500);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={scrollToTop}
          className="fixed bottom-8 left-8 w-12 h-12 bg-[#B8A68D]/80 backdrop-blur-sm text-white rounded-full shadow-xl flex items-center justify-center hover:bg-[#B8A68D] transition-colors z-50"
        >
          <ArrowRight className="w-5 h-5 -rotate-90" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

// 导航栏组件 - 滚动时毛玻璃效果
function NavigationBar({
  slide,
  onOpenChat,
}: {
  slide: (typeof heroSlides)[0];
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
            scrolled ? "text-stone-900" : slide.textColor
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
                  ? "text-stone-600 hover:text-stone-900"
                  : `${slide.subColor} hover:text-white`
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
            ? "text-[#B8A68D] border-[#B8A68D] hover:bg-[#B8A68D] hover:text-white"
            : `${slide.textColor} border-current hover:bg-white/10`
        }`}
      >
        立即预约
      </button>
    </motion.nav>
  );
}

// 页面加载动画
function PageLoader() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 bg-stone-50 z-[100] flex items-center justify-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center"
          >
            <h1 className="text-3xl font-light tracking-[0.3em] text-stone-900 mb-4">
              LUMIÈRE
            </h1>
            <div className="w-32 h-0.5 bg-stone-200 mx-auto overflow-hidden">
              <motion.div
                className="h-full bg-[#B8A68D]"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Home() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      <PageLoader />
      <main className="bg-[#FAF9F7]">
        <Hero onOpenChat={() => setChatOpen(true)} />
        <ServicesPreview />
        <Stats />
        <Process />
        <WhyUs />
        <Testimonial />
        <CTA />
        <Footer />
      </main>
      <BackToTop />
      <AppointmentChatBot
        open={chatOpen}
        onOpenChange={setChatOpen}
        mode="floating"
        title="预约咨询"
      />
    </>
  );
}
