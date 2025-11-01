import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/features/shared/lib/db/client";
import {
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/shared/testing/helpers";
import { getProjectsAction } from "./get-projects.action";

describe("getProjectsAction", () => {
  let testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    testUser = await setupTestUserWithSession();
  });

  it("gets all projects for the authenticated user successfully", async () => {
    // Create multiple projects for the test user
    const project1 = await db.project.create({
      data: {
        name: "Project 1",
        description: "First project",
        userId: testUser.id,
      },
    });

    const project2 = await db.project.create({
      data: {
        name: "Project 2",
        description: "Second project",
        userId: testUser.id,
      },
    });

    const project3 = await db.project.create({
      data: {
        name: "Project 3",
        description: "Third project",
        userId: testUser.id,
      },
    });

    const result = await getProjectsAction();

    expect(result.data?.success).toBe(true);
    expect(result.data?.projects).toBeDefined();
    expect(Array.isArray(result.data?.projects)).toBe(true);
    expect(result.data?.projects).toHaveLength(3);

    const projectNames = result.data?.projects.map((p) => p.name);
    expect(projectNames).toContain("Project 1");
    expect(projectNames).toContain("Project 2");
    expect(projectNames).toContain("Project 3");
  });

  it("returns empty array when user has no projects", async () => {
    const result = await getProjectsAction();

    expect(result.data?.success).toBe(true);
    expect(result.data?.projects).toBeDefined();
    expect(Array.isArray(result.data?.projects)).toBe(true);
    expect(result.data?.projects).toHaveLength(0);
  });

  it("returns projects ordered by updatedAt descending", async () => {
    // Verify user exists before creating projects
    const userExists = await db.user.findUnique({
      where: { id: testUser.id },
    });
    expect(userExists).toBeDefined();

    // Create projects with delays to ensure different updatedAt timestamps
    const project1 = await db.project.create({
      data: {
        name: "Oldest Project",
        description: "This should be last",
        userId: testUser.id,
      },
    });

    // Wait a bit to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Verify user still exists before creating second project
    const userStillExists = await db.user.findUnique({
      where: { id: testUser.id },
    });
    expect(userStillExists).toBeDefined();

    const project2 = await db.project.create({
      data: {
        name: "Middle Project",
        description: "This should be in the middle",
        userId: testUser.id,
      },
    });

    // Wait a bit more
    await new Promise((resolve) => setTimeout(resolve, 10));

    const project3 = await db.project.create({
      data: {
        name: "Newest Project",
        description: "This should be first",
        userId: testUser.id,
      },
    });

    const result = await getProjectsAction();

    expect(result.data?.success).toBe(true);
    expect(result.data?.projects).toHaveLength(3);

    // Projects should be ordered by updatedAt descending (newest first)
    expect(result.data?.projects[0].id).toBe(project3.id);
    expect(result.data?.projects[1].id).toBe(project2.id);
    expect(result.data?.projects[2].id).toBe(project1.id);
  });

  it("only returns projects for the authenticated user", async () => {
    // Create another user
    const { createTestUser } = await import("@/shared/testing/helpers");
    const otherUser = await createTestUser({
      name: "Other User",
    });

    // Create projects for test user
    const userProject1 = await db.project.create({
      data: {
        name: "User Project 1",
        description: "First user project",
        userId: testUser.id,
      },
    });

    const userProject2 = await db.project.create({
      data: {
        name: "User Project 2",
        description: "Second user project",
        userId: testUser.id,
      },
    });

    // Create projects for other user
    await db.project.create({
      data: {
        name: "Other User's Project 1",
        description: "Other user's first project",
        userId: otherUser.id,
      },
    });

    await db.project.create({
      data: {
        name: "Other User's Project 2",
        description: "Other user's second project",
        userId: otherUser.id,
      },
    });

    const result = await getProjectsAction();

    expect(result.data?.success).toBe(true);
    expect(result.data?.projects).toHaveLength(2);

    const projectIds = result.data?.projects.map((p) => p.id);
    expect(projectIds).toContain(userProject1.id);
    expect(projectIds).toContain(userProject2.id);
    expect(projectIds).not.toContain(
      expect.not.stringContaining(otherUser.id),
    );
  });

  it("throws error when user is not authenticated", async () => {
    mockNoAuthSession();

    const result = await getProjectsAction();

    expect(result.data).toBeUndefined();
    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("Unauthorized");
  });

  it("handles projects with null descriptions", async () => {
    const project1 = await db.project.create({
      data: {
        name: "Project with Description",
        description: "Has a description",
        userId: testUser.id,
      },
    });

    const project2 = await db.project.create({
      data: {
        name: "Project without Description",
        description: null,
        userId: testUser.id,
      },
    });

    const result = await getProjectsAction();

    expect(result.data?.success).toBe(true);
    expect(result.data?.projects).toHaveLength(2);

    const projectWithDesc = result.data?.projects.find(
      (p) => p.id === project1.id,
    );
    const projectWithoutDesc = result.data?.projects.find(
      (p) => p.id === project2.id,
    );

    expect(projectWithDesc?.description).toBe("Has a description");
    expect(projectWithoutDesc?.description).toBeNull();
  });

  it("returns projects in correct format with all fields", async () => {
    const project = await db.project.create({
      data: {
        name: "Complete Project",
        description: "Complete description",
        userId: testUser.id,
      },
    });

    const result = await getProjectsAction();

    expect(result.data?.success).toBe(true);
    expect(result.data?.projects).toHaveLength(1);

    const returnedProject = result.data?.projects[0];
    expect(returnedProject).toHaveProperty("id");
    expect(returnedProject).toHaveProperty("name");
    expect(returnedProject).toHaveProperty("description");
    expect(returnedProject).toHaveProperty("userId");
    expect(returnedProject).toHaveProperty("createdAt");
    expect(returnedProject).toHaveProperty("updatedAt");

    expect(returnedProject?.id).toBe(project.id);
    expect(returnedProject?.name).toBe("Complete Project");
    expect(returnedProject?.description).toBe("Complete description");
    expect(returnedProject?.userId).toBe(testUser.id);
  });
});
