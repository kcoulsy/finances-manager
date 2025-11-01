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
import { verifyUserAction } from "./verify-user.action";

describe("verifyUserAction", () => {
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

    // Create test user to verify - use unique email
    testUser = await createTestUser({
      name: "Test User",
      email: `test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@example.com`,
      emailVerified: false, // Start unverified
    });
  });

  it("verifies user successfully with admin permission", async () => {
    const result = await verifyUserAction({
      userId: testUser.id,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.user).toBeDefined();
    expect(result.data?.user.id).toBe(testUser.id);
    expect(result.data?.user.emailVerified).toBe(true);
    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.message).toBe("User verified successfully");
    expect(result.data?.toast?.type).toBe("success");
  });

  it("updates user emailVerified to true in database", async () => {
    // Verify user is initially unverified
    const userBefore = await db.user.findUnique({
      where: { id: testUser.id },
    });
    expect(userBefore?.emailVerified).toBe(false);

    await verifyUserAction({
      userId: testUser.id,
    });

    // Verify user is now verified in database
    const userAfter = await db.user.findUnique({
      where: { id: testUser.id },
    });
    expect(userAfter?.emailVerified).toBe(true);
  });

  it("can verify already verified user", async () => {
    // First verify the user
    await verifyUserAction({
      userId: testUser.id,
    });

    // Verify again (should still work)
    const result = await verifyUserAction({
      userId: testUser.id,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.user.emailVerified).toBe(true);
  });

  it("includes user roles in response", async () => {
    // Assign roles to test user
    await assignRolesToUser(testUser.id, [UserRole.USER, UserRole.MODERATOR]);

    const result = await verifyUserAction({
      userId: testUser.id,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.user.roles).toBeDefined();
    expect(Array.isArray(result.data?.user.roles)).toBe(true);
    expect(result.data?.user.roles.length).toBe(2);
  });

  it("validates required userId", async () => {
    const result = await verifyUserAction({
      userId: "",
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("userId");
  });

  it("throws error when user is not found", async () => {
    const result = await verifyUserAction({
      userId: "non-existent-id",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("User not found");
  });

  it("throws error when user is not authenticated", async () => {
    mockNoAuthSession();

    const result = await verifyUserAction({
      userId: testUser.id,
    });

    expect(result.data).toBeUndefined();
    expect(result.serverError).toBeDefined();
    expect(result.serverError?.length).toBeGreaterThan(0);
  });

  it("includes user name in toast description", async () => {
    const result = await verifyUserAction({
      userId: testUser.id,
    });

    expect(result.data?.toast?.description).toBeDefined();
    expect(result.data?.toast?.description).toContain('"Test User"');
    expect(result.data?.toast?.description).toContain("has been verified");
  });
});
