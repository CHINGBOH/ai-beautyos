import { TrendingUp, TrendingDown, Minus, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
  variant?: "default" | "gradient" | "glass";
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendValue,
  className,
  variant = "default",
}: StatCardProps) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  
  const trendColors = {
    up: "text-stone-500 bg-stone-500/10",
    down: "text-stone-500 bg-stone-500/10",
    neutral: "text-[#B8A68D] bg-stone-500/10",
  };

  const cardStyles = {
    default: "bg-card border border-border hover:border-primary/30",
    gradient: "bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/20",
    glass: "glass-card",
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl p-6 transition-all duration-300",
        "hover:shadow-lg hover:-translate-y-1 group",
        cardStyles[variant],
        className
      )}
    >
      {/* 背景装饰 */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:from-primary/10 group-hover:to-secondary/10 transition-colors" />
      
      <div className="relative">
        {/* 头部 */}
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          {trend && (
            <div className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium",
              trendColors[trend]
            )}>
              <TrendIcon className="h-3.5 w-3.5" />
              <span>{trendValue}</span>
            </div>
          )}
        </div>

        {/* 数值 */}
        <div className="space-y-1">
          <h3 className="text-3xl font-bold text-foreground tracking-tight">
            {value}
          </h3>
          <p className="text-sm font-medium text-muted-foreground">
            {title}
          </p>
        </div>

        {/* 描述 */}
        {description && (
          <p className="mt-3 text-xs text-muted-foreground/80">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

// 快速统计行组件
interface QuickStatsProps {
  stats: {
    label: string;
    value: string | number;
    change?: string;
    positive?: boolean;
  }[];
}

export function QuickStats({ stats }: QuickStatsProps) {
  return (
    <div className="flex items-center gap-6 py-4 px-6 rounded-2xl bg-gradient-to-r from-accent/50 to-transparent border border-border/50">
      {stats.map((stat, index) => (
        <div key={index} className="flex items-center gap-4">
          {index > 0 && (
            <div className="w-px h-8 bg-border" />
          )}
          <div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{stat.label}</span>
              {stat.change && (
                <span className={cn(
                  "text-xs font-medium",
                  stat.positive ? "text-stone-500" : "text-stone-500"
                )}>
                  {stat.change}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
