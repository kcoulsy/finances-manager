import { beforeEach, describe, expect, it, vi } from "vitest";
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
import { getUserRoles, hasRole } from "./has-role";

describe("hasRole", () => {
  let testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    testUser = await setupTestUserWithSession();
  });

  it("returns true when user has the required role", async () => {
    await createTestRole(UserRole.ADMIN);
    const roleNames = await assignRolesToUser(testUser.id, [UserRole.ADMIN]);
    mockAuthSession(testUser, roleNames);

    const result = await hasRole(UserRole.ADMIN);

    expect(result).toBe(true);
  });

  it("returns false when user does not have the required role", async () => {
    await createTestRole(UserRole.ADMIN);
    await createTestRole(UserRole.USER);
    const roleNames = await assignRolesToUser(testUser.id, [UserRole.USER]);
    mockAuthSession(testUser, roleNames);

    const result = await hasRole(UserRole.ADMIN);

    expect(result).toBe(false);
  });

  it("returns false when user is not authenticated", async () => {
    mockNoAuthSession();

    const result = await hasRole(UserRole.ADMIN);

    expect(result).toBe(false);
  });

  it("returns false when session has no roles", async () => {
    mockAuthSession(testUser, []);

    const result = await hasRole(UserRole.ADMIN);

    expect(result).toBe(false);
  });

  it("returns true when user has multiple roles including required role", async () => {
    await createTestRole(UserRole.ADMIN);
    await createTestRole(UserRole.USER);
    await createTestRole(UserRole.MODERATOR);
    const roleNames = await assignRolesToUser(testUser.id, [
      UserRole.ADMIN,
      UserRole.USER,
      UserRole.MODERATOR,
    ]);
    mockAuthSession(testUser, roleNames);

    const result = await hasRole(UserRole.ADMIN);

    expect(result).toBe(true);
  });

  it("handles errors gracefully and returns false", async () => {
    // Force an error by mocking headers to throw
    const { headers } = await import("next/headers");
    const mockHeaders = vi.mocked(headers);
    mockHeaders.mockRejectedValue(new Error("Test error"));

    const result = await hasRole(UserRole.ADMIN);

    expect(result).toBe(false);
  });
});

describe("getUserRoles", () => {
  let testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    testUser = await setupTestUserWithSession();
  });

  it("returns user roles from session", async () => {
    await createTestRole(UserRole.ADMIN);
    await createTestRole(UserRole.USER);
    const roleNames = await assignRolesToUser(testUser.id, [
      UserRole.ADMIN,
      UserRole.USER,
    ]);
    mockAuthSession(testUser, roleNames);

    const roles = await getUserRoles();

    expect(roles).toContain(UserRole.ADMIN);
    expect(roles).toContain(UserRole.USER);
    expect(roles.length).toBe(2);
  });

  it("returns empty array when user is not authenticated", async () => {
    mockNoAuthSession();

    const roles = await getUserRoles();

    expect(roles).toEqual([]);
  });

  it("returns empty array when session has no roles", async () => {
    mockAuthSession(testUser, []);

    const roles = await getUserRoles();

    expect(roles).toEqual([]);
  });

  it("returns empty array when session is null", async () => {
    mockNoAuthSession();

    const roles = await getUserRoles();

    expect(roles).toEqual([]);
  });

  it("handles errors gracefully and returns empty array", async () => {
    // Mock getSession to throw an error
    const { headers } = await import("next/headers");
    const mockHeaders = vi.mocked(headers);
    mockHeaders.mockRejectedValue(new Error("Test error"));

    const roles = await getUserRoles();

    expect(roles).toEqual([]);
  });
});
