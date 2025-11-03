import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/features/shared/lib/auth/config";
import { setupTestHooks } from "@/features/shared/testing/helpers";
import { resetPasswordAction } from "./reset-password.action";

describe("resetPasswordAction", () => {
  setupTestHooks();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resets password successfully with valid token", async () => {
    vi.mocked(auth.api.resetPassword).mockResolvedValue({
      user: {
        id: "test-user-id",
        email: "test@example.com",
      },
    } as any);

    const result = await resetPasswordAction({
      token: "valid-reset-token",
      newPassword: "newpassword123",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.message).toBe("Password reset successfully");

    expect(auth.api.resetPassword).toHaveBeenCalledWith(
      expect.objectContaining({
        body: {
          token: "valid-reset-token",
          newPassword: "newpassword123",
        },
      }),
    );
  });

  it("validates required token", async () => {
    const result = await resetPasswordAction({
      token: "",
      newPassword: "newpassword123",
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("token");
    expect(result.validationErrors?.token).toHaveProperty("_errors");
    expect(Array.isArray(result.validationErrors?.token?._errors)).toBe(true);
    expect(result.validationErrors?.token?._errors?.[0]).toBe(
      "Token is required",
    );
  });

  it("validates new password minimum length", async () => {
    const result = await resetPasswordAction({
      token: "valid-token",
      newPassword: "short", // Less than 8 characters
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("newPassword");
    expect(result.validationErrors?.newPassword).toHaveProperty("_errors");
    expect(Array.isArray(result.validationErrors?.newPassword?._errors)).toBe(
      true,
    );
    expect(result.validationErrors?.newPassword?._errors?.[0]).toBe(
      "Password must be at least 8 characters",
    );
  });

  it("handles invalid token", async () => {
    vi.mocked(auth.api.resetPassword).mockResolvedValue(null);

    const result = await resetPasswordAction({
      token: "invalid-token",
      newPassword: "newpassword123",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("Failed to reset password");
  });

  it("handles expired token", async () => {
    vi.mocked(auth.api.resetPassword).mockResolvedValue(null);

    const result = await resetPasswordAction({
      token: "expired-token",
      newPassword: "newpassword123",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("Failed to reset password");
  });

  it("handles reset password errors gracefully", async () => {
    vi.mocked(auth.api.resetPassword).mockRejectedValue(
      new Error("Token is invalid"),
    );

    const result = await resetPasswordAction({
      token: "invalid-token",
      newPassword: "newpassword123",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.length).toBeGreaterThan(0);
  });
});
