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
import { updateProjectAction } from "./update-project.action";

describe("updateProjectAction", () => {
  let testUser: TestUser;
  let otherUser: TestUser;
  let testProject: { id: string; name: string; userId: string };

  setupTestHooks();

  beforeEach(async () => {
    testUser = await setupTestUserWithSession();
    testProject = await db.project.create({
      data: {
        name: "Original Project Name",
        description: "Original description",
        userId: testUser.id,
      },
    });

    otherUser = await createTestUser({
      name: "Other User",
    });
  });

  it("updates a project successfully with valid data", async () => {
    const result = await updateProjectAction({
      projectId: testProject.id,
      name: "Updated Project Name",
      description: "Updated description",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.project).toBeDefined();
    expect(result.data?.project.name).toBe("Updated Project Name");
    expect(result.data?.project.description).toBe("Updated description");
    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.message).toBe("Project updated successfully");

    const project = await db.project.findUnique({
      where: { id: testProject.id },
    });

    expect(project?.name).toBe("Updated Project Name");
    expect(project?.description).toBe("Updated description");
  });

  it("updates a project without description", async () => {
    const result = await updateProjectAction({
      projectId: testProject.id,
      name: "Updated Project Name",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.project.name).toBe("Updated Project Name");
    expect(result.data?.project.description).toBeNull();

    const project = await db.project.findUnique({
      where: { id: testProject.id },
    });

    expect(project?.description).toBeNull();
  });

  it("updates project description to null", async () => {
    // First ensure project has a description
    await db.project.update({
      where: { id: testProject.id },
      data: { description: "Existing description" },
    });

    const result = await updateProjectAction({
      projectId: testProject.id,
      name: "Updated Project Name",
      description: undefined,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.project.description).toBeNull();

    const project = await db.project.findUnique({
      where: { id: testProject.id },
    });

    expect(project?.description).toBeNull();
  });

  it("validates required projectId", async () => {
    const result = await updateProjectAction({
      projectId: "",
      name: "Updated Name",
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

  it("validates required name", async () => {
    const result = await updateProjectAction({
      projectId: testProject.id,
      name: "",
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("name");
    expect(result.validationErrors?.name).toHaveProperty("_errors");
    expect(Array.isArray(result.validationErrors?.name?._errors)).toBe(true);
    expect(result.validationErrors?.name?._errors?.[0]).toBe(
      "Project name is required",
    );
  });

  it("validates name max length", async () => {
    const longName = "a".repeat(101); // 101 characters, max is 100

    const result = await updateProjectAction({
      projectId: testProject.id,
      name: longName,
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("name");
    expect(result.validationErrors?.name).toHaveProperty("_errors");
    expect(Array.isArray(result.validationErrors?.name?._errors)).toBe(true);
    expect(result.validationErrors?.name?._errors?.[0]).toBe(
      "Project name must be less than 100 characters",
    );
  });

  it("validates description max length", async () => {
    const longDescription = "a".repeat(501); // 501 characters, max is 500

    const result = await updateProjectAction({
      projectId: testProject.id,
      name: "Valid Project Name",
      description: longDescription,
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("description");
    expect(result.validationErrors?.description).toHaveProperty("_errors");
    expect(
      Array.isArray(result.validationErrors?.description?._errors),
    ).toBe(true);
    expect(result.validationErrors?.description?._errors?.[0]).toBe(
      "Description must be less than 500 characters",
    );
  });

  it("throws error when project not found", async () => {
    const result = await updateProjectAction({
      projectId: "non-existent-project-id",
      name: "Updated Name",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("Project not found");
  });

  it("throws error when user is not authenticated", async () => {
    mockNoAuthSession();

    const result = await updateProjectAction({
      projectId: testProject.id,
      name: "Updated Name",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("Unauthorized");
  });

  it("throws error when user tries to update another user's project without permission", async () => {
    const otherUserProject = await db.project.create({
      data: {
        name: "Other User's Project",
        description: "A project owned by other user",
        userId: otherUser.id,
      },
    });

    const result = await updateProjectAction({
      projectId: otherUserProject.id,
      name: "Hacked Name",
    });

    expect(result.data).toBeUndefined();
    expect(result.serverError).toBeDefined();
  });

  it("allows updating another user's project when user has admin permission", async () => {
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

    const result = await updateProjectAction({
      projectId: otherUserProject.id,
      name: "Updated by Admin",
      description: "Updated by admin user",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.project).toBeDefined();
    expect(result.data?.project.id).toBe(otherUserProject.id);
    expect(result.data?.project.name).toBe("Updated by Admin");
    expect(result.data?.project.description).toBe("Updated by admin user");

    const project = await db.project.findUnique({
      where: { id: otherUserProject.id },
    });

    expect(project?.name).toBe("Updated by Admin");
    expect(project?.description).toBe("Updated by admin user");
  });

  it("handles database errors gracefully", async () => {
    // Create a project for this test
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

    const result = await updateProjectAction({
      projectId: errorTestProject.id,
      name: "Updated Name",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.length).toBeGreaterThan(0);
  });
});
