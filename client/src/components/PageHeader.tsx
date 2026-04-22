import { ChevronRight, Home, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { useLocation } from "wouter";

interface Breadcrumb {
  label: string;
  path?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps) {
  const [, setLocation] = useLocation();

  return (
    <div className={cn("mb-8", className)}>
      {/* 面包屑导航 */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 hover:text-primary"
            onClick={() => setLocation("/")}
          >
            <Home className="h-4 w-4" />
          </Button>
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4" />
              {crumb.path ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 hover:text-primary"
                  onClick={() => setLocation(crumb.path!)}
                >
                  {crumb.label}
                </Button>
              ) : (
                <span className="text-foreground font-medium">
                  {crumb.label}
                </span>
              )}
            </div>
          ))}
        </nav>
      )}

      {/* 标题区域 */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {Icon && (
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20">
              <Icon className="h-6 w-6 text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold text-gradient">{title}</h1>
            {description && (
              <p className="mt-1 text-muted-foreground max-w-2xl">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* 分隔线 */}
      <div className="mt-6 h-px bg-gradient-to-r from-border via-border/50 to-transparent" />
    </div>
  );
}

// 标签页切换组件
interface TabItem {
  id: string;
  label: string;
  count?: number;
}

interface PageTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function PageTabs({
  tabs,
  activeTab,
  onTabChange,
  className,
}: PageTabsProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 p-1 rounded-xl bg-muted/50",
        className
      )}
    >
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300",
            activeTab === tab.id
              ? "text-primary bg-card shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          {tab.label}
          {tab.count !== undefined && tab.count > 0 && (
            <span
              className={cn(
                "ml-2 px-1.5 py-0.5 rounded-full text-xs",
                activeTab === tab.id
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {tab.count}
            </span>
          )}
          {activeTab === tab.id && (
            <span className="absolute inset-0 rounded-lg ring-1 ring-primary/20" />
          )}
        </button>
      ))}
    </div>
  );
}
