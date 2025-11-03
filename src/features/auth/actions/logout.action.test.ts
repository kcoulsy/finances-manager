import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/features/shared/lib/auth/config";
import {
  mockAuthSession,
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/features/shared/testing/helpers";
import { logoutAction } from "./logout.action";

describe("logoutAction", () => {
  let testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    vi.clearAllMocks();
    testUser = await setupTestUserWithSession();
  });

  it("logs out a user successfully", async () => {
    vi.mocked(auth.api.signOut).mockResolvedValue(undefined);

    // Logout action throws redirect error, so we catch it
    let redirectError: Error | null = null;
    try {
      await logoutAction();
    } catch (error) {
      redirectError = error as Error;
    }

    expect(auth.api.signOut).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.anything(),
      }),
    );

    // Should redirect to /login
    expect(redirectError).toBeDefined();
    if (redirectError) {
      expect(redirectError.message).toContain("NEXT_REDIRECT: /login");
    }
  });

  it("handles logout errors gracefully", async () => {
    vi.mocked(auth.api.signOut).mockRejectedValue(
      new Error("Session not found"),
    );

    const result = await logoutAction();

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("Session not found");
  });

  it("handles logout when no session exists", async () => {
    mockNoAuthSession();
    vi.mocked(auth.api.signOut).mockRejectedValue(
      new Error("No active session"),
    );

    const result = await logoutAction();

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.length).toBeGreaterThan(0);
  });
});
