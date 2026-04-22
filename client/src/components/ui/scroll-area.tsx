import * as React from "react";
import { cn } from "@/lib/utils";

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function ScrollArea({ className, children, ...props }: ScrollAreaProps) {
  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className={cn("overflow-y-auto overflow-x-hidden h-full", className)}
      style={{ touchAction: 'pan-y' }}
      onWheel={handleWheel}
      {...props}
    >
      {children}
    </div>
  );
}

export function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { orientation?: "vertical" | "horizontal" }) {
  if (orientation === "horizontal") return null;

  return (
    <div
      className={cn(
        "w-2.5 h-full border-l border-l-transparent",
        className
      )}
      {...props}
    >
      <div className="bg-border relative flex-1 rounded-full min-h-full" />
    </div>
  );
}

function ScrollAreaThumb({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("bg-border relative flex-1 rounded-full", className)} {...props} />;
}
