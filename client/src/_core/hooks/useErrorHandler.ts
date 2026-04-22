/**
 * 统一的错误处理 Hook
 * 提供用户友好的错误提示
 */

import { useCallback } from "react";
import { toast } from "sonner";
import { TRPCClientError } from "@trpc/client";

export interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  defaultMessage?: string;
}

/**
 * 统一的错误处理 Hook
 */
export function useErrorHandler() {
  const handleError = useCallback(
    (error: unknown, options: ErrorHandlerOptions = {}) => {
      const {
        showToast = true,
        logError = true,
        defaultMessage = "操作失败，请稍后重试",
      } = options;

      // 记录错误日志
      if (logError) {
        console.error("[Error Handler]:", error);
      }

      // 提取错误消息
      let errorMessage = defaultMessage;

      if (error instanceof TRPCClientError) {
        errorMessage = error.message || error.data?.message || defaultMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message || defaultMessage;
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      // 显示用户友好的错误提示
      if (showToast) {
        toast.error(errorMessage);
      }

      return errorMessage;
    },
    []
  );

  const handleAsyncError = useCallback(
    async <T>(
      fn: () => Promise<T>,
      options: ErrorHandlerOptions = {}
    ): Promise<T | null> => {
      try {
        return await fn();
      } catch (error) {
        handleError(error, options);
        return null;
      }
    },
    [handleError]
  );

  return {
    handleError,
    handleAsyncError,
  };
}
