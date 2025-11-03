"use client";

import { useAction } from "next-safe-action/hooks";
import { showToastFromAction, type ToastConfig } from "./toast";

interface UseActionWithToastOptions {
  showToasts?: boolean;
  successToast?: ToastConfig;
  errorToast?: ToastConfig;
  onSuccess?: (args: { data: unknown; input: unknown }) => void | Promise<void>;
  onError?: (args: { error: unknown; input: unknown }) => void | Promise<void>;
  onExecute?: (args: { input: unknown }) => void | Promise<void>;
  onSettled?: (args: {
    result: unknown;
    input: unknown;
  }) => void | Promise<void>;
}
/**
 * Hook that wraps useAction from next-safe-action with automatic toast handling
 * using hook callbacks (onSuccess, onError).
 *
 * @see https://next-safe-action.dev/docs/execute-actions/hooks/hook-callbacks
 */
export function useActionWithToast(
  // biome-ignore lint/suspicious/noExplicitAny: happy to use any
  action: any,
  options?: UseActionWithToastOptions,
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
