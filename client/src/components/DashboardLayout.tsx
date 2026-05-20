import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { 
  Sparkles, 
  BarChart3, 
  MessageSquare, 
  FileText, 
  Users, 
  BookOpen, 
  Instagram, 
  PanelLeft, 
  LogOut, 
  Cog, 
  Smartphone, 
  Zap,
  TreePine,
  Bot,
  Palette,
  Moon,
  Sun
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";

// 主导航菜单 - 重新分组
const mainMenuItems = [
  { 
    icon: Bot, 
    label: "AI 助手", 
    path: "/dashboard/ai",
    description: "智能对话与咨询"
  },
  { 
    icon: BarChart3, 
    label: "数据分析", 
    path: "/dashboard/analytics",
    description: "业务洞察与报表"
  },
  { 
    icon: MessageSquare, 
    label: "对话管理", 
    path: "/dashboard/conversations",
    description: "会话记录与跟进"
  },
];

const knowledgeMenuItems = [
  { 
    icon: BookOpen, 
    label: "知识库", 
    path: "/dashboard/knowledge",
    description: "医美专业知识"
  },
  { 
    icon: TreePine, 
    label: "知识树", 
    path: "/dashboard/knowledge-tree",
    description: "结构化知识体系"
  },
];

const operationMenuItems = [
  { 
    icon: Users, 
    label: "客户管理", 
    path: "/dashboard/customers",
    description: "客户资料与画像"
  },
  { 
    icon: Zap, 
    label: "自动化", 
    path: "/dashboard/triggers",
    description: "智能工作流"
  },
  { 
    icon: Instagram, 
    label: "小红书", 
    path: "/dashboard/xiaohongshu",
    description: "内容运营"
  },
  { 
    icon: Smartphone, 
    label: "企微", 
    path: "/dashboard/wework",
    description: "企业微信管理"
  },
];

const bottomMenuItems = [
  { 
    icon: Cog, 
    label: "系统设置", 
    path: "/dashboard/admin" 
  },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 240;
const MAX_WIDTH = 400;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });
  
  const { loading, user } = useAuth({ redirectOnUnauthenticated: true });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  // 主题切换
  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent
        setSidebarWidth={setSidebarWidth}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
      >
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
  isDarkMode,
  toggleTheme,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const MenuSection = ({ 
    title, 
    items 
  }: { 
    title: string; 
    items: typeof mainMenuItems;
  }) => (
    <div className="mb-6">
      {!isCollapsed && (
        <div className="px-4 mb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {title}
          </span>
        </div>
      )}
      <SidebarMenu className="px-2 gap-1">
        {items.map(item => {
          const isActive = location === item.path;
          return (
            <SidebarMenuItem key={item.path}>
              <SidebarMenuButton
                isActive={isActive}
                onClick={() => setLocation(item.path)}
                tooltip={item.label}
                className={`
                  relative min-h-10 py-2.5 rounded-xl transition-all duration-300
                  ${isActive 
                    ? 'bg-gradient-to-r from-primary/20 to-secondary/20 text-primary font-medium border-r-2 border-primary' 
                    : 'hover:bg-accent text-foreground-muted hover:text-foreground'
                  }
                `}
              >
                <item.icon
                  className={`h-5 w-5 transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                <span className="text-sm">{item.label}</span>
                {isActive && (
                  <span className="absolute inset-0 rounded-xl bg-primary/5 animate-pulse" />
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </div>
  );

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r border-border/50 glass-card"
          disableTransition={isResizing}
        >
          {/* Logo区域 */}
          <SidebarHeader className="h-20 justify-center px-4">
            <div className="flex items-center gap-3 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-soft hover:bg-accent transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-5 w-5 text-primary" />
              </button>
              {!isCollapsed ? (
                <div className="flex flex-col min-w-0 shrink-0">
                  <button
                    type="button"
                    onClick={() => setLocation("/")}
                    className="font-heading font-bold text-xl text-gradient hover:opacity-80 transition-opacity no-underline"
                  >
                    悦美 CRM
                  </button>
                  <span className="text-xs text-muted-foreground">
                    高端医美管理
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 flex flex-col py-4">
            {/* 核心功能 */}
            <MenuSection title="核心" items={mainMenuItems} />
            
            {/* 知识库 */}
            <MenuSection title="知识" items={knowledgeMenuItems} />
            
            {/* 运营管理 */}
            <MenuSection title="运营" items={operationMenuItems} />
          </SidebarContent>

          {/* 底部区域 */}
          <SidebarFooter className="border-t border-border/50 p-4">
            {/* 主题切换 */}
            {!isCollapsed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="w-full mb-3 justify-start gap-2 text-muted-foreground hover:text-foreground"
              >
                {isDarkMode ? (
                  <>
                    <Sun className="h-4 w-4" />
                    <span>浅色模式</span>
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4" />
                    <span>深色模式</span>
                  </>
                )}
              </Button>
            )}
            
            {/* 系统设置 */}
            <SidebarMenu className="gap-1">
              {bottomMenuItems.map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`
                        min-h-10 py-2.5 rounded-xl transition-all duration-300
                        ${isActive 
                          ? 'bg-accent text-accent-foreground' 
                          : 'hover:bg-accent text-muted-foreground'
                        }
                      `}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
            
            {/* 用户信息 */}
            <div className="mt-4 pt-4 border-t border-border/50">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-accent transition-colors">
                    <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-sm font-medium">
                        {user?.name?.charAt(0) || "A"}
                      </AvatarFallback>
                    </Avatar>
                    {!isCollapsed && (
                      <div className="flex flex-col items-start text-left">
                        <span className="text-sm font-medium text-foreground">
                          {user?.name || "管理员"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {user?.email || "admin@yumei.com"}
                        </span>
                      </div>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 glass-card">
                  <DropdownMenuItem 
                    onClick={() => logout?.()}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>退出登录</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </SidebarFooter>
        </Sidebar>

        {/* 拖拽调整宽度 */}
        {!isCollapsed && !isMobile && (
          <div
            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/30 transition-colors z-50"
            onMouseDown={() => setIsResizing(true)}
          />
        )}
      </div>

      {/* 主内容区域 */}
      <SidebarInset className="bg-transparent">
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </SidebarInset>
    </>
  );
}
