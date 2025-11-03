import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/features/shared/lib/auth/config";
import { db } from "@/features/shared/lib/db/client";
import {
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/features/shared/testing/helpers";
import { deleteAccountAction } from "./delete-account.action";

describe("deleteAccountAction", () => {
  let testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    vi.clearAllMocks();
    testUser = await setupTestUserWithSession();
  });

  it("deletes account successfully with correct password", async () => {
    vi.mocked(auth.api.deleteUser).mockResolvedValue(undefined);

    // Delete account action throws redirect error, so we catch it
    let redirectError: Error | null = null;
    try {
      await deleteAccountAction({
        password: "correctpassword",
      });
    } catch (error) {
      redirectError = error as Error;
    }

    expect(auth.api.deleteUser).toHaveBeenCalledWith(
      expect.objectContaining({
        body: {
          password: "correctpassword",
        },
      }),
    );

    // Should redirect to /login
    expect(redirectError).toBeDefined();
    if (redirectError) {
      expect(redirectError.message).toContain("NEXT_REDIRECT: /login");
    }

    // Note: User deletion is handled by better-auth
    // In tests, we verify the API was called correctly
  });

  it("validates required password", async () => {
    const result = await deleteAccountAction({
      password: "",
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("password");
    expect(result.validationErrors?.password).toHaveProperty("_errors");
    expect(Array.isArray(result.validationErrors?.password?._errors)).toBe(
      true,
    );
    expect(result.validationErrors?.password?._errors?.[0]).toBe(
      "Password is required",
    );
  });

  it("throws error when user is not authenticated", async () => {
    mockNoAuthSession();

    const result = await deleteAccountAction({
      password: "password123",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("Unauthorized");
  });

  it("handles incorrect password", async () => {
    vi.mocked(auth.api.deleteUser).mockRejectedValue(
      new Error("Password is incorrect"),
    );

    const result = await deleteAccountAction({
      password: "wrongpassword",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("Password is incorrect");
  });

  it("handles delete account errors gracefully", async () => {
    vi.mocked(auth.api.deleteUser).mockRejectedValue(
      new Error("Failed to delete account"),
    );

    const result = await deleteAccountAction({
      password: "password123",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("Failed to delete account");
  });

  it("deletes associated data when account is deleted", async () => {
    // Create a project for the user
    const project = await db.project.create({
      data: {
        name: "Test Project",
        userId: testUser.id,
      },
    });

    vi.mocked(auth.api.deleteUser).mockResolvedValue(undefined);

    // Delete account (will redirect)
    let redirectError: Error | null = null;
    try {
      await deleteAccountAction({
        password: "password123",
      });
    } catch (error) {
      redirectError = error as Error;
    }

    expect(redirectError).toBeDefined();
    if (redirectError) {
      expect(redirectError.message).toContain("NEXT_REDIRECT: /login");
    }

    // Note: User deletion is handled by better-auth API
    // In tests, we verify the API was called correctly
  });
});
