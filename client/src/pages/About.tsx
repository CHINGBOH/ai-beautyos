import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import {
  ArrowRight,
  Award,
  Users,
  Clock,
  MapPin,
  Mail,
  Phone,
} from "lucide-react";
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
                  index === 3
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
    <section className="relative min-h-[70vh] flex items-center justify-center pt-20 pb-16 px-6 lg:px-16 bg-gradient-to-b from-[#F8F6F3] to-[#FAF9F7]">
      <div className="max-w-4xl mx-auto text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-[#B8A68D] text-xs tracking-[0.3em] uppercase mb-4"
        >
          About Us
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-4xl lg:text-6xl font-light leading-[1.1] tracking-tight text-stone-900 mb-6 font-serif"
        >
          以科技之力
          <span className="text-stone-400">
            <br />
            重塑东方美学
          </span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-stone-500 text-lg max-w-2xl mx-auto"
        >
          LUMIÈRE
          成立于2019年，是中国首家将AI技术应用于美学设计的医美机构。我们相信，科技与传统东方美学的结合，能创造出让每一位女性都绽放自信光芒的可能。
        </motion.p>
      </div>
    </section>
  );
}

// 品牌故事
function BrandStory() {
  return (
    <section className="py-20 px-6 lg:px-16 bg-[#FAF9F7]">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <FadeIn>
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&q=80"
                alt="LUMIÈRE 诊所"
                className="rounded-2xl w-full h-96 object-cover"
              />
              <div className="absolute -bottom-6 -right-6 w-48 h-48 bg-stone-100 rounded-2xl -z-10" />
            </div>
          </FadeIn>

          <FadeIn delay={0.2}>
            <div className="space-y-6">
              <p className="text-[#B8A68D] text-xs tracking-[0.3em] uppercase">
                Our Story
              </p>
              <h2 className="text-3xl font-light tracking-tight text-stone-900 font-serif">
                源于对美的执着追求
              </h2>
              <p className="text-stone-500 leading-relaxed">
                五年前，我们的创始人团队在参观欧洲顶级医美机构时发现，虽然技术先进，但设计方案却往往不符合东方女性的审美需求。于是，LUMIÈRE
                诞生了。
              </p>
              <p className="text-stone-500 leading-relaxed">
                我们汇聚了来自协和、九院等三甲医院的专业医师，联合中科院AI实验室，历时三年打造了东方女性美学数据库。如今，我们已服务超过12,000位客户，帮助他们找到最适合自己的美丽方案。
              </p>
              <div className="flex gap-8 pt-4">
                <div>
                  <p className="text-3xl font-light tracking-tight text-stone-900 font-serif">
                    2019
                  </p>
                  <p className="text-stone-400 text-sm">成立年份</p>
                </div>
                <div>
                  <p className="text-3xl font-light tracking-tight text-stone-900 font-serif">
                    12,000+
                  </p>
                  <p className="text-stone-400 text-sm">服务客户</p>
                </div>
                <div>
                  <p className="text-3xl font-light tracking-tight text-stone-900 font-serif">
                    50+
                  </p>
                  <p className="text-stone-400 text-sm">专业医师</p>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

// 核心价值
function CoreValues() {
  const values = [
    {
      icon: Award,
      title: "专业至上",
      description:
        "所有医师均来自三甲医院，平均从业经验超过15年，确保每一次治疗都安全有效",
    },
    {
      icon: Users,
      title: "客户为本",
      description:
        "1对1终身服务，从术前咨询到术后护理，专属顾问全程陪伴，让您无后顾之忧",
    },
    {
      icon: Clock,
      title: "持续创新",
      description:
        "与全球顶尖实验室合作，第一时间引入最新技术，让您始终走在美学前沿",
    },
  ];

  return (
    <section className="py-20 px-6 lg:px-16 bg-[#F8F6F3]">
      <div className="max-w-6xl mx-auto">
        <FadeIn>
          <div className="text-center mb-16">
            <p className="text-[#B8A68D] text-xs tracking-[0.3em] uppercase mb-2">
              Core Values
            </p>
            <h2 className="text-3xl lg:text-4xl font-light tracking-tight text-stone-900 font-serif">
              我们的价值观
            </h2>
          </div>
        </FadeIn>

        <div className="grid md:grid-cols-3 gap-8">
          {values.map((value, index) => (
            <FadeIn key={value.title} delay={index * 0.1}>
              <div className="text-center p-8">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white flex items-center justify-center">
                  <value.icon className="w-8 h-8 text-stone-700" />
                </div>
                <h3 className="text-xl font-medium tracking-tight text-stone-900 mb-3 font-serif">
                  {value.title}
                </h3>
                <p className="text-stone-500 text-sm leading-relaxed">
                  {value.description}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// 医师团队
function Team() {
  const doctors = [
    {
      name: "陈教授",
      title: "首席医学官",
      specialty: "面部轮廓整形",
      experience: "25年临床经验",
      image:
        "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=600&q=80",
    },
    {
      name: "李博士",
      title: "皮肤科主任",
      specialty: "皮肤管理与抗衰",
      experience: "18年临床经验",
      image:
        "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=600&q=80",
    },
    {
      name: "王主任",
      title: "注射美容专家",
      specialty: "微整形与注射",
      experience: "15年临床经验",
      image:
        "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=600&q=80",
    },
  ];

  return (
    <section className="py-20 px-6 lg:px-16 bg-[#FAF9F7]">
      <div className="max-w-6xl mx-auto">
        <FadeIn>
          <div className="text-center mb-16">
            <p className="text-[#B8A68D] text-xs tracking-[0.3em] uppercase mb-2">
              Our Team
            </p>
            <h2 className="text-3xl lg:text-4xl font-light tracking-tight text-stone-900 font-serif">
              专家团队
            </h2>
          </div>
        </FadeIn>

        <div className="grid md:grid-cols-3 gap-8">
          {doctors.map((doctor, index) => (
            <FadeIn key={doctor.name} delay={index * 0.1}>
              <div className="group">
                <div className="relative overflow-hidden rounded-2xl mb-4">
                  <img
                    src={doctor.image}
                    alt={doctor.name}
                    className="w-full h-80 object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-white font-medium text-lg">
                      {doctor.name}
                    </p>
                    <p className="text-white/80 text-sm">{doctor.title}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-stone-600 text-sm">{doctor.specialty}</p>
                  <p className="text-stone-400 text-xs">{doctor.experience}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// 设施环境
function Facilities() {
  const facilities = [
    {
      title: "VIP 诊疗室",
      description: "私密舒适的独立空间，确保您的隐私与尊贵体验",
      image:
        "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80",
    },
    {
      title: "激光治疗中心",
      description: "引进全球顶尖设备，为您提供最安全有效的治疗",
      image:
        "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&q=80",
    },
    {
      title: "术后恢复区",
      description: "温馨舒适的环境，专业护理团队24小时陪护",
      image:
        "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80",
    },
  ];

  return (
    <section className="py-20 px-6 lg:px-16 bg-[#F8F6F3]">
      <div className="max-w-6xl mx-auto">
        <FadeIn>
          <div className="text-center mb-16">
            <p className="text-[#B8A68D] text-xs tracking-[0.3em] uppercase mb-2">
              Facilities
            </p>
            <h2 className="text-3xl lg:text-4xl font-light tracking-tight text-stone-900 font-serif">
              环境与设施
            </h2>
          </div>
        </FadeIn>

        <div className="space-y-12">
          {facilities.map((facility, index) => (
            <FadeIn key={facility.title} delay={index * 0.1}>
              <div
                className={`flex flex-col ${index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"} gap-8 items-center`}
              >
                <div className="w-full lg:w-1/2">
                  <img
                    src={facility.image}
                    alt={facility.title}
                    className="w-full h-64 lg:h-80 object-cover rounded-2xl"
                  />
                </div>
                <div className="w-full lg:w-1/2 text-center lg:text-left">
                  <h3 className="text-2xl font-light tracking-tight text-stone-900 mb-3 font-serif">
                    {facility.title}
                  </h3>
                  <p className="text-stone-500">{facility.description}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// 联系我们
function Contact() {
  return (
    <section className="py-20 px-6 lg:px-16 bg-[#FAF9F7]">
      <div className="max-w-6xl mx-auto">
        <FadeIn>
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <p className="text-[#B8A68D] text-xs tracking-[0.3em] uppercase mb-2">
                Contact
              </p>
              <h2 className="text-3xl lg:text-4xl font-light tracking-tight text-stone-900 font-serif mb-6 font-serif">
                联系我们
              </h2>
              <p className="text-stone-500 mb-8">
                无论您有任何疑问，或想了解更多关于我们的服务，欢迎随时联系。我们的美学顾问将竭诚为您服务。
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-stone-600" />
                  </div>
                  <div>
                    <p className="text-stone-900 font-medium">地址</p>
                    <p className="text-stone-500 text-sm">
                      上海市静安区南京西路1266号恒隆广场58层
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-stone-600" />
                  </div>
                  <div>
                    <p className="text-stone-900 font-medium">电话</p>
                    <p className="text-stone-500 text-sm">400-888-9999</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-stone-600" />
                  </div>
                  <div>
                    <p className="text-stone-900 font-medium">邮箱</p>
                    <p className="text-stone-500 text-sm">hello@lumiere.com</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md hover:shadow-stone-900/3 transition-all duration-500">
              <h3 className="text-xl font-medium tracking-tight text-stone-900 mb-6 font-serif">
                营业时间
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-stone-500">周一至周五</span>
                  <span className="text-stone-900">10:00 - 22:00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">周六至周日</span>
                  <span className="text-stone-900">10:00 - 21:00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">节假日</span>
                  <span className="text-stone-900">请提前咨询</span>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-stone-100">
                <p className="text-stone-400 text-sm mb-4">需要预约咨询？</p>
                <Link href="/">
                  <Button className="w-full bg-[#B8A68D] hover:bg-[#A69479] text-white rounded-full shadow-lg shadow-[#B8A68D]/20 hover:shadow-xl hover:shadow-[#B8A68D]/30 transition-all shadow-lg shadow-[#B8A68D]/20 hover:shadow-xl hover:shadow-[#B8A68D]/30 transition-all">
                    立即预约 <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </FadeIn>
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
            期待与您<span className="text-stone-400">相遇</span>
          </h2>
          <p className="text-stone-500 mb-8">
            每一次蜕变都值得被认真对待，让我们一起开启您的美丽之旅
          </p>
          <Link href="/">
            <Button
              size="lg"
              className="bg-[#B8A68D] hover:bg-[#A69479] text-white rounded-full shadow-lg shadow-[#B8A68D]/20 hover:shadow-xl hover:shadow-[#B8A68D]/30 transition-all px-10 py-6"
            >
              预约咨询 <ArrowRight className="ml-2 w-5 h-5" />
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
            <span className="text-xl font-light text-[#FAF9F7] tracking-[0.2em]">
              LUMIÈRE
            </span>
          </Link>
          <div className="flex gap-8 text-sm">
            <Link href="/services">
              <span className="hover:text-[#FAF9F7] transition-colors cursor-pointer">
                服务项目
              </span>
            </Link>
            <Link href="/cases">
              <span className="hover:text-[#FAF9F7] transition-colors cursor-pointer">
                真实案例
              </span>
            </Link>
            <Link href="/about">
              <span className="hover:text-[#FAF9F7] transition-colors cursor-pointer">
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

export default function About() {
  return (
    <div className="min-h-screen bg-[#FAF9F7]">
      <NavigationBar />
      <Hero />
      <BrandStory />
      <CoreValues />
      <Team />
      <Facilities />
      <Contact />
      <CTA />
      <Footer />
    </div>
  );
}
