import { useState, useCallback, useEffect, useRef } from 'react';

interface Size {
  width: number;
  height: number;
}

interface UseResizableOptions {
  initialSize: Size;
  minSize?: Size;
  maxSize?: Size;
  onResize?: (size: Size) => void;
}

const STORAGE_KEY = 'appointment-chat-size';

export function useResizable({
  initialSize,
  minSize = { width: 360, height: 400 },
  maxSize = { width: 800, height: 900 },
  onResize,
}: UseResizableOptions) {
  // 从 localStorage 读取保存的尺寸
  const [size, setSize] = useState<Size>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          width: Math.max(minSize.width, Math.min(maxSize.width, parsed.width)),
          height: Math.max(minSize.height, Math.min(maxSize.height, parsed.height)),
        };
      }
    } catch {
      // ignore
    }
    return initialSize;
  });

  const [isResizing, setIsResizing] = useState(false);
  const resizeStartPos = useRef({ x: 0, y: 0 });
  const resizeStartSize = useRef({ width: 0, height: 0 });

  // 保存尺寸到 localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(size));
    onResize?.(size);
  }, [size, onResize]);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    resizeStartPos.current = { x: e.clientX, y: e.clientY };
    resizeStartSize.current = { width: size.width, height: size.height };
  }, [size]);

  const handleResize = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const deltaX = e.clientX - resizeStartPos.current.x;
    const deltaY = e.clientY - resizeStartPos.current.y;

    const newWidth = Math.max(
      minSize.width,
      Math.min(maxSize.width, resizeStartSize.current.width + deltaX)
    );
    const newHeight = Math.max(
      minSize.height,
      Math.min(maxSize.height, resizeStartSize.current.height + deltaY)
    );

    setSize({ width: newWidth, height: newHeight });
  }, [isResizing, minSize, maxSize]);

  const stopResize = useCallback(() => {
    setIsResizing(false);
  }, []);

  // 全局事件监听
  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResize);
      window.addEventListener('mouseup', stopResize);
      document.body.style.cursor = 'se-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      window.removeEventListener('mousemove', handleResize);
      window.removeEventListener('mouseup', stopResize);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleResize, stopResize]);

  const resetSize = useCallback(() => {
    setSize(initialSize);
  }, [initialSize]);

  return {
    size,
    isResizing,
    startResize,
    resetSize,
  };
}
