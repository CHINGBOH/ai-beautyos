import { useState, useCallback, useEffect, useRef } from 'react';

interface Position {
  x: number;
  y: number;
}

interface UseDraggableOptions {
  initialPosition?: Position;
  boundaryPadding?: number;
  onDrag?: (position: Position) => void;
}

const STORAGE_KEY = 'appointment-chat-position';

export function useDraggable({
  initialPosition = { x: -1, y: -1 }, // -1 表示使用默认位置（右下角）
  boundaryPadding = 16,
  onDrag,
}: UseDraggableOptions = {}) {
  // 从 localStorage 读取保存的位置
  const [position, setPosition] = useState<Position>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return initialPosition;
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragStartMouse = useRef({ x: 0, y: 0 });
  const elementRef = useRef<HTMLDivElement>(null);

  // 保存位置到 localStorage
  useEffect(() => {
    if (position.x >= 0 && position.y >= 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
      onDrag?.(position);
    }
  }, [position, onDrag]);

  const startDrag = useCallback((e: React.MouseEvent) => {
    // 只有左键可以拖动
    if (e.button !== 0) return;
    
    e.preventDefault();
    
    setIsDragging(true);
    dragStartMouse.current = { x: e.clientX, y: e.clientY };
    dragStartPos.current = { ...position };
  }, [position]);

  const handleDrag = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartMouse.current.x;
    const deltaY = e.clientY - dragStartMouse.current.y;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const elementWidth = elementRef.current?.offsetWidth || 480;
    const elementHeight = elementRef.current?.offsetHeight || 640;

    let newX: number;
    let newY: number;

    // 如果没有设置过位置（使用默认右下角），直接计算默认位置
    if (dragStartPos.current.x < 0 || dragStartPos.current.y < 0) {
      newX = viewportWidth - elementWidth - boundaryPadding;
      newY = viewportHeight - elementHeight - boundaryPadding;
    } else {
      // 计算新位置，限制在视口内
      newX = dragStartPos.current.x + deltaX;
      newY = dragStartPos.current.y + deltaY;

      // 边界限制
      newX = Math.max(
        boundaryPadding,
        Math.min(viewportWidth - elementWidth - boundaryPadding, newX)
      );
      newY = Math.max(
        boundaryPadding,
        Math.min(viewportHeight - elementHeight - boundaryPadding, newY)
      );
    }

    setPosition({ x: newX, y: newY });
  }, [isDragging, boundaryPadding]);

  const stopDrag = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 全局事件监听
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', stopDrag);
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    }

    return () => {
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('mouseup', stopDrag);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleDrag, stopDrag]);

  // 窗口大小改变时重新计算位置
  useEffect(() => {
    const handleResize = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const elementWidth = elementRef.current?.offsetWidth || 480;
      const elementHeight = elementRef.current?.offsetHeight || 640;

      setPosition(prev => {
        if (prev.x < 0 || prev.y < 0) return prev; // 使用默认位置
        
        return {
          x: Math.min(prev.x, viewportWidth - elementWidth - boundaryPadding),
          y: Math.min(prev.y, viewportHeight - elementHeight - boundaryPadding),
        };
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [boundaryPadding]);

  const resetPosition = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setPosition(initialPosition);
  }, [initialPosition]);

  // 获取样式位置
  const positionStyle = position.x >= 0 && position.y >= 0
    ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' }
    : { right: boundaryPadding, bottom: boundaryPadding };

  return {
    position,
    positionStyle,
    isDragging,
    startDrag,
    resetPosition,
    elementRef,
  };
}
