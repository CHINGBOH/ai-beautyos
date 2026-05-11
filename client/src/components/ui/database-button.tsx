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
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-transparent shadow-xs hover:bg-accent dark:bg-transparent dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
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
  ({ className, variant, size, asChild = false, pageKey, buttonKey, fallbackText = '', showLoading = true, ...props }, ref) => {
    const { content, loading, error } = useButtonContent(pageKey, buttonKey);
    
    const Comp = asChild ? Slot : "button";
    
    // 使用数据库内容或备用文本
    const buttonText = content?.linkText || content?.content || fallbackText || buttonKey;
    
    // 如果正在加载且需要显示加载状态，则显示加载文本
    if (loading && showLoading) {
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
    
    // 如果有错误且有备用文本，则使用备用文本，否则使用按钮键
    if (error) {
      console.warn(`Failed to load button content for ${pageKey}:${buttonKey}`, error);
      return (
        <Comp
          ref={ref}
          data-slot="button"
          className={cn(buttonVariants({ variant, size, className }))}
          {...props}
        >
          {fallbackText || buttonKey}
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