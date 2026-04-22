// 已禁用 Lenis - 使用原生滚动更自然
// Lenis 会导致低速滚动时的顿挫感（滞后-追赶-回弹）

import { ReactNode } from 'react';

interface SmoothScrollProps {
  children: ReactNode;
}

export function SmoothScroll({ children }: SmoothScrollProps) {
  // 直接返回 children，不做任何滚动劫持
  return <>{children}</>;
}
