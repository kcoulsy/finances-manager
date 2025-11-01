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
import { deleteProjectAction } from "./delete-project.action";

describe("deleteProjectAction", () => {
  let testUser: TestUser;
  let otherUser: TestUser;
  let testProject: { id: string; name: string; userId: string };

  setupTestHooks();

  beforeEach(async () => {
    testUser = await setupTestUserWithSession();
    testProject = await db.project.create({
      data: {
        name: "Project to Delete",
        description: "This project will be deleted",
        userId: testUser.id,
      },
    });

    otherUser = await createTestUser({
      name: "Other User",
    });
  });

  it("deletes a project successfully when user owns it", async () => {
    const result = await deleteProjectAction({
      projectId: testProject.id,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.message).toBe("Project deleted successfully");
    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.message).toBe("Project deleted successfully");
    expect(result.data?.toast?.description).toContain(
      "Project \"Project to Delete\" has been permanently deleted.",
    );

    // Verify project is deleted from database
    const deletedProject = await db.project.findUnique({
      where: { id: testProject.id },
    });

    expect(deletedProject).toBeNull();
  });

  it("validates required projectId", async () => {
    const result = await deleteProjectAction({
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

  it("throws error when project not found", async () => {
    const result = await deleteProjectAction({
      projectId: "non-existent-project-id",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("Project not found");
  });

  it("throws error when user is not authenticated", async () => {
    mockNoAuthSession();

    const result = await deleteProjectAction({
      projectId: testProject.id,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("Unauthorized");
  });

  it("throws error when user tries to delete another user's project without permission", async () => {
    const otherUserProject = await db.project.create({
      data: {
        name: "Other User's Project",
        description: "A project owned by other user",
        userId: otherUser.id,
      },
    });

    const result = await deleteProjectAction({
      projectId: otherUserProject.id,
    });

    expect(result.data).toBeUndefined();
    expect(result.serverError).toBeDefined();

    // Verify project still exists
    const project = await db.project.findUnique({
      where: { id: otherUserProject.id },
    });

    expect(project).toBeDefined();
    expect(project?.name).toBe("Other User's Project");
  });

  it("allows deleting another user's project when user has admin permission", async () => {
    const otherUserProject = await db.project.create({
      data: {
        name: "Other User's Project",
        description: "A project owned by other user",
        userId: otherUser.id,
      },
    });

    // Assign ADMIN role to test user
    const roleNames = await assignRolesToUser(testUser.id, [UserRole.ADMIN]);

    // Update the session to include ADMIN role
    mockAuthSession(testUser, roleNames);

    const result = await deleteProjectAction({
      projectId: otherUserProject.id,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.message).toBe("Project deleted successfully");
    expect(result.data?.toast?.description).toContain(
      "Project \"Other User's Project\" has been permanently deleted.",
    );

    // Verify project is deleted from database
    const deletedProject = await db.project.findUnique({
      where: { id: otherUserProject.id },
    });

    expect(deletedProject).toBeNull();
  });

  it("deletes multiple projects for the same user", async () => {
    const project1 = await db.project.create({
      data: {
        name: "Project 1",
        userId: testUser.id,
      },
    });

    const project2 = await db.project.create({
      data: {
        name: "Project 2",
        userId: testUser.id,
      },
    });

    const project3 = await db.project.create({
      data: {
        name: "Project 3",
        userId: testUser.id,
      },
    });

    // Delete project 2
    const result1 = await deleteProjectAction({
      projectId: project2.id,
    });

    expect(result1.data?.success).toBe(true);

    // Delete project 1
    const result2 = await deleteProjectAction({
      projectId: project1.id,
    });

    expect(result2.data?.success).toBe(true);

    // Verify project 2 and 1 are deleted
    const deletedProject1 = await db.project.findUnique({
      where: { id: project1.id },
    });
    const deletedProject2 = await db.project.findUnique({
      where: { id: project2.id },
    });
    const remainingProject = await db.project.findUnique({
      where: { id: project3.id },
    });

    expect(deletedProject1).toBeNull();
    expect(deletedProject2).toBeNull();
    expect(remainingProject).toBeDefined();
    expect(remainingProject?.name).toBe("Project 3");
  });

  it("handles database errors gracefully", async () => {
    // Create a fresh user and project for this test
    const errorTestUser = await setupTestUserWithSession();
    const errorTestProject = await db.project.create({
      data: {
        name: "Test Project",
        userId: errorTestUser.id,
      },
    });

    // Delete the user to cause a foreign key constraint error
    await db.user.delete({
      where: { id: errorTestUser.id },
    });

    // Update the session mock to use the deleted user ID
    mockAuthSession(errorTestUser);

    const result = await deleteProjectAction({
      projectId: errorTestProject.id,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.length).toBeGreaterThan(0);
  });

  it("does not affect other projects when deleting one", async () => {
    const projectToKeep = await db.project.create({
      data: {
        name: "Project to Keep",
        description: "This should remain",
        userId: testUser.id,
      },
    });

    // Delete testProject
    const result = await deleteProjectAction({
      projectId: testProject.id,
    });

    expect(result.data?.success).toBe(true);

    // Verify testProject is deleted
    const deletedProject = await db.project.findUnique({
      where: { id: testProject.id },
    });
    expect(deletedProject).toBeNull();

    // Verify projectToKeep still exists
    const keptProject = await db.project.findUnique({
      where: { id: projectToKeep.id },
    });
    expect(keptProject).toBeDefined();
    expect(keptProject?.name).toBe("Project to Keep");
  });
});
