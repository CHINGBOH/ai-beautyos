import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export function Footer() {
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const socialDetails: Record<
    string,
    { title: string; body: string; action: string }
  > = {
    微信: {
      title: "微信咨询",
      body: "添加官方微信客服，可预约面诊、查看项目资料并接收术后护理提醒。",
      action: "微信号：LUMIERE-Beauty",
    },
    微博: {
      title: "微博主页",
      body: "微博用于发布品牌动态、活动公告和医生科普内容。",
      action: "账号：LUMIERE医美",
    },
    小红书: {
      title: "小红书主页",
      body: "小红书用于查看真实案例、项目笔记和顾客体验反馈。",
      action: "账号：LUMIERE高端医美",
    },
    抖音: {
      title: "抖音主页",
      body: "抖音用于观看项目讲解、探店视频和医生短视频科普。",
      action: "账号：LUMIERE美学中心",
    },
  };
  const policyDetails: Record<string, { title: string; body: string[] }> = {
    privacy: {
      title: "隐私政策",
      body: [
        "我们仅收集预约咨询所需的姓名、电话、关注项目和沟通记录，用于顾问跟进与服务安排。",
        "客户资料不会出售或提供给无关第三方；如需删除或更正资料，可通过官方客服提交申请。",
      ],
    },
    terms: {
      title: "服务条款",
      body: [
        "页面展示的项目介绍、案例和价格信息仅供咨询参考，实际方案以到院面诊和医生评估为准。",
        "预约提交后顾问会联系确认时间；如需取消或改期，可在到店前联系顾问处理。",
      ],
    },
    icp: {
      title: "备案信息",
      body: [
        "沪ICP备12345678号",
        "主体、许可证和门店资质信息可在到店或咨询时由顾问提供核验。",
      ],
    },
  };
  const activeSocial = activePanel ? socialDetails[activePanel] : null;
  const activePolicy = activePanel ? policyDetails[activePanel] : null;

  return (
    <footer className="bg-[#EFE7DA] text-[#6F5847] py-16 px-6 lg:px-16 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-[#DED2C4]" />
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-2">
            <Link href="/">
              <h3 className="text-2xl font-light text-[#3D3027] mb-4 tracking-[0.2em] cursor-pointer">
                LUMIÈRE
              </h3>
            </Link>
            <p className="text-sm leading-relaxed max-w-md mb-6">
              以科技之力，重塑东方美学。我们相信，每一位女性都值得拥有自信的光芒。
            </p>
            <div className="flex gap-4">
              {Object.keys(socialDetails).map(social => (
                <button
                  key={social}
                  type="button"
                  onClick={() => setActivePanel(social)}
                  className="w-10 h-10 rounded-full border border-[#CDBFAF] flex items-center justify-center hover:border-[#6F5847] hover:text-[#3D3027] transition-colors text-xs"
                  aria-label={social}
                >
                  {social[0]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-[#3D3027] text-sm font-medium mb-4 tracking-wider">
              快速链接
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/services">
                  <span className="hover:text-[#3D3027] transition-colors cursor-pointer">
                    服务项目
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/cases">
                  <span className="hover:text-[#3D3027] transition-colors cursor-pointer">
                    真实案例
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/about">
                  <span className="hover:text-[#3D3027] transition-colors cursor-pointer">
                    关于我们
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/#cta">
                  <span className="hover:text-[#3D3027] transition-colors cursor-pointer">
                    预约咨询
                  </span>
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-[#3D3027] text-sm font-medium mb-4 tracking-wider">
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

        <div className="border-t border-[#D8CBBB] pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <p>© 2024 LUMIÈRE. All rights reserved.</p>
          <div className="flex gap-6">
            <button
              type="button"
              onClick={() => setActivePanel("privacy")}
              className="hover:text-[#3D3027] transition-colors"
            >
              隐私政策
            </button>
            <button
              type="button"
              onClick={() => setActivePanel("terms")}
              className="hover:text-[#3D3027] transition-colors"
            >
              服务条款
            </button>
            <button
              type="button"
              onClick={() => setActivePanel("icp")}
              className="hover:text-[#3D3027] transition-colors"
            >
              沪ICP备12345678号
            </button>
          </div>
        </div>
      </div>

      {activePanel && (activeSocial || activePolicy) && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[#1f1712]/50 px-4"
          onClick={() => setActivePanel(null)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-[#FBF8F3] p-6 shadow-2xl text-[#3D3027]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <h3 className="text-xl font-medium">
                {activeSocial?.title || activePolicy?.title}
              </h3>
              <button
                type="button"
                onClick={() => setActivePanel(null)}
                className="text-[#6F5847] hover:text-[#3D3027]"
              >
                关闭
              </button>
            </div>
            {activeSocial ? (
              <div className="space-y-4 text-sm leading-relaxed">
                <p>{activeSocial.body}</p>
                <div className="rounded-lg border border-[#D8CBBB] bg-white/70 p-4 font-medium">
                  {activeSocial.action}
                </div>
                <Link href="/#cta">
                  <Button
                    className="w-full bg-[#6F5847] hover:bg-[#3D3027] text-white"
                    onClick={() => setActivePanel(null)}
                  >
                    预约咨询
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3 text-sm leading-relaxed">
                {activePolicy?.body.map((item, index) => (
                  <p key={index}>{item}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </footer>
  );
}
