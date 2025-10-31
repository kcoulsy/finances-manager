"use client";

import { toast } from "sonner";

/**
 * Toast configuration that can be returned from server actions
 */
export type ToastConfig = {
  message: string;
  type?: "success" | "error" | "info" | "warning";
  description?: string;
  duration?: number;
};

/**
 * Action result type from next-safe-action
 */
type ActionResult<TData> = {
  data?: TData;
  serverError?: string;
  validationErrors?: Record<string, string[]>;
};

/**
 * Helper to show toast from action result
 */
export function showToastFromAction<TData>(
  result: ActionResult<TData>,
  customToast?: ToastConfig
) {
  // Check if there's a custom toast provided
  if (customToast) {
    const { message, type = "success", description, duration } = customToast;
    switch (type) {
      case "success":
        toast.success(message, { description, duration });
        break;
      case "error":
        toast.error(message, { description, duration });
        break;
      case "info":
        toast.info(message, { description, duration });
        break;
      case "warning":
        toast.warning(message, { description, duration });
        break;
    }
    return;
  }

  // Handle server errors (from middleware)
  if (result?.serverError) {
    // Automatically show error toast for server errors
    toast.error(result.serverError);
    return;
  }

  // Handle success with toast metadata
  if (result?.data && typeof result.data === "object") {
    const toastConfig = (result.data as { toast?: ToastConfig }).toast;
    if (toastConfig) {
      const { message, type = "success", description, duration } = toastConfig;
      switch (type) {
        case "success":
          toast.success(message, { description, duration });
          break;
        case "error":
          toast.error(message, { description, duration });
          break;
        case "info":
          toast.info(message, { description, duration });
          break;
        case "warning":
          toast.warning(message, { description, duration });
          break;
      }
    }
  }
}

/**
 * Helper to handle action result with automatic toast display
 * Returns the result after showing toast
 */
export function handleActionWithToast<TData>(
  result: ActionResult<TData>,
  customToast?: ToastConfig
): ActionResult<TData> {
  showToastFromAction(result, customToast);
  return result;
}
