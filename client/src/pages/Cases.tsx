import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { ArrowRight, Star, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

// 淡入动画组件
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

// 筛选分类
const categories = [
  { id: "all", label: "全部案例" },
  { id: "skin", label: "皮肤管理" },
  { id: "injection", label: "注射美容" },
  { id: "laser", label: "光电项目" },
  { id: "antiaging", label: "抗衰紧致" },
];

// 案例数据
const cases = [
  {
    id: 1,
    category: "skin",
    title: "暗沉肌焕新",
    description: "3个月皮肤管理，从暗沉粗糙到透亮光滑",
    age: "28岁",
    occupation: "市场经理",
    beforeImage:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&q=80",
    afterImage:
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=800&q=80",
    rating: 5,
    tags: ["水光针", "光子嫩肤"],
    quote: "现在素颜出门也有自信了",
  },
  {
    id: 2,
    category: "injection",
    title: "自然轮廓塑形",
    description: "玻尿酸填充，打造自然立体的面部轮廓",
    age: "32岁",
    occupation: "律师",
    beforeImage:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80",
    afterImage:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=80",
    rating: 5,
    tags: ["玻尿酸", "面部填充"],
    quote: "同事们都说我变年轻了，但看不出做了什么",
  },
  {
    id: 3,
    category: "laser",
    title: "色斑淡化",
    description: "皮秒激光治疗，告别困扰多年的黄褐斑",
    age: "38岁",
    occupation: "大学教授",
    beforeImage:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&q=80",
    afterImage:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=800&q=80",
    rating: 5,
    tags: ["皮秒", "祛斑"],
    quote: "终于不用厚厚的粉底遮斑了",
  },
  {
    id: 4,
    category: "antiaging",
    title: "时光逆转",
    description: "热玛吉 + 线雕联合治疗，重返5年前",
    age: "45岁",
    occupation: "企业高管",
    beforeImage:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800&q=80",
    afterImage:
      "https://images.unsplash.com/photo-1542596768-5d1d21f1cf98?w=800&q=80",
    rating: 5,
    tags: ["热玛吉", "线雕"],
    quote: "女儿的同学以为我们是姐妹",
  },
  {
    id: 5,
    category: "skin",
    title: "敏感肌修复",
    description: "科学修复屏障，告别敏感泛红",
    age: "26岁",
    occupation: "设计师",
    beforeImage:
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&q=80",
    afterImage:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80",
    rating: 5,
    tags: ["屏障修复", "舒敏"],
    quote: "终于可以用功效型护肤品了",
  },
  {
    id: 6,
    category: "injection",
    title: "精致V脸",
    description: "瘦脸针 + 下颌缘提升，打造精致小脸",
    age: "29岁",
    occupation: "主播",
    beforeImage:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80",
    afterImage:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80",
    rating: 5,
    tags: ["瘦脸针", "下颌缘"],
    quote: "上镜效果更好，粉丝都问我是不是瘦了",
  },
];

// 导航栏
function NavigationBar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  });

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 lg:px-16 py-4 transition-all duration-500 ${
        scrolled
          ? "bg-white/95 backdrop-blur-xl shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
          : "bg-transparent"
      }`}
    >
      <Link href="/">
        <span className="text-lg font-light tracking-[0.2em] text-stone-900 font-serif">
          LUMIÈRE
        </span>
      </Link>
      <div className="hidden md:flex items-center gap-8">
        {["首页", "服务项目", "真实案例", "关于我们"].map((item, index) => {
          const paths = ["/", "/services", "/cases", "/about"];
          return (
            <Link key={item} href={paths[index]}>
              <span
                className={`relative text-sm cursor-pointer transition-colors duration-300 group ${
                  index === 2
                    ? "text-[#B8A68D] font-medium"
                    : "text-stone-500 hover:text-[#B8A68D]"
                }`}
              >
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-[#B8A68D] transition-all duration-300 group-hover:w-full" />
              </span>
            </Link>
          );
        })}
      </div>
      <Link href="/#cta">
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
    <section className="relative min-h-[60vh] flex items-center justify-center pt-20 pb-16 px-6 lg:px-16 bg-gradient-to-b from-[#F8F6F3] to-[#FAF9F7]">
      <div className="max-w-4xl mx-auto text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-[#B8A68D] text-xs tracking-[0.3em] uppercase mb-4"
        >
          Real Cases
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-4xl lg:text-6xl font-light leading-[1.1] tracking-tight text-stone-900 mb-6 font-serif"
        >
          真实蜕变<span className="text-stone-400">故事</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-stone-500 text-lg max-w-2xl mx-auto"
        >
          每一个案例都是一个真实的故事。经过客户授权，我们展示这些蜕变瞬间，希望能给您带来启发和信心。
        </motion.p>
      </div>
    </section>
  );
}

// 案例画廊
function CaseGallery() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedCase, setSelectedCase] = useState<(typeof cases)[0] | null>(
    null
  );

  const filteredCases =
    activeCategory === "all"
      ? cases
      : cases.filter(c => c.category === activeCategory);

  return (
    <section className="py-20 px-6 lg:px-16 bg-[#FAF9F7]">
      <div className="max-w-7xl mx-auto">
        {/* 筛选标签 */}
        <FadeIn>
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-6 py-2 rounded-full text-sm transition-all ${
                  activeCategory === cat.id
                    ? "bg-[#B8A68D] text-white shadow-sm shadow-[#B8A68D]/20"
                    : "bg-white text-stone-500 hover:bg-stone-50 border border-stone-100 hover:border-stone-100 shadow-sm hover:shadow-md hover:shadow-stone-900/5 transition-all"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </FadeIn>

        {/* 案例网格 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="wait">
            {filteredCases.map((caseItem, index) => (
              <motion.div
                key={caseItem.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                layout
              >
                <div
                  className="group cursor-pointer"
                  onClick={() => setSelectedCase(caseItem)}
                >
                  {/* Before/After 对比图 */}
                  <div className="relative overflow-hidden rounded-2xl mb-4 shadow-sm hover:shadow-lg hover:shadow-stone-900/5 hover:-translate-y-1 transition-all duration-500">
                    <div className="flex">
                      <div className="w-1/2 relative">
                        <img
                          src={caseItem.beforeImage}
                          alt="Before"
                          className="w-full h-64 object-cover"
                        />
                        <span className="absolute top-4 left-4 px-2 py-1 bg-stone-900/60 backdrop-blur-sm text-white/90 text-xs rounded border border-white/10">
                          Before
                        </span>
                      </div>
                      <div className="w-1/2 relative">
                        <img
                          src={caseItem.afterImage}
                          alt="After"
                          className="w-full h-64 object-cover"
                        />
                        <span className="absolute top-4 right-4 px-2 py-1 bg-white/90 backdrop-blur-sm text-stone-600 text-xs rounded border border-stone-100">
                          After
                        </span>
                      </div>
                    </div>
                    {/* 悬停遮罩 */}
                    <div className="absolute inset-0 bg-[#B8A68D]/0 group-hover:bg-[#B8A68D]/20 transition-colors flex items-center justify-center">
                      <span className="px-5 py-2.5 bg-white text-[#B8A68D] text-sm rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-4 group-hover:translate-y-0 shadow-lg shadow-stone-900/5 border border-stone-50">
                        查看详情
                      </span>
                    </div>
                  </div>

                  {/* 案例信息 */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-medium tracking-tight text-stone-900 font-serif">
                        {caseItem.title}
                      </h3>
                      <div className="flex">
                        {[...Array(caseItem.rating)].map((_, i) => (
                          <Star
                            key={i}
                            className="w-3 h-3 fill-[#B8A68D] text-[#B8A68D]"
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-stone-500 text-sm">
                      {caseItem.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-stone-400">
                      <span>{caseItem.age}</span>
                      <span>·</span>
                      <span>{caseItem.occupation}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {caseItem.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-stone-100 text-stone-600 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* 详情弹窗 */}
        <AnimatePresence>
          {selectedCase && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedCase(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="relative">
                  <button
                    onClick={() => setSelectedCase(null)}
                    className="absolute top-4 right-4 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center z-10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="flex">
                    <img
                      src={selectedCase.beforeImage}
                      alt="Before"
                      className="w-1/2 h-80 object-cover"
                    />
                    <img
                      src={selectedCase.afterImage}
                      alt="After"
                      className="w-1/2 h-80 object-cover"
                    />
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-light tracking-tight text-stone-900 mb-2 font-serif">
                    {selectedCase.title}
                  </h3>
                  <p className="text-stone-500 mb-4">
                    {selectedCase.description}
                  </p>
                  <blockquote className="border-l-2 border-[#B8A68D] pl-4 py-2 mb-6 font-serif">
                    <p className="text-stone-600 italic">
                      "{selectedCase.quote}"
                    </p>
                    <p className="text-stone-400 text-sm mt-2">
                      — {selectedCase.age} · {selectedCase.occupation}
                    </p>
                  </blockquote>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {selectedCase.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-stone-100 text-stone-700 text-sm rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <Link href="/#cta">
                    <Button className="w-full bg-[#B8A68D] hover:bg-[#A69479] text-white rounded-full shadow-lg shadow-[#B8A68D]/20 hover:shadow-xl hover:shadow-[#B8A68D]/30 transition-all">
                      咨询同款方案 <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

// 统计数据
function Stats() {
  const stats = [
    { value: "12,000+", label: "成功案例" },
    { value: "98.7%", label: "满意度" },
    { value: "0", label: "重大事故" },
    { value: "50+", label: "专业医师" },
  ];

  return (
    <section className="py-16 px-6 lg:px-16 bg-[#EFE7DA]">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <FadeIn key={stat.label} delay={index * 0.1}>
              <div className="text-center">
                <p className="text-3xl lg:text-4xl font-light tracking-tight text-[#3D3027] mb-2 font-serif">
                  {stat.value}
                </p>
                <p className="text-[#7D6A59] text-sm">{stat.label}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// CTA
function CTA() {
  return (
    <section className="py-20 px-6 lg:px-16 bg-gradient-to-b from-[#F8F6F3] to-[#FAF9F7]">
      <div className="max-w-4xl mx-auto text-center">
        <FadeIn>
          <h2 className="text-3xl lg:text-4xl font-light tracking-tight text-stone-900 font-serif mb-4 font-serif">
            准备好开启您的<span className="text-stone-400">蜕变之旅？</span>
          </h2>
          <p className="text-stone-500 mb-8">
            每个人的美都是独一无二的，让我们帮您发现最好的自己
          </p>
          <Link href="/#cta">
            <Button
              size="lg"
              className="bg-[#B8A68D] hover:bg-[#A69479] text-white rounded-full shadow-lg shadow-[#B8A68D]/20 hover:shadow-xl hover:shadow-[#B8A68D]/30 transition-all px-10 py-6"
            >
              立即预约 <ArrowRight className="ml-2 w-5 h-5" />
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
    <footer className="bg-[#EFE7DA] text-[#6F5847] py-12 px-6 lg:px-16 border-t border-[#D8CBBB]">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <Link href="/">
            <span className="text-xl font-light text-[#3D3027] tracking-[0.2em]">
              LUMIÈRE
            </span>
          </Link>
          <div className="flex gap-8 text-sm">
            <Link href="/services">
              <span className="hover:text-[#3D3027] transition-colors cursor-pointer">
                服务项目
              </span>
            </Link>
            <Link href="/cases">
              <span className="hover:text-[#3D3027] transition-colors cursor-pointer">
                真实案例
              </span>
            </Link>
            <Link href="/about">
              <span className="hover:text-[#3D3027] transition-colors cursor-pointer">
                关于我们
              </span>
            </Link>
          </div>
          <p className="text-xs">© 2024 LUMIÈRE. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default function Cases() {
  return (
    <div className="min-h-screen bg-[#FAF9F7]">
      <NavigationBar />
      <Hero />
      <CaseGallery />
      <Stats />
      <CTA />
      <Footer />
    </div>
  );
}
