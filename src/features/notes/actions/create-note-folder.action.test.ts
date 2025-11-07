import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/features/shared/lib/db/client";
import {
  createTestUser,
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/features/shared/testing/helpers";
import { createNoteFolderAction } from "./create-note-folder.action";

describe("createNoteFolderAction", () => {
  let testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    testUser = await setupTestUserWithSession();
  });

  it("creates a folder successfully with minimal data", async () => {
    const result = await createNoteFolderAction({
      name: "Test Folder",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.folder).toBeDefined();
    expect(result.data?.folder.name).toBe("Test Folder");
    expect(result.data?.folder.userId).toBe(testUser.id);
    expect(result.data?.folder.context).toBe("project");
    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.message).toBe("Folder created successfully");
    expect(result.data?.toast?.type).toBe("success");

    const folder = await db.noteFolder.findUnique({
      where: { id: result.data?.folder.id },
    });

    expect(folder).toBeDefined();
    expect(folder?.name).toBe("Test Folder");
    expect(folder?.userId).toBe(testUser.id);
  });

  it("creates a folder with all fields", async () => {
    const project = await db.project.create({
      data: {
        userId: testUser.id,
        name: "Test Project",
      },
    });

    const result = await createNoteFolderAction({
      name: "Test Folder",
      description: "Test folder description",
      projectId: project.id,
      context: "project",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.folder.name).toBe("Test Folder");
    expect(result.data?.folder.description).toBe("Test folder description");
    expect(result.data?.folder.projectId).toBe(project.id);
    expect(result.data?.folder.context).toBe("project");

    const folder = await db.noteFolder.findUnique({
      where: { id: result.data?.folder.id },
      include: { project: true },
    });

    expect(folder?.project?.name).toBe("Test Project");
  });

  it("creates a folder with parent folder", async () => {
    const parentFolder = await db.noteFolder.create({
      data: {
        userId: testUser.id,
        name: "Parent Folder",
        context: "global",
      },
    });

    const result = await createNoteFolderAction({
      name: "Child Folder",
      parentId: parentFolder.id,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.folder.parentId).toBe(parentFolder.id);

    const folder = await db.noteFolder.findUnique({
      where: { id: result.data?.folder.id },
      include: { parent: true },
    });

    expect(folder?.parent?.name).toBe("Parent Folder");
  });

  it("creates nested folders up to depth 3", async () => {
    const level1 = await db.noteFolder.create({
      data: {
        userId: testUser.id,
        name: "Level 1",
        context: "global",
      },
    });

    const level2 = await db.noteFolder.create({
      data: {
        userId: testUser.id,
        name: "Level 2",
        parentId: level1.id,
        context: "global",
      },
    });

    const result = await createNoteFolderAction({
      name: "Level 3",
      parentId: level2.id,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.folder.parentId).toBe(level2.id);
  });

  it("returns user-friendly error when trying to create folder at depth 4", async () => {
    const level1 = await db.noteFolder.create({
      data: {
        userId: testUser.id,
        name: "Level 1",
        context: "global",
      },
    });

    const level2 = await db.noteFolder.create({
      data: {
        userId: testUser.id,
        name: "Level 2",
        parentId: level1.id,
        context: "global",
      },
    });

    const level3 = await db.noteFolder.create({
      data: {
        userId: testUser.id,
        name: "Level 3",
        parentId: level2.id,
        context: "global",
      },
    });

    const result = await createNoteFolderAction({
      name: "Level 4",
      parentId: level3.id,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(
      /maximum.*depth|depth.*3/i,
    );
    expect(result.serverError).not.toContain("PrismaClient");
  });

  it("returns user-friendly error when parent folder not found", async () => {
    const result = await createNoteFolderAction({
      name: "Child Folder",
      parentId: "non-existent-id",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(
      /parent.*not found|not found/i,
    );
    expect(result.serverError).not.toContain("PrismaClient");
  });

  it("returns user-friendly error when user doesn't have permission to create in parent", async () => {
    const otherUser = await createTestUser({
      email: `other-user-${Date.now()}@example.com`,
    });

    const parentFolder = await db.noteFolder.create({
      data: {
        userId: otherUser.id,
        name: "Other User's Folder",
        context: "global",
      },
    });

    const result = await createNoteFolderAction({
      name: "Child Folder",
      parentId: parentFolder.id,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(/permission|don't have/i);
    expect(result.serverError).not.toContain("PrismaClient");
  });

  it("throws user-friendly error when user is not authenticated", async () => {
    mockNoAuthSession();

    const result = await createNoteFolderAction({
      name: "Test Folder",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(
      /need.*logged|unauthorized|must.*sign/i,
    );
    expect(result.serverError).not.toContain("PrismaClient");
  });

  it("validates required fields", async () => {
    const result = await createNoteFolderAction({
      name: "",
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("name");
  });

  it("validates name length", async () => {
    const longName = "a".repeat(101);
    const result = await createNoteFolderAction({
      name: longName,
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("name");
  });

  it("validates description length", async () => {
    const longDescription = "a".repeat(501);
    const result = await createNoteFolderAction({
      name: "Test Folder",
      description: longDescription,
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("description");
  });

  it("creates a global folder", async () => {
    const result = await createNoteFolderAction({
      name: "Global Folder",
      context: "global",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.folder.context).toBe("global");
  });
});
