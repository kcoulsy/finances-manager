"use client";

import { useCallback } from "react";
import { handleActionWithToast, type ToastConfig } from "./toast";

/**
 * Action result type from next-safe-action
 */
type ActionResult<TData> = {
  data?: TData;
  serverError?: string;
  validationErrors?: Record<string, string[]>;
};

/**
 * Hook that returns a function to execute actions with automatic toast handling.
 *
 * @deprecated Use `useActionWithToast` with next-safe-action's built-in `useAction` hook instead.
 * This is kept for backwards compatibility.
 *
 * @see useActionWithToast - Recommended approach using next-safe-action's useAction with callbacks
 */
export function useActionToast() {
  const executeWithToast = useCallback(
    async <TData, TInput>(
      action: (input: TInput) => Promise<ActionResult<TData>>,
      input: TInput,
      toastConfig?: ToastConfig
    ): Promise<ActionResult<TData>> => {
      const result = await action(input);
      handleActionWithToast(result, toastConfig);
      return result;
    },
    []
  );

  return { executeWithToast };
}
