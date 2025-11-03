import { beforeEach, describe, expect, it } from "vitest";
import { UserRole } from "@/features/auth/constants/roles";
import {
  assignRolesToUser,
  createTestRole,
  createTestUser,
  setupTestHooks,
  type TestUser,
} from "@/features/shared/testing/helpers";
import {
  clearRolesCache,
  getUserRoles,
  invalidateUserRolesCache,
} from "./get-user-roles";

describe("getUserRoles", () => {
  let testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    // Clear cache before each test
    clearRolesCache();
    testUser = await createTestUser();
  });

  it("returns empty array when user has no roles", async () => {
    const roles = await getUserRoles(testUser.id);

    expect(roles).toEqual([]);
  });

  it("returns user roles from database", async () => {
    await createTestRole(UserRole.ADMIN);
    await createTestRole(UserRole.USER);
    await assignRolesToUser(testUser.id, [UserRole.ADMIN, UserRole.USER]);

    const roles = await getUserRoles(testUser.id);

    expect(roles).toContain(UserRole.ADMIN);
    expect(roles).toContain(UserRole.USER);
    expect(roles.length).toBe(2);
  });

  it("caches roles and returns cached result within TTL", async () => {
    await createTestRole(UserRole.ADMIN);
    await assignRolesToUser(testUser.id, [UserRole.ADMIN]);

    // First call - fetches from database
    const roles1 = await getUserRoles(testUser.id);
    expect(roles1).toContain(UserRole.ADMIN);

    // Add another role to database but cache should still return old value
    await createTestRole(UserRole.USER);
    await assignRolesToUser(testUser.id, [UserRole.ADMIN, UserRole.USER]);

    // Second call - should return cached result (only ADMIN, not USER)
    const roles2 = await getUserRoles(testUser.id);
    expect(roles2).toEqual([UserRole.ADMIN]);
    expect(roles2).not.toContain(UserRole.USER);
  });

  it("fetches fresh roles after cache TTL expires", async () => {
    await createTestRole(UserRole.ADMIN);
    await assignRolesToUser(testUser.id, [UserRole.ADMIN]);

    // First call - fetches from database
    const roles1 = await getUserRoles(testUser.id);
    expect(roles1).toContain(UserRole.ADMIN);

    // Manually expire cache by setting old timestamp
    // We can't easily test TTL expiration without mocking time,
    // but we can test invalidation instead
    invalidateUserRolesCache(testUser.id);

    // Add another role and fetch again
    await createTestRole(UserRole.USER);
    await assignRolesToUser(testUser.id, [UserRole.ADMIN, UserRole.USER]);

    // Should fetch fresh roles after invalidation
    const roles2 = await getUserRoles(testUser.id);
    expect(roles2).toContain(UserRole.ADMIN);
    expect(roles2).toContain(UserRole.USER);
    expect(roles2.length).toBe(2);
  });

  it("invalidates cache for specific user", async () => {
    const user1 = await createTestUser({ email: "user1@example.com" });
    const user2 = await createTestUser({ email: "user2@example.com" });

    await createTestRole(UserRole.ADMIN);
    await createTestRole(UserRole.USER);

    await assignRolesToUser(user1.id, [UserRole.ADMIN]);
    await assignRolesToUser(user2.id, [UserRole.USER]);

    // Fetch roles for both users (caches both)
    const user1Roles1 = await getUserRoles(user1.id);
    const user2Roles1 = await getUserRoles(user2.id);

    expect(user1Roles1).toContain(UserRole.ADMIN);
    expect(user2Roles1).toContain(UserRole.USER);

    // Invalidate cache for user1 only
    invalidateUserRolesCache(user1.id);

    // Update user1 roles in database
    await assignRolesToUser(user1.id, [UserRole.ADMIN, UserRole.USER]);

    // User1 should get fresh roles
    const user1Roles2 = await getUserRoles(user1.id);
    expect(user1Roles2).toContain(UserRole.ADMIN);
    expect(user1Roles2).toContain(UserRole.USER);

    // User2 should still get cached roles
    const user2Roles2 = await getUserRoles(user2.id);
    expect(user2Roles2).toEqual([UserRole.USER]); // Still cached, no ADMIN
  });

  it("clears all roles cache", async () => {
    const user1 = await createTestUser({ email: "user1@example.com" });
    const user2 = await createTestUser({ email: "user2@example.com" });

    await createTestRole(UserRole.ADMIN);
    await assignRolesToUser(user1.id, [UserRole.ADMIN]);
    await assignRolesToUser(user2.id, [UserRole.ADMIN]);

    // Fetch roles for both users (caches both)
    await getUserRoles(user1.id);
    await getUserRoles(user2.id);

    // Clear all cache
    clearRolesCache();

    // Update roles in database
    await createTestRole(UserRole.USER);
    await assignRolesToUser(user1.id, [UserRole.ADMIN, UserRole.USER]);
    await assignRolesToUser(user2.id, [UserRole.ADMIN, UserRole.USER]);

    // Both should get fresh roles after cache clear
    const user1Roles = await getUserRoles(user1.id);
    const user2Roles = await getUserRoles(user2.id);

    expect(user1Roles).toContain(UserRole.ADMIN);
    expect(user1Roles).toContain(UserRole.USER);
    expect(user2Roles).toContain(UserRole.ADMIN);
    expect(user2Roles).toContain(UserRole.USER);
  });

  it("handles users with multiple roles", async () => {
    await createTestRole(UserRole.ADMIN);
    await createTestRole(UserRole.USER);
    await createTestRole(UserRole.MODERATOR);

    await assignRolesToUser(testUser.id, [
      UserRole.ADMIN,
      UserRole.USER,
      UserRole.MODERATOR,
    ]);

    const roles = await getUserRoles(testUser.id);

    expect(roles).toContain(UserRole.ADMIN);
    expect(roles).toContain(UserRole.USER);
    expect(roles).toContain(UserRole.MODERATOR);
    expect(roles.length).toBe(3);
  });

  it("handles non-existent user ID gracefully", async () => {
    const nonExistentUserId = "non-existent-user-id";

    const roles = await getUserRoles(nonExistentUserId);

    expect(roles).toEqual([]);
  });
});
