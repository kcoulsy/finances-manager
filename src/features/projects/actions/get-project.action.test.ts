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
import { getProjectAction } from "./get-project.action";

describe("getProjectAction", () => {
  let testUser: TestUser;
  let otherUser: TestUser;
  let testProject: { id: string; name: string; userId: string };
  let otherUserProject: { id: string; name: string; userId: string };

  setupTestHooks();

  beforeEach(async () => {
    // Create test user and their project
    testUser = await setupTestUserWithSession();
    testProject = await db.project.create({
      data: {
        name: "Test User's Project",
        description: "A project owned by test user",
        userId: testUser.id,
      },
    });

    // Create another user and their project
    otherUser = await createTestUser({
      name: "Other User",
    });
    otherUserProject = await db.project.create({
      data: {
        name: "Other User's Project",
        description: "A project owned by other user",
        userId: otherUser.id,
      },
    });
  });

  it("gets a project successfully when user owns it", async () => {
    const result = await getProjectAction({
      projectId: testProject.id,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.project).toBeDefined();
    expect(result.data?.project.id).toBe(testProject.id);
    expect(result.data?.project.name).toBe("Test User's Project");
    expect(result.data?.project.userId).toBe(testUser.id);
  });

  it("throws error when project not found", async () => {
    const result = await getProjectAction({
      projectId: "non-existent-project-id",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("NEXT_NOT_FOUND");
  });

  it("throws error when user is not authenticated", async () => {
    // Create a project first (before mocking no auth)
    const projectForUnauthTest = await db.project.create({
      data: {
        name: "Unauth Test Project",
        description: "A project for testing unauthenticated access",
        userId: testUser.id,
      },
    });

    // Now mock no auth session
    mockNoAuthSession();

    const result = await getProjectAction({
      projectId: projectForUnauthTest.id,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("NEXT_REDIRECT");
    expect(result.serverError).toContain("/login");
  });

  it("throws error when user tries to access another user's project without permission", async () => {
    const result = await getProjectAction({
      projectId: otherUserProject.id,
    });

    expect(result.data).toBeUndefined();
    expect(result.serverError).toBeDefined();
  });

  it("allows access to another user's project when user has admin permission", async () => {
    // Assign ADMIN role to test user
    const roleNames = await assignRolesToUser(testUser.id, [UserRole.ADMIN]);

    // Update the session to include ADMIN role
    mockAuthSession(testUser, roleNames);

    const result = await getProjectAction({
      projectId: otherUserProject.id,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.project).toBeDefined();
    expect(result.data?.project.id).toBe(otherUserProject.id);
    expect(result.data?.project.name).toBe("Other User's Project");
  });

  it("validates required projectId", async () => {
    const result = await getProjectAction({
      projectId: "",
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("projectId");
    expect(result.validationErrors?.projectId).toHaveProperty("_errors");
    expect(Array.isArray(result.validationErrors?.projectId?._errors)).toBe(
      true,
    );
    expect(result.validationErrors?.projectId?._errors?.[0]).toContain(
      "required",
    );
  });
});
