import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/features/shared/lib/auth/config";
import {
  mockNoAuthSession,
  setupTestHooks,
} from "@/shared/testing/helpers";
import { loginAction } from "./login.action";

describe("loginAction", () => {
  setupTestHooks();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs in a user successfully with valid credentials", async () => {
    const mockUser = {
      id: "test-user-id",
      email: "test@example.com",
      name: "Test User",
      emailVerified: true,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(auth.api.signInEmail).mockResolvedValue({
      user: mockUser,
    } as any);

    const result = await loginAction({
      email: "test@example.com",
      password: "password123",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.user).toBeDefined();
    expect(result.data?.user.email).toBe("test@example.com");
    expect(result.data?.user.name).toBe("Test User");

    expect(auth.api.signInEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        body: {
          email: "test@example.com",
          password: "password123",
        },
      }),
    );
  });

  it("validates email format", async () => {
    const result = await loginAction({
      email: "invalid-email",
      password: "password123",
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

  it("validates password minimum length", async () => {
    const result = await loginAction({
      email: "test@example.com",
      password: "short", // Less than 8 characters
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("password");
    expect(result.validationErrors?.password).toHaveProperty("_errors");
    expect(Array.isArray(result.validationErrors?.password?._errors)).toBe(
      true,
    );
    expect(result.validationErrors?.password?._errors?.[0]).toBe(
      "Password must be at least 8 characters",
    );
  });

  it("handles invalid credentials", async () => {
    vi.mocked(auth.api.signInEmail).mockRejectedValue(
      new Error("Invalid credentials"),
    );

    const result = await loginAction({
      email: "test@example.com",
      password: "wrongpassword",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("Invalid credentials");
  });

  it("handles login errors gracefully", async () => {
    vi.mocked(auth.api.signInEmail).mockRejectedValue(
      new Error("Account locked"),
    );

    const result = await loginAction({
      email: "test@example.com",
      password: "password123",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("Account locked");
  });

  it("validates required fields", async () => {
    const result = await loginAction({
      email: "",
      password: "",
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("email");
    expect(result.validationErrors).toHaveProperty("password");
  });
});

