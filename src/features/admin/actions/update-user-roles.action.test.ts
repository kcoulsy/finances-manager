import { beforeEach, describe, expect, it } from "vitest";
import { UserRole } from "@/features/auth/constants/roles";
import { db } from "@/features/shared/lib/db/client";
import {
  assignRolesToUser,
  createTestRole,
  createTestUser,
  mockAuthSession,
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/features/shared/testing/helpers";
import { updateUserRolesAction } from "./update-user-roles.action";

describe("updateUserRolesAction", () => {
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

    // Create test user to update roles for - use unique email
    testUser = await createTestUser({
      name: "Test User",
      email: `test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@example.com`,
    });
  });

  it("updates user roles successfully with admin permission", async () => {
    // Create roles
    const moderatorRole = await createTestRole(UserRole.MODERATOR);
    const userRole = await createTestRole(UserRole.USER);

    const result = await updateUserRolesAction({
      userId: testUser.id,
      roleIds: [moderatorRole.id, userRole.id],
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.user).toBeDefined();
    expect(result.data?.user.id).toBe(testUser.id);
    expect(result.data?.user.roles.length).toBe(2);
    expect(result.data?.user.roles.map((r) => r.name)).toContain(
      UserRole.MODERATOR,
    );
    expect(result.data?.user.roles.map((r) => r.name)).toContain(UserRole.USER);
    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.message).toBe("User roles updated successfully");
    expect(result.data?.toast?.type).toBe("success");
  });

  it("replaces existing roles with new ones", async () => {
    // Initially assign USER role
    const userRole = await createTestRole(UserRole.USER);
    await assignRolesToUser(testUser.id, [UserRole.USER]);

    // Update to MODERATOR role only
    const moderatorRole = await createTestRole(UserRole.MODERATOR);
    const result = await updateUserRolesAction({
      userId: testUser.id,
      roleIds: [moderatorRole.id],
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.user.roles.length).toBe(1);
    expect(result.data?.user.roles[0]?.name).toBe(UserRole.MODERATOR);
    expect(result.data?.user.roles.map((r) => r.name)).not.toContain(
      UserRole.USER,
    );
  });

  it("can remove all roles", async () => {
    // Initially assign a role
    await assignRolesToUser(testUser.id, [UserRole.USER]);

    // Update to empty roles array - should fail validation (at least one role required)
    const result = await updateUserRolesAction({
      userId: testUser.id,
      roleIds: [],
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("roleIds");
  });

  it("validates at least one role is required", async () => {
    const result = await updateUserRolesAction({
      userId: testUser.id,
      roleIds: [], // Empty array should fail validation
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("roleIds");
  });

  it("validates required userId", async () => {
    const role = await createTestRole(UserRole.USER);

    const result = await updateUserRolesAction({
      userId: "",
      roleIds: [role.id],
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("userId");
  });

  it("throws error when user is not found", async () => {
    const role = await createTestRole(UserRole.USER);

    const result = await updateUserRolesAction({
      userId: "non-existent-id",
      roleIds: [role.id],
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("User not found");
  });

  it("throws error when role is not found", async () => {
    const result = await updateUserRolesAction({
      userId: testUser.id,
      roleIds: ["non-existent-role-id"],
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("One or more roles not found");
  });

  it("throws error when some roles are not found", async () => {
    const validRole = await createTestRole(UserRole.USER);

    const result = await updateUserRolesAction({
      userId: testUser.id,
      roleIds: [validRole.id, "non-existent-role-id"],
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("One or more roles not found");
  });

  it("throws error when user is not authenticated", async () => {
    mockNoAuthSession();

    const role = await createTestRole(UserRole.USER);

    const result = await updateUserRolesAction({
      userId: testUser.id,
      roleIds: [role.id],
    });

    expect(result.data).toBeUndefined();
    expect(result.serverError).toBeDefined();
    expect(result.serverError?.length).toBeGreaterThan(0);
  });

  it("updates multiple roles correctly", async () => {
    const role1 = await createTestRole("ROLE_1");
    const role2 = await createTestRole("ROLE_2");
    const role3 = await createTestRole("ROLE_3");

    const result = await updateUserRolesAction({
      userId: testUser.id,
      roleIds: [role1.id, role2.id, role3.id],
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.user.roles.length).toBe(3);
    expect(result.data?.user.roles.map((r) => r.name).sort()).toEqual([
      "ROLE_1",
      "ROLE_2",
      "ROLE_3",
    ]);
  });
});
