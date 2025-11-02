import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/features/shared/lib/auth/config";
import { setupTestHooks } from "@/features/shared/testing/helpers";
import { forgotPasswordAction } from "./forgot-password.action";

describe("forgotPasswordAction", () => {
  setupTestHooks();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends password reset email successfully", async () => {
    // @ts-expect-error - mockResolvedValue expects a value, but we don't need to return anything
    vi.mocked(auth.api.requestPasswordReset).mockResolvedValue(undefined);

    const result = await forgotPasswordAction({
      email: "test@example.com",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.message).toBe("Password reset email sent");

    expect(auth.api.requestPasswordReset).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          email: "test@example.com",
          redirectTo: expect.stringContaining("/reset-password"),
        }),
      }),
    );
  });

  it("validates email format", async () => {
    const result = await forgotPasswordAction({
      email: "invalid-email",
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("email");
    expect(result.validationErrors?.email).toHaveProperty("_errors");
    expect(Array.isArray(result.validationErrors?.email?._errors)).toBe(true);
    expect(result.validationErrors?.email?._errors?.[0]).toBe(
      "Invalid email address",
    );
  });

  it("returns success even when email does not exist (prevent email enumeration)", async () => {
    vi.mocked(auth.api.requestPasswordReset).mockRejectedValue(
      new Error("Email not found"),
    );

    const result = await forgotPasswordAction({
      email: "nonexistent@example.com",
    });

    // Should still return success to prevent email enumeration attacks
    expect(result.data?.success).toBe(true);
    expect(result.data?.message).toContain(
      "If an account exists, a password reset email has been sent",
    );
  });

  it("handles errors gracefully and returns success message", async () => {
    vi.mocked(auth.api.requestPasswordReset).mockRejectedValue(
      new Error("Service unavailable"),
    );

    const result = await forgotPasswordAction({
      email: "test@example.com",
    });

    // Better Auth security: always return success to prevent email enumeration
    expect(result.data?.success).toBe(true);
    expect(result.data?.message).toContain(
      "If an account exists, a password reset email has been sent",
    );
  });

  it("validates required email", async () => {
    const result = await forgotPasswordAction({
      email: "",
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("email");
  });
});

