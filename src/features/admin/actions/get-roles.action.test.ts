import { beforeEach, describe, expect, it } from "vitest";
import { UserRole } from "@/features/auth/constants/roles";
import {
  assignRolesToUser,
  createTestRole,
  mockAuthSession,
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/features/shared/testing/helpers";
import { getRolesAction } from "./get-roles.action";

describe("getRolesAction", () => {
  let adminUser: TestUser;

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
  });

  it("returns all roles successfully with admin permission", async () => {
    // Ensure standard roles exist
    await createTestRole(UserRole.ADMIN);
    await createTestRole(UserRole.USER);
    await createTestRole(UserRole.MODERATOR);
    // Create some test roles
    await createTestRole("CUSTOM_ROLE_1");
    await createTestRole("CUSTOM_ROLE_2");

    const result = await getRolesAction();

    expect(result.data?.success).toBe(true);
    expect(result.data?.roles).toBeDefined();
    expect(Array.isArray(result.data?.roles)).toBe(true);
    expect(result.data?.roles.length).toBeGreaterThanOrEqual(3);

    // Should include standard roles
    const roleNames = result.data?.roles.map((r) => r.name) || [];
    expect(roleNames).toContain(UserRole.ADMIN);
    expect(roleNames).toContain(UserRole.USER);
    expect(roleNames).toContain(UserRole.MODERATOR);
  });

  it("orders roles by name ascending", async () => {
    await createTestRole("A_ROLE");
    await createTestRole("Z_ROLE");

    const result = await getRolesAction();

    expect(result.data?.success).toBe(true);
    const roles = result.data?.roles || [];
    if (roles.length >= 2) {
      const names = roles.map((r) => r.name);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    }
  });

  it("returns role with id and name", async () => {
    const customRole = await createTestRole("CUSTOM_ROLE");

    const result = await getRolesAction();

    expect(result.data?.success).toBe(true);
    const foundRole = result.data?.roles.find((r) => r.name === "CUSTOM_ROLE");
    expect(foundRole).toBeDefined();
    expect(foundRole?.id).toBe(customRole.id);
    expect(foundRole?.name).toBe("CUSTOM_ROLE");
  });

  it("throws error when user is not authenticated", async () => {
    mockNoAuthSession();

    const result = await getRolesAction();

    expect(result.data).toBeUndefined();
    expect(result.serverError).toBeDefined();
    expect(result.serverError?.length).toBeGreaterThan(0);
  });

  it("throws error when user lacks admin permissions", async () => {
    // Create regular user without admin permissions - use unique email
    const _regularUser = await setupTestUserWithSession({
      name: "Regular User",
      email: `regular-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@example.com`,
    });

    const result = await getRolesAction();

    expect(result.data).toBeUndefined();
    expect(result.serverError).toBeDefined();
    expect(result.serverError?.length).toBeGreaterThan(0);
  });
});
