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
} from "@/features/shared/testing/helpers";
import { getUserProjectsAction } from "./get-user-projects.action";

describe("getUserProjectsAction", () => {
  let adminUser: TestUser;
  let testUser: TestUser;
  let otherUser: TestUser;

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

    // Create test user to get projects for - use unique email
    testUser = await createTestUser({
      name: "Test User",
      email: `test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@example.com`,
    });

    // Create another user - use unique email
    otherUser = await createTestUser({
      name: "Other User",
      email: `other-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@example.com`,
    });
  });

  it("returns user projects successfully with admin permission", async () => {
    // Create projects for test user
    const project1 = await db.project.create({
      data: {
        name: "Project 1",
        description: "Description 1",
        userId: testUser.id,
      },
    });
    const project2 = await db.project.create({
      data: {
        name: "Project 2",
        description: "Description 2",
        userId: testUser.id,
      },
    });

    const result = await getUserProjectsAction({
      userId: testUser.id,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.projects).toBeDefined();
    expect(Array.isArray(result.data?.projects)).toBe(true);
    expect(result.data?.projects.length).toBe(2);
    expect(result.data?.projects.map((p) => p.id).sort()).toEqual(
      [project1.id, project2.id].sort(),
    );
  });

  it("returns empty array when user has no projects", async () => {
    const result = await getUserProjectsAction({
      userId: testUser.id,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.projects).toBeDefined();
    expect(Array.isArray(result.data?.projects)).toBe(true);
    expect(result.data?.projects.length).toBe(0);
  });

  it("only returns projects for the specified user", async () => {
    // Create projects for test user
    const testUserProject = await db.project.create({
      data: {
        name: "Test User Project",
        description: "Description",
        userId: testUser.id,
      },
    });

    // Create projects for other user
    const otherUserProject = await db.project.create({
      data: {
        name: "Other User Project",
        description: "Description",
        userId: otherUser.id,
      },
    });

    const result = await getUserProjectsAction({
      userId: testUser.id,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.projects.length).toBe(1);
    expect(result.data?.projects[0]?.id).toBe(testUserProject.id);
    expect(result.data?.projects[0]?.id).not.toBe(otherUserProject.id);
  });

  it("orders projects by updatedAt descending", async () => {
    // Create projects with different updatedAt times
    const project1 = await db.project.create({
      data: {
        name: "Project 1",
        description: "Description 1",
        userId: testUser.id,
      },
    });

    // Wait a bit to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));

    const project2 = await db.project.create({
      data: {
        name: "Project 2",
        description: "Description 2",
        userId: testUser.id,
      },
    });

    const result = await getUserProjectsAction({
      userId: testUser.id,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.projects.length).toBe(2);
    // Most recently updated should be first
    expect(result.data?.projects[0]?.id).toBe(project2.id);
    expect(result.data?.projects[1]?.id).toBe(project1.id);
  });

  it("throws error when user is not authenticated", async () => {
    mockNoAuthSession();

    const result = await getUserProjectsAction({
      userId: testUser.id,
    });

    expect(result.data).toBeUndefined();
    expect(result.serverError).toBeDefined();
    expect(result.serverError?.length).toBeGreaterThan(0);
  });

  it("validates required userId", async () => {
    const result = await getUserProjectsAction({
      userId: "",
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("userId");
  });

  it("handles invalid userId gracefully", async () => {
    const result = await getUserProjectsAction({
      userId: "non-existent-id",
    });

    // Should return empty array or handle gracefully
    expect(result.data?.success).toBe(true);
    expect(result.data?.projects.length).toBe(0);
  });
});
