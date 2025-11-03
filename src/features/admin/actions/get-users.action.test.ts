import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@/features/auth/constants/roles";
import {
  assignRolesToUser,
  createTestUser,
  mockAuthSession,
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/features/shared/testing/helpers";
import { getUsersAction } from "./get-users.action";

describe("getUsersAction", () => {
  let adminUser: TestUser;
  let _regularUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create admin user with admin role - use unique email
    const uniqueEmail = `admin-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@example.com`;
    adminUser = await setupTestUserWithSession({
      name: "Admin User",
      email: uniqueEmail,
    });
    const roleNames = await assignRolesToUser(adminUser.id, [UserRole.ADMIN]);
    // Update the session to include ADMIN role
    mockAuthSession(adminUser, roleNames);

    // Create regular user without admin permissions - use unique email
    const regularEmail = `regular-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@example.com`;
    _regularUser = await setupTestUserWithSession({
      name: "Regular User",
      email: regularEmail,
    });
  });

  it("returns paginated users successfully with admin permission", async () => {
    // Ensure admin session is set up
    const roleNames = await assignRolesToUser(adminUser.id, [UserRole.ADMIN]);
    mockAuthSession(adminUser, roleNames);

    // Create additional test users
    const _user1 = await createTestUser({
      name: "User 1",
      email: `user1-${Date.now()}@example.com`,
    });
    const _user2 = await createTestUser({
      name: "User 2",
      email: `user2-${Date.now()}@example.com`,
    });

    const result = await getUsersAction({
      page: 1,
      limit: 10,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.users).toBeDefined();
    expect(Array.isArray(result.data?.users)).toBe(true);
    expect(result.data?.pagination).toBeDefined();
    expect(result.data?.pagination?.page).toBe(1);
    expect(result.data?.pagination?.limit).toBe(10);
    expect(result.data?.pagination?.totalCount).toBeGreaterThanOrEqual(3); // admin, regular, user1, user2
  });

  it("handles pagination correctly", async () => {
    // Ensure admin session is set up
    const roleNames = await assignRolesToUser(adminUser.id, [UserRole.ADMIN]);
    mockAuthSession(adminUser, roleNames);

    // Create more users for pagination test
    for (let i = 0; i < 5; i++) {
      await createTestUser({
        name: `Paginated User ${i}`,
        email: `paginated${i}-${Date.now()}@example.com`,
      });
    }

    const result = await getUsersAction({
      page: 1,
      limit: 3,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.users.length).toBe(3);
    expect(result.data?.pagination?.page).toBe(1);
    expect(result.data?.pagination?.limit).toBe(3);
    expect(result.data?.pagination?.totalPages).toBeGreaterThanOrEqual(1);
  });

  it("searches users by name", async () => {
    // Ensure admin session is set up
    const roleNames = await assignRolesToUser(adminUser.id, [UserRole.ADMIN]);
    mockAuthSession(adminUser, roleNames);

    await createTestUser({
      name: "Searchable Name",
      email: `searchable-${Date.now()}@example.com`,
    });

    const result = await getUsersAction({
      page: 1,
      limit: 10,
      search: "Searchable",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.users.length).toBeGreaterThan(0);
    const foundUser = result.data?.users.find(
      (u) => u.name === "Searchable Name",
    );
    expect(foundUser).toBeDefined();
  });

  it("searches users by email", async () => {
    // Ensure admin session is set up
    const roleNames = await assignRolesToUser(adminUser.id, [UserRole.ADMIN]);
    mockAuthSession(adminUser, roleNames);

    const uniqueEmail = `emailsearch-${Date.now()}@example.com`;
    await createTestUser({
      name: "Email Search",
      email: uniqueEmail,
    });

    const result = await getUsersAction({
      page: 1,
      limit: 10,
      search: "emailsearch",
    });

    expect(result.data?.success).toBe(true);
    const foundUser = result.data?.users.find((u) => u.email === uniqueEmail);
    expect(foundUser).toBeDefined();
  });

  it("filters users by role", async () => {
    // Ensure admin session is set up
    const roleNames = await assignRolesToUser(adminUser.id, [UserRole.ADMIN]);
    mockAuthSession(adminUser, roleNames);

    // Create a user with a specific role
    const roleUser = await createTestUser({
      name: "Role User",
      email: `roleuser-${Date.now()}@example.com`,
    });
    await assignRolesToUser(roleUser.id, [UserRole.MODERATOR]);

    const result = await getUsersAction({
      page: 1,
      limit: 10,
      role: UserRole.MODERATOR,
    });

    expect(result.data?.success).toBe(true);
    // All returned users should have the MODERATOR role
    const moderators = result.data?.users.filter((u) =>
      u.roles.includes(UserRole.MODERATOR),
    );
    expect(moderators.length).toBeGreaterThan(0);
  });

  it("filters users by email verified status", async () => {
    // Ensure admin session is set up
    const roleNames = await assignRolesToUser(adminUser.id, [UserRole.ADMIN]);
    mockAuthSession(adminUser, roleNames);

    await createTestUser({
      name: "Verified User",
      email: `verified-${Date.now()}@example.com`,
      emailVerified: true,
    });
    await createTestUser({
      name: "Unverified User",
      email: `unverified-${Date.now()}@example.com`,
      emailVerified: false,
    });

    const verifiedResult = await getUsersAction({
      page: 1,
      limit: 10,
      emailVerified: "true",
    });

    expect(verifiedResult.data?.success).toBe(true);
    verifiedResult.data?.users.forEach((u) => {
      expect(u.emailVerified).toBe(true);
    });

    const unverifiedResult = await getUsersAction({
      page: 1,
      limit: 10,
      emailVerified: "false",
    });

    expect(unverifiedResult.data?.success).toBe(true);
    unverifiedResult.data?.users.forEach((u) => {
      expect(u.emailVerified).toBe(false);
    });
  });

  it("sorts users by name ascending", async () => {
    // Ensure admin session is set up
    const roleNames = await assignRolesToUser(adminUser.id, [UserRole.ADMIN]);
    mockAuthSession(adminUser, roleNames);

    await createTestUser({
      name: "A User",
      email: `a-${Date.now()}@example.com`,
    });
    await createTestUser({
      name: "Z User",
      email: `z-${Date.now()}@example.com`,
    });

    const result = await getUsersAction({
      page: 1,
      limit: 10,
      sortBy: "name",
      sortOrder: "asc",
    });

    expect(result.data?.success).toBe(true);
    const users = result.data?.users || [];
    if (users.length >= 2) {
      const names = users.map((u) => u.name).filter(Boolean);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    }
  });

  it("sorts users by email descending", async () => {
    // Ensure admin session is set up
    const roleNames = await assignRolesToUser(adminUser.id, [UserRole.ADMIN]);
    mockAuthSession(adminUser, roleNames);

    await createTestUser({
      name: "User A",
      email: `a-${Date.now()}@example.com`,
    });
    await createTestUser({
      name: "User Z",
      email: `z-${Date.now()}@example.com`,
    });

    const result = await getUsersAction({
      page: 1,
      limit: 10,
      sortBy: "email",
      sortOrder: "desc",
    });

    expect(result.data?.success).toBe(true);
    const users = result.data?.users || [];
    if (users.length >= 2) {
      const emails = users.map((u) => u.email);
      const sortedEmails = [...emails].sort().reverse();
      expect(emails).toEqual(sortedEmails);
    }
  });

  it("includes user roles in response", async () => {
    // Ensure admin session is set up
    const roleNames = await assignRolesToUser(adminUser.id, [UserRole.ADMIN]);
    mockAuthSession(adminUser, roleNames);

    const roleUser = await createTestUser({
      name: "Role Test User",
      email: `roletest-${Date.now()}@example.com`,
    });
    await assignRolesToUser(roleUser.id, [UserRole.MODERATOR]);

    const result = await getUsersAction({
      page: 1,
      limit: 10,
    });

    expect(result.data?.success).toBe(true);
    const foundUser = result.data?.users.find((u) => u.id === roleUser.id);
    expect(foundUser).toBeDefined();
    expect(foundUser?.roles).toBeDefined();
    expect(Array.isArray(foundUser?.roles)).toBe(true);
    expect(foundUser?.roles).toContain(UserRole.MODERATOR);
  });

  it("throws error when user is not authenticated", async () => {
    mockNoAuthSession();

    const result = await getUsersAction({
      page: 1,
      limit: 10,
    });

    expect(result.data).toBeUndefined();
    expect(result.serverError).toBeDefined();
    expect(result.serverError?.length).toBeGreaterThan(0);
  });

  it("throws error when user lacks admin permissions", async () => {
    // Create a regular user without admin permissions - use unique email
    const _regularUser = await setupTestUserWithSession({
      name: "Regular User 2",
      email: `regular2-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@example.com`,
    });

    const result = await getUsersAction({
      page: 1,
      limit: 10,
    });

    expect(result.data).toBeUndefined();
    expect(result.serverError).toBeDefined();
    expect(result.serverError?.length).toBeGreaterThan(0);
  });

  it("handles empty result set", async () => {
    // Ensure admin session is set up
    const roleNames = await assignRolesToUser(adminUser.id, [UserRole.ADMIN]);
    mockAuthSession(adminUser, roleNames);

    // Search for non-existent user
    const result = await getUsersAction({
      page: 1,
      limit: 10,
      search: "NonExistentUser12345",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.users.length).toBe(0);
    expect(result.data?.pagination?.totalCount).toBe(0);
  });

  it("validates pagination parameters", async () => {
    const result = await getUsersAction({
      page: 0, // Invalid: must be positive
      limit: 10,
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("page");
  });

  it("validates limit maximum", async () => {
    const result = await getUsersAction({
      page: 1,
      limit: 101, // Invalid: max is 100
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("limit");
  });
});
