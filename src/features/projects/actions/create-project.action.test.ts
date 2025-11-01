import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/features/shared/lib/db/client";
import {
  mockAuthSession,
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/shared/testing/helpers";
import { createProjectAction } from "./create-project.action";

describe("createProjectAction", () => {
  let testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    testUser = await setupTestUserWithSession();
  });

  it("creates a project successfully with valid data", async () => {
    const result = await createProjectAction({
      name: "My Test Project",
      description: "This is a test project description",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.project).toBeDefined();
    expect(result.data?.project.name).toBe("My Test Project");
    expect(result.data?.project.description).toBe(
      "This is a test project description",
    );
    expect(result.data?.project.userId).toBe(testUser.id);
    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.message).toBe("Project created successfully");

    const project = await db.project.findUnique({
      where: { id: result.data?.project.id },
    });

    expect(project).toBeDefined();
    expect(project?.name).toBe("My Test Project");
    expect(project?.description).toBe("This is a test project description");
    expect(project?.userId).toBe(testUser.id);
  });

  it("creates a project without description", async () => {
    const result = await createProjectAction({
      name: "Project Without Description",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.project).toBeDefined();
    expect(result.data?.project.name).toBe("Project Without Description");
    expect(result.data?.project.description).toBeNull();

    const project = await db.project.findUnique({
      where: { id: result.data?.project.id },
    });

    expect(project?.description).toBeNull();
  });

  it("validates required fields", async () => {
    const result = await createProjectAction({
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

    const result = await createProjectAction({
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

    const result = await createProjectAction({
      name: "Valid Project Name",
      description: longDescription,
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("description");
    expect(result.validationErrors?.description).toHaveProperty("_errors");
    expect(Array.isArray(result.validationErrors?.description?._errors)).toBe(
      true,
    );
    expect(result.validationErrors?.description?._errors?.[0]).toBe(
      "Description must be less than 500 characters",
    );
  });

  it("throws error when user is not authenticated", async () => {
    mockNoAuthSession();

    const result = await createProjectAction({
      name: "Test Project",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("Unauthorized");
  });

  it("throws error when session is invalid", async () => {
    mockNoAuthSession();

    const result = await createProjectAction({
      name: "Test Project",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("Unauthorized");
  });

  it("handles database errors gracefully", async () => {
    // Create a fresh user for this test to avoid interfering with other tests
    const errorTestUser = await setupTestUserWithSession();

    // Delete the user to cause a foreign key constraint error
    await db.user.delete({
      where: { id: errorTestUser.id },
    });

    // Update the session mock to use the deleted user ID
    mockAuthSession(errorTestUser);

    const result = await createProjectAction({
      name: "Test Project",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.length).toBeGreaterThan(0);
  });

  it("creates multiple projects for the same user", async () => {
    const project1 = await createProjectAction({
      name: "Project 1",
      description: "First project",
    });

    const project2 = await createProjectAction({
      name: "Project 2",
      description: "Second project",
    });

    expect(project1.data?.success).toBe(true);
    expect(project2.data?.success).toBe(true);

    const projects = await db.project.findMany({
      where: { userId: testUser.id },
    });

    expect(projects).toHaveLength(2);
    expect(projects.map((p: { name: string }) => p.name)).toContain(
      "Project 1",
    );
    expect(projects.map((p: { name: string }) => p.name)).toContain(
      "Project 2",
    );
  });
});
