import { beforeEach, describe, expect, it } from "vitest";
import { UserRole } from "@/features/auth/constants/roles";
import { db } from "@/features/shared/lib/db/client";
import {
  assignRolesToUser,
  createTestUser,
  mockAuthSession,
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/shared/testing/helpers";
import { getUserAction } from "./get-user.action";

describe("getUserAction", () => {
  let adminUser: TestUser;
  let testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    // Create admin user with admin role - use unique email
    const uniqueEmail = `admin-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@example.com`;
    adminUser = await setupTestUserWithSession({
      name: "Admin User",
      email: uniqueEmail,
    });
    const roleNames = await assignRolesToUser(adminUser.id, [UserRole.ADMIN]);
    // Update the session to include ADMIN role
    mockAuthSession(adminUser, roleNames);

    // Create test user to fetch - use unique email
    testUser = await createTestUser({
      name: "Test User",
      email: `test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@example.com`,
    });
  });

  it("returns user successfully with admin permission", async () => {
    const result = await getUserAction({
      userId: testUser.id,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.user).toBeDefined();
    expect(result.data?.user.id).toBe(testUser.id);
    expect(result.data?.user.name).toBe("Test User");
    expect(result.data?.user.email).toBe(testUser.email);
  });

  it("includes user roles in response", async () => {
    // Assign roles to test user
    await assignRolesToUser(testUser.id, [UserRole.MODERATOR, UserRole.USER]);

    const result = await getUserAction({
      userId: testUser.id,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.user.roles).toBeDefined();
    expect(Array.isArray(result.data?.user.roles)).toBe(true);
    expect(result.data?.user.roles.length).toBe(2);
    expect(result.data?.user.roles).toContainEqual(
      expect.objectContaining({
        name: UserRole.MODERATOR,
      }),
    );
    expect(result.data?.user.roles).toContainEqual(
      expect.objectContaining({
        name: UserRole.USER,
      }),
    );
  });

  it("returns user without roles when user has no roles", async () => {
    const result = await getUserAction({
      userId: testUser.id,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.user.roles).toBeDefined();
    expect(Array.isArray(result.data?.user.roles)).toBe(true);
    expect(result.data?.user.roles.length).toBe(0);
  });

  it("throws error when user is not found", async () => {
    const result = await getUserAction({
      userId: "non-existent-id",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("User not found");
  });

  it("throws error when user is not authenticated", async () => {
    mockNoAuthSession();

    const result = await getUserAction({
      userId: testUser.id,
    });

    expect(result.data).toBeUndefined();
    expect(result.serverError).toBeDefined();
    expect(result.serverError?.length).toBeGreaterThan(0);
  });

  it("validates required userId", async () => {
    const result = await getUserAction({
      userId: "",
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("userId");
  });

  it("handles database errors gracefully", async () => {
    // Use an invalid ID format that might cause database errors
    const result = await getUserAction({
      userId: "invalid-format",
    });

    // Should handle gracefully
    expect(result.serverError).toBeDefined();
  });
});
