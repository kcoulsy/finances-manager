import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/features/shared/lib/db/client";
import { auth } from "@/features/shared/lib/auth/config";
import {
  mockNoAuthSession,
  setupTestHooks,
} from "@/shared/testing/helpers";
import { registerAction } from "./register.action";

describe("registerAction", () => {
  setupTestHooks();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers a user successfully with valid data", async () => {
    const mockUser = {
      id: "test-user-id",
      email: "newuser@example.com",
      name: "New User",
      emailVerified: false,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(auth.api.signUpEmail).mockResolvedValue({
      user: mockUser,
    } as any);

    const result = await registerAction({
      name: "New User",
      email: "newuser@example.com",
      password: "password123",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.user).toBeDefined();
    expect(result.data?.user.email).toBe("newuser@example.com");
    expect(result.data?.user.name).toBe("New User");

    expect(auth.api.signUpEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        body: {
          name: "New User",
          email: "newuser@example.com",
          password: "password123",
        },
      }),
    );
  });

  it("validates required name", async () => {
    const result = await registerAction({
      name: "",
      email: "test@example.com",
      password: "password123",
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("name");
    expect(result.validationErrors?.name).toHaveProperty("_errors");
    expect(Array.isArray(result.validationErrors?.name?._errors)).toBe(true);
    expect(result.validationErrors?.name?._errors?.[0]).toBe(
      "Name is required",
    );
  });

  it("validates email format", async () => {
    const result = await registerAction({
      name: "Test User",
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
    const result = await registerAction({
      name: "Test User",
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

  it("handles registration errors gracefully", async () => {
    vi.mocked(auth.api.signUpEmail).mockRejectedValue(
      new Error("Email already exists"),
    );

    const result = await registerAction({
      name: "Test User",
      email: "existing@example.com",
      password: "password123",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("Email already exists");
  });

  it("handles duplicate email registration", async () => {
    // Create a user first
    const existingUser = await db.user.create({
      data: {
        name: "Existing User",
        email: "existing@example.com",
        emailVerified: true,
      },
    });

    vi.mocked(auth.api.signUpEmail).mockRejectedValue(
      new Error("Email already exists"),
    );

    const result = await registerAction({
      name: "New User",
      email: "existing@example.com",
      password: "password123",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("Email already exists");

    // Clean up
    await db.user.delete({ where: { id: existingUser.id } });
  });
});

