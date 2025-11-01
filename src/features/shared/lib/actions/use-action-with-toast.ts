"use client";

import { useAction } from "next-safe-action/hooks";
import { showToastFromAction, type ToastConfig } from "./toast";

/**
 * Hook that wraps useAction from next-safe-action with automatic toast handling
 * using hook callbacks (onSuccess, onError).
 *
 * @see https://next-safe-action.dev/docs/execute-actions/hooks/hook-callbacks
 */
export function useActionWithToast(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action: any,
  options?: {
    /** Custom toast config to show on success (overrides toast from action result) */
    successToast?: ToastConfig;
    /** Custom toast config to show on error (overrides error toast) */
    errorToast?: ToastConfig;
    /** Whether to show toasts automatically (default: true) */
    showToasts?: boolean;
    /** Custom onSuccess callback (runs after toast is shown) */
    onSuccess?: (args: { data: any; input: any }) => void | Promise<void>;
    /** Custom onError callback (runs after toast is shown) */
    onError?: (args: { error: any; input: any }) => void | Promise<void>;
    /** Custom onExecute callback */
    onExecute?: (args: { input: any }) => void | Promise<void>;
    /** Custom onSettled callback */
    onSettled?: (args: { result: any; input: any }) => void | Promise<void>;
  },
) {
  const {
    showToasts = true,
    successToast,
    errorToast,
    onSuccess: customOnSuccess,
    onError: customOnError,
    onExecute,
    onSettled,
  } = options || {};

  return useAction(action, {
    onExecute,
    onSuccess: async ({ data, input }) => {
      if (showToasts) {
        // Use custom success toast if provided
        if (successToast) {
          showToastFromAction({ data }, successToast);
        } else {
          // Otherwise check for toast in action result
          showToastFromAction({ data });
        }
      }

      // Call custom onSuccess if provided
      if (customOnSuccess) {
        await customOnSuccess({ data, input });
      }
    },
    onError: async ({ error, input }) => {
      if (showToasts) {
        // Use custom error toast if provided
        if (errorToast) {
          showToastFromAction(
            {
              serverError:
                typeof error.serverError === "string"
                  ? error.serverError
                  : String(error.serverError),
            },
            errorToast,
          );
        } else {
          // Otherwise show error from result (error has serverError property)
          const serverError =
            typeof error.serverError === "string"
              ? error.serverError
              : error.serverError
                ? String(error.serverError)
                : undefined;
          showToastFromAction({ serverError });
        }
      }

      // Call custom onError if provided
      if (customOnError) {
        await customOnError({ error, input });
      }
    },
    onSettled,
  });
}
