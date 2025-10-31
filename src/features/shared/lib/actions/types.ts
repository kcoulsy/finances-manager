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
 * Helper type to extract toast config from action result
 */
export type ActionResultWithToast<T> = T & {
  toast?: ToastConfig;
};
