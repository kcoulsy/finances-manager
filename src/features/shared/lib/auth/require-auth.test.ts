import { beforeEach, describe, expect, it } from "vitest";
import {
  mockAuthSession,
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/features/shared/testing/helpers";
import { requireAuth, requireNoAuth } from "./require-auth";

describe("requireAuth", () => {
  let testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    testUser = await setupTestUserWithSession();
  });

  it("returns session when user is authenticated", async () => {
    mockAuthSession(testUser);

    const session = await requireAuth();

    expect(session).toBeDefined();
    expect(session?.user).toBeDefined();
    expect(session?.user.id).toBe(testUser.id);
    expect(session?.user.email).toBe(testUser.email);
  });

  it("redirects to login when user is not authenticated", async () => {
    mockNoAuthSession();

    try {
      await requireAuth();
      // Should not reach here - redirect should throw
      expect(true).toBe(false);
    } catch (error) {
      // redirect() throws an error in tests
      expect(error).toBeDefined();
      expect(error instanceof Error).toBe(true);
      const redirectError = error as Error & { digest?: string };
      expect(redirectError.message).toContain("NEXT_REDIRECT");
      expect(redirectError.digest).toContain("/login");
    }
  });

  it("redirects to login when session is null", async () => {
    mockNoAuthSession();

    try {
      await requireAuth();
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeDefined();
      expect(error instanceof Error).toBe(true);
      const redirectError = error as Error & { digest?: string };
      expect(redirectError.message).toContain("NEXT_REDIRECT");
      expect(redirectError.digest).toContain("/login");
    }
  });
});

describe("requireNoAuth", () => {
  let testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    testUser = await setupTestUserWithSession();
  });

  it("does not redirect when user is not authenticated", async () => {
    mockNoAuthSession();

    // Should not throw - no redirect
    await requireNoAuth();
  });

  it("redirects to dashboard when user is authenticated", async () => {
    mockAuthSession(testUser);

    try {
      await requireNoAuth();
      // Should not reach here - redirect should throw
      expect(true).toBe(false);
    } catch (error) {
      // redirect() throws an error in tests
      expect(error).toBeDefined();
      expect(error instanceof Error).toBe(true);
      const redirectError = error as Error & { digest?: string };
      expect(redirectError.message).toContain("NEXT_REDIRECT");
      expect(redirectError.digest).toContain("/dashboard");
    }
  });

  it("redirects to dashboard when session exists", async () => {
    mockAuthSession(testUser);

    try {
      await requireNoAuth();
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeDefined();
      expect(error instanceof Error).toBe(true);
      const redirectError = error as Error & { digest?: string };
      expect(redirectError.message).toContain("NEXT_REDIRECT");
      expect(redirectError.digest).toContain("/dashboard");
    }
  });
});
