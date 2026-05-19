import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { useButtonContent } from "@/hooks/useButtonContent";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-[#B8A68D] text-white hover:bg-[#A69479]",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-transparent shadow-xs hover:bg-accent dark:bg-transparent dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
        brand:
          "bg-brand text-white focus-visible:ring-primary/20 shadow-sm rounded-lg transition-[opacity,box-shadow] duration-[var(--motion-duration)] ease-[var(--motion-ease)] hover:opacity-95",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface DatabaseButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  pageKey: string;  // 页面标识
  buttonKey: string; // 按钮标识
  fallbackText?: string; // 备用文本
  showLoading?: boolean; // 是否显示加载状态
}

const DatabaseButton = React.forwardRef<HTMLButtonElement, DatabaseButtonProps>(
  ({ className, variant, size, asChild = false, pageKey, buttonKey, fallbackText = '', showLoading = false, ...props }, ref) => {
    const { content, loading, error } = useButtonContent(pageKey, buttonKey);
    
    const Comp = asChild ? Slot : "button";
    
    // 使用数据库内容或备用文本，绝不向用户展示英文 key
    const fromApi = (content?.linkText || content?.content || "").trim();
    const isKeyLike = (t: string) => /^[a-z][a-z0-9-]*$/.test(t) && t.length < 40;
    const buttonText = (fromApi && !isKeyLike(fromApi) ? fromApi : null) ?? (fallbackText || "按钮");
    
    // 按钮文案加载不能阻塞真实功能；默认先展示 fallback，只有显式要求时才显示加载态。
    if (loading && showLoading && !fallbackText) {
      return (
        <Comp
          ref={ref}
          data-slot="button"
          className={cn(buttonVariants({ variant, size, className }))}
          disabled
          {...props}
        >
          加载中...
        </Comp>
      );
    }
    
    // 如果有错误，使用备用文本，绝不展示英文 key
    if (error) {
      console.warn(`Failed to load button content for ${pageKey}:${buttonKey}`, error);
      return (
        <Comp
          ref={ref}
          data-slot="button"
          className={cn(buttonVariants({ variant, size, className }))}
          {...props}
        >
          {fallbackText || "按钮"}
        </Comp>
      );
    }
    
    return (
      <Comp
        ref={ref}
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {buttonText}
      </Comp>
    );
  }
);

DatabaseButton.displayName = "DatabaseButton";

export { DatabaseButton, buttonVariants };