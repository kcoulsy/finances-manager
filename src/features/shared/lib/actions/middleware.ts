/**
 * Error handling middleware that logs errors and formats them for client-side display.
 * The client-side toast utility will automatically show error toasts.
 */
export const errorToastMiddleware = (
  error: Error,
  utils: {
    clientInput: unknown;
    bindArgsClientInputs: unknown[];
    ctx: object;
    metadata: undefined;
  }
): string => {
  // Log the error for debugging
  console.error("Action error:", {
    error,
    input: utils.clientInput,
    ctx: utils.ctx,
  });

  // Extract error message
  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "An unexpected error occurred";

  // Return the error message
  // The client-side utility will automatically show a toast for serverError
  return errorMessage;
};
