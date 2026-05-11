import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DatabaseButton } from "@/components/ui/database-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  Sparkles,
  Clock,
  Shield,
  Heart,
  CheckCircle2,
  Star,
  MessageCircle,
  Phone,
  Calendar,
  Zap,
  User,
  Mail,
  Send,
  ArrowRight,
  TrendingUp,
  Award,
  BookOpen
} from "lucide-react";

export default function Home() {
  // SEO 优化
  useEffect(() => {
    // 设置页面标题（30-60字符）
    document.title = "焱磊医美 Liora Yan - Ignite Your Glow | 高端医美定制";

    // 设置描述信息（50-160字符）
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', 'Liora Yan 焱磊医美 (Ignite Your Glow) 提供高端定制医美服务。超皮秒、热玛吉、水光针等项目，唤醒您的肌肤光彩。');

    // 设置关键词
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', '焱磊医美,Liora Yan,Ignite Your Glow,深圳医美,超皮秒,热玛吉,抗衰老,皮肤管理');
  }, []);

  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    wechat: "",
    interestedServices: ["超皮秒祛斑"] as string[],
    budget: "",
    message: "",
  });

  // 智能预约状态
  const [showSmartBooking, setShowSmartBooking] = useState(false);
  const [bookingStep, setBookingStep] = useState(0);
  const [selectedService, setSelectedService] = useState("超皮秒祛斑");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [smartRecommendation, setSmartRecommendation] = useState<string>("");

  const createSession = trpc.chat.createSession.useMutation();
  const submitLead = trpc.chat.convertToLead.useMutation();

  // 从 URL 参数获取来源渠道
  const getSourceFromURL = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("source") || "官网落地页";
  };

  // 智能推荐服务
  const getSmartRecommendation = (message: string) => {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes("斑") || lowerMessage.includes("色素")) {
      return "根据您的描述，推荐【超皮秒祛斑】项目，精准击碎色素，效果显著";
    } else if (lowerMessage.includes("皱纹") || lowerMessage.includes("紧致")) {
      return "根据您的描述，推荐【热玛吉紧致】项目，重塑肌肤轮廓";
    } else if (lowerMessage.includes("补水") || lowerMessage.includes("干燥")) {
      return "根据您的描述，推荐【深层水光】项目，长效补水保湿";
    } else if (lowerMessage.includes("美白") || lowerMessage.includes("提亮")) {
      return "根据您的描述，推荐【美白嫩肤】项目，均匀肤色，提亮光泽";
    }
    return "";
  };

  // 生成可用时间段
  const generateAvailableSlots = () => {
    const today = new Date();
    const slots: string[] = [];
    const timeOptions = ["10:00", "11:00", "14:00", "15:00", "16:00", "17:00"];

    for (let i = 0; i < 3; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' });
      timeOptions.forEach(time => {
        slots.push(`${dateStr} ${time}`);
      });
    }
    return slots;
  };

  // 智能预约处理
  const handleSmartBooking = () => {
    setShowSmartBooking(true);
    setBookingStep(0);
    setAvailableSlots(generateAvailableSlots());
  };

  // 智能分析用户需求
  const handleSmartAnalyze = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const recommendation = getSmartRecommendation(formData.message);
      if (recommendation) {
        setSmartRecommendation(recommendation);
        toast.success("AI 已为您推荐最适合的项目 ✨");
      } else {
        setSmartRecommendation("根据您的需求，专业顾问将为您提供个性化方案");
      }
      setIsAnalyzing(false);
    }, 1500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.phone) {
      toast.error("请填写姓名和手机号");
      return;
    }

    // 创建临时会话用于提交线索
    try {
      const sessionResult = await createSession.mutateAsync();

      await submitLead.mutateAsync({
        sessionId: sessionResult.sessionId,
        ...formData,
      });

      toast.success("提交成功！我们的专业顾问将在30分钟内与您联系，请保持手机畅通 💝");

      // 重置表单
      setFormData({
        name: "",
        phone: "",
        wechat: "",
        interestedServices: ["超皮秒祛斑"],
        budget: "",
        message: "",
      });
      setShowSmartBooking(false);
      setBookingStep(0);
    } catch (error) {
      toast.error("提交失败，请检查网络连接或稍后重试。如问题持续，请联系客服");
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      {/* 导航栏 */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-amber-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Liora Yan" className="h-8 w-8 object-contain" />
              <span className="text-lg font-bold text-amber-800 font-serif">
                焱磊医美
              </span>
            </div>
            <div className="flex gap-3">
              <DatabaseButton
                variant="ghost"
                size="sm"
                pageKey="home"
                buttonKey="consultation"
                fallbackText="在线咨询"
                className="gap-2"
                onClick={() => setLocation("/chat")}
              >
                <MessageCircle className="w-4 h-4" />
              </DatabaseButton>
              <DatabaseButton
                variant="ghost"
                size="sm"
                pageKey="home"
                buttonKey="knowledge"
                fallbackText="知识库"
                className="gap-2"
                onClick={() => setLocation("/knowledge")}
              >
                <BookOpen className="w-4 h-4" />
              </DatabaseButton>
              <DatabaseButton
                size="sm"
                pageKey="home"
                buttonKey="free-consultation"
                fallbackText="免费面诊咨询"
                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
                onClick={() => {
                  document.getElementById("form-section")?.scrollIntoView({ behavior: "smooth" });
                }}
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero 区域 */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight font-serif">
              专业祛斑，安全有效
              <br />
              <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                让美成为您一生的事业和陪伴
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              采用先进的超皮秒激光技术，精准击碎色素颗粒，温和祛除各类色斑。2-3次治疗，90%以上客户满意度，3-5天即可正常化妆，不影响工作，让您轻松拥有净白无瑕的肌肤。
            </p>
            
            <div className="flex flex-wrap gap-4 mb-8">
              <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-full shadow-sm">
                <Clock className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-medium">3-5天即可正常化妆</span>
              </div>
              <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-full shadow-sm">
                <Shield className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-medium">FDA认证设备，安全无创</span>
              </div>
              <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-full shadow-sm">
                <Heart className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-medium">90%以上客户满意度</span>
              </div>
            </div>

            <div className="flex gap-4">
              <DatabaseButton
                size="lg"
                pageKey="home"
                buttonKey="smart-booking"
                fallbackText="智能预约"
                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-lg px-8 shadow-lg hover:shadow-xl transition-all duration-300 group"
                onClick={handleSmartBooking}
              >
                <Zap className="w-5 h-5 mr-2 group-hover:animate-pulse" />
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </DatabaseButton>
              <DatabaseButton
                size="lg"
                variant="outline"
                pageKey="home"
                buttonKey="ai-consultation"
                fallbackText="AI 咨询"
                className="text-lg px-8 border-amber-300 hover:bg-amber-50 group"
                onClick={() => setLocation("/chat")}
              >
                <MessageCircle className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
              </DatabaseButton>
            </div>

            {/* 智能提示 */}
            <div className="mt-6 flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-600" />
                <span>AI 智能推荐</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>30分钟响应</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-600" />
                <span>专业医师团队</span>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="aspect-square bg-gradient-to-br from-amber-200 to-orange-200 rounded-3xl overflow-hidden shadow-2xl">
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <Sparkles className="w-24 h-24 mx-auto mb-4 text-amber-500" />
                  <p className="text-lg">超皮秒祛斑效果展示</p>
                </div>
              </div>
            </div>
            {/* 装饰元素 */}
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-amber-300 rounded-full opacity-20 blur-3xl"></div>
            <div className="absolute -bottom-6 -left-6 w-40 h-40 bg-orange-300 rounded-full opacity-20 blur-3xl"></div>
          </div>
        </div>
      </section>

      {/* 项目优势 */}
      <section className="bg-white py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">为什么选择超皮秒？</h2>
            <p className="text-gray-600 text-lg">四大核心优势，让祛斑更安全更有效</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <Sparkles className="w-12 h-12 text-amber-600" />,
                title: "精准祛斑",
                desc: "超短脉冲精准击碎色素，不伤周围组织"
              },
              {
                icon: <Clock className="w-12 h-12 text-amber-600" />,
                title: "恢复快速",
                desc: "3-5天恢复期，不影响正常工作生活"
              },
              {
                icon: <Shield className="w-12 h-12 text-amber-600" />,
                title: "安全可靠",
                desc: "FDA认证设备，专业医师操作"
              },
              {
                icon: <Heart className="w-12 h-12 text-amber-600" />,
                title: "效果持久",
                desc: "2-3次治疗，效果可维持数年"
              }
            ].map((item, index) => (
              <Card key={index} className="border-amber-100 hover:shadow-lg transition-shadow">
                <CardContent className="pt-8 text-center">
                  <div className="mb-4 flex justify-center">{item.icon}</div>
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-gray-600">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 适合人群 */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">适合哪些人群？</h2>
            <p className="text-gray-600 text-lg">如果您有以下困扰，超皮秒是您的理想选择</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              "雀斑、晒斑困扰多年",
              "黄褐斑、妊娠斑难消除",
              "肤色不均、暗沉无光",
              "毛孔粗大、肤质粗糙",
              "想改善肤质提升颜值",
              "追求安全有效的祛斑方案"
            ].map((item, index) => (
              <div key={index} className="flex items-start gap-3 bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <CheckCircle2 className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
                <span className="text-gray-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 客户评价 */}
      <section className="bg-gradient-to-br from-amber-50 to-orange-50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">客户真实评价</h2>
            <p className="text-gray-600 text-lg">听听她们的变美故事</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                name: "李女士",
                age: "28岁",
                rating: 5,
                content: "做了两次超皮秒，脸上的雀斑淡了很多！恢复也很快，第三天就可以正常化妆了。医生很专业，全程都很温柔。"
              },
              {
                name: "张小姐",
                age: "35岁",
                rating: 5,
                content: "黄褐斑困扰我好多年，试过很多方法都没用。超皮秒真的有效！现在皮肤白净了好多，整个人都年轻了。"
              },
              {
                name: "王女士",
                age: "32岁",
                rating: 5,
                content: "咨询顾问很耐心，解答了我所有疑问。治疗过程不疼，就像橡皮筋弹一下。效果超出预期，强烈推荐！"
              }
            ].map((review, index) => (
              <Card key={index} className="bg-white border-amber-100">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-1 mb-4">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-4 leading-relaxed">{review.content}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-300 to-orange-300 rounded-full"></div>
                    <div>
                      <p className="font-semibold">{review.name}</p>
                      <p className="text-sm text-gray-500">{review.age}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 智能预约表单 */}
      <section id="form-section" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 mb-4">
                <Zap className="w-6 h-6 text-amber-600" />
                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200">
                  AI 智能预约
                </Badge>
              </div>
              <h2 className="text-4xl font-bold mb-4">智能预约免费面诊</h2>
              <p className="text-gray-600 text-lg">
                AI 分析您的需求，推荐最适合的项目，智能匹配最佳时间
              </p>
            </div>

            <Card className="border-amber-100 shadow-xl">
              <CardContent className="pt-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* 步骤指示器 */}
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        bookingStep >= 0 ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-600'
                      }`}>
                        1
                      </div>
                      <span className="text-sm font-medium">基本信息</span>
                    </div>
                    <div className="flex-1 h-1 bg-gray-200 mx-4 rounded">
                      <div className={`h-full bg-amber-600 rounded transition-all duration-300 ${
                        bookingStep >= 1 ? 'w-full' : 'w-0'
                      }`}></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        bookingStep >= 1 ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-600'
                      }`}>
                        2
                      </div>
                      <span className="text-sm font-medium">需求分析</span>
                    </div>
                    <div className="flex-1 h-1 bg-gray-200 mx-4 rounded">
                      <div className={`h-full bg-amber-600 rounded transition-all duration-300 ${
                        bookingStep >= 2 ? 'w-full' : 'w-0'
                      }`}></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        bookingStep >= 2 ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-600'
                      }`}>
                        3
                      </div>
                      <span className="text-sm font-medium">选择时间</span>
                    </div>
                  </div>

                  {/* 步骤 1: 基本信息 */}
                  <div className={bookingStep === 0 ? "space-y-6" : "hidden"}>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="name" className="text-base flex items-center gap-2">
                          <User className="w-4 h-4" />
                          姓名 <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="请输入您的真实姓名，方便我们联系您"
                          className="mt-2 h-12"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone" className="text-base flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          手机号 <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="请输入11位手机号码，用于接收预约确认"
                          className="mt-2 h-12"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="wechat" className="text-base flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        微信号
                      </Label>
                      <Input
                        id="wechat"
                        value={formData.wechat}
                        onChange={(e) => setFormData({ ...formData, wechat: e.target.value })}
                        placeholder="方便添加您的微信（选填）"
                        className="mt-2 h-12"
                      />
                    </div>

                    <DatabaseButton
                      type="button"
                      size="lg"
                      pageKey="home"
                      buttonKey="next-step-demand-analysis"
                      fallbackText="下一步：分析需求"
                      className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-lg h-14"
                      onClick={() => setBookingStep(1)}
                      disabled={!formData.name || !formData.phone}
                    >
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </DatabaseButton>
                  </div>

                  {/* 步骤 2: 需求分析 */}
                  <div className={bookingStep === 1 ? "space-y-6" : "hidden"}>
                    <div>
                      <Label htmlFor="message" className="text-base flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        您的需求或疑问
                      </Label>
                      <Textarea
                        id="message"
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="告诉我们您的具体需求，AI 将为您推荐最适合的项目..."
                        className="mt-2 min-h-[120px]"
                      />
                    </div>

                    {formData.message && (
                      <DatabaseButton
                        type="button"
                        variant="outline"
                        pageKey="home"
                        buttonKey="ai-recommendation"
                        fallbackText="AI 智能推荐项目"
                        className="w-full border-amber-300 hover:bg-amber-50"
                        onClick={handleSmartAnalyze}
                        disabled={isAnalyzing}
                      >
                        {isAnalyzing ? (
                          <>
                            <Zap className="w-5 h-5 mr-2 animate-spin" />
                            AI 分析中...
                          </>
                        ) : (
                          <>
                            <Zap className="w-5 h-5 mr-2" />
                          </>
                        )}
                      </DatabaseButton>
                    )}

                    {smartRecommendation && (
                      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <Zap className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-amber-800 mb-1">AI 推荐结果</p>
                            <p className="text-sm text-gray-700">{smartRecommendation}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <DatabaseButton
                        type="button"
                        variant="outline"
                        pageKey="home"
                        buttonKey="previous-step"
                        fallbackText="上一步"
                        className="flex-1"
                        onClick={() => setBookingStep(0)}
                      />
                      <DatabaseButton
                        type="button"
                        pageKey="home"
                        buttonKey="next-step-select-time"
                        fallbackText="下一步：选择时间"
                        className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
                        onClick={() => setBookingStep(2)}
                      >
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </DatabaseButton>
                    </div>
                  </div>

                  {/* 步骤 3: 选择时间 */}
                  <div className={bookingStep === 2 ? "space-y-6" : "hidden"}>
                    <div>
                      <Label className="text-base flex items-center gap-2 mb-3">
                        <Calendar className="w-4 h-4" />
                        选择预约时间
                      </Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {availableSlots.map((slot, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => setSelectedSlot(slot)}
                            className={`p-3 text-sm rounded-lg border-2 transition-all ${
                              selectedSlot === slot
                                ? 'border-amber-500 bg-amber-50 text-amber-700 font-medium'
                                : 'border-gray-200 hover:border-amber-300 hover:bg-gray-50'
                            }`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>

                    {selectedSlot && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                          <div>
                            <p className="font-medium text-green-800">已选择时间</p>
                            <p className="text-sm text-green-700">{selectedSlot}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <DatabaseButton
                        type="button"
                        variant="outline"
                        pageKey="home"
                        buttonKey="previous-step"
                        fallbackText="上一步"
                        className="flex-1"
                        onClick={() => setBookingStep(1)}
                      />
                      <DatabaseButton
                        type="submit"
                        pageKey="home"
                        buttonKey="confirm-booking"
                        fallbackText="确认预约"
                        className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-lg h-14"
                        disabled={submitLead.isPending}
                      >
                        {submitLead.isPending ? (
                          <>
                            <Zap className="w-5 h-5 mr-2 animate-spin" />
                            提交中...
                          </>
                        ) : (
                          <>
                            <Send className="w-5 h-5 mr-2" />
                          </>
                        )}
                      </DatabaseButton>
                    </div>
                  </div>

                  <p className="text-center text-sm text-gray-500 mt-6">
                    <Zap className="w-4 h-4 inline mr-1" />
                    AI 驱动的智能预约系统，为您匹配最优方案
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 底部 */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold font-serif">焱磊医美</span>
            </div>
            <div className="flex items-center gap-6 text-gray-400 text-sm">
              <span>服务时间：9:00 - 21:00</span>
              <span>|</span>
              <span>© 2026 Liora Yan. All rights reserved.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
