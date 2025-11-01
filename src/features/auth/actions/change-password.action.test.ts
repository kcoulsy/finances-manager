import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/features/shared/lib/auth/config";
import {
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/shared/testing/helpers";
import { changePasswordAction } from "./change-password.action";

describe("changePasswordAction", () => {
  let testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    vi.clearAllMocks();
    testUser = await setupTestUserWithSession();
  });

  it("changes password successfully with valid data", async () => {
    vi.mocked(auth.api.changePassword).mockResolvedValue(undefined);

    const result = await changePasswordAction({
      currentPassword: "oldpassword123",
      newPassword: "newpassword123",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.message).toBe("Password changed successfully");
    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.message).toBe("Password changed successfully");
    expect(result.data?.toast?.type).toBe("success");

    expect(auth.api.changePassword).toHaveBeenCalledWith(
      expect.objectContaining({
        body: {
          currentPassword: "oldpassword123",
          newPassword: "newpassword123",
          revokeOtherSessions: false,
        },
      }),
    );
  });

  it("validates required current password", async () => {
    const result = await changePasswordAction({
      currentPassword: "",
      newPassword: "newpassword123",
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("currentPassword");
    expect(result.validationErrors?.currentPassword).toHaveProperty("_errors");
    expect(
      Array.isArray(result.validationErrors?.currentPassword?._errors),
    ).toBe(true);
    expect(result.validationErrors?.currentPassword?._errors?.[0]).toBe(
      "Current password is required",
    );
  });

  it("validates new password minimum length", async () => {
    const result = await changePasswordAction({
      currentPassword: "oldpassword123",
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

  it("throws error when user is not authenticated", async () => {
    mockNoAuthSession();

    const result = await changePasswordAction({
      currentPassword: "oldpassword123",
      newPassword: "newpassword123",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("Unauthorized");
  });

  it("handles incorrect current password", async () => {
    vi.mocked(auth.api.changePassword).mockRejectedValue(
      new Error("Current password is incorrect"),
    );

    const result = await changePasswordAction({
      currentPassword: "wrongpassword",
      newPassword: "newpassword123",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("Current password is incorrect");
  });

  it("handles change password errors gracefully", async () => {
    vi.mocked(auth.api.changePassword).mockRejectedValue(
      new Error("Failed to change password"),
    );

    const result = await changePasswordAction({
      currentPassword: "oldpassword123",
      newPassword: "newpassword123",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("Failed to change password");
  });
});

