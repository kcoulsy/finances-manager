import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/features/shared/lib/db/client";
import {
  createTestUser,
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/features/shared/testing/helpers";
import { updateNoteFolderAction } from "./update-note-folder.action";

describe("updateNoteFolderAction", () => {
  let testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    testUser = await setupTestUserWithSession();
  });

  it("updates a folder successfully", async () => {
    const folder = await db.noteFolder.create({
      data: {
        userId: testUser.id,
        name: "Original Name",
        description: "Original description",
        context: "global",
      },
    });

    const result = await updateNoteFolderAction({
      folderId: folder.id,
      name: "Updated Name",
      description: "Updated description",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.folder).toBeDefined();
    expect(result.data?.folder.name).toBe("Updated Name");
    expect(result.data?.folder.description).toBe("Updated description");
    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.message).toBe("Folder updated successfully");
    expect(result.data?.toast?.type).toBe("success");

    const updatedFolder = await db.noteFolder.findUnique({
      where: { id: folder.id },
    });

    expect(updatedFolder?.name).toBe("Updated Name");
    expect(updatedFolder?.description).toBe("Updated description");
  });

  it("updates folder parentId", async () => {
    const parent1 = await db.noteFolder.create({
      data: {
        userId: testUser.id,
        name: "Parent 1",
        context: "global",
      },
    });

    const parent2 = await db.noteFolder.create({
      data: {
        userId: testUser.id,
        name: "Parent 2",
        context: "global",
      },
    });

    const folder = await db.noteFolder.create({
      data: {
        userId: testUser.id,
        name: "Child Folder",
        parentId: parent1.id,
        context: "global",
      },
    });

    const result = await updateNoteFolderAction({
      folderId: folder.id,
      name: "Child Folder",
      parentId: parent2.id,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.folder.parentId).toBe(parent2.id);

    const updatedFolder = await db.noteFolder.findUnique({
      where: { id: folder.id },
      include: { parent: true },
    });

    expect(updatedFolder?.parent?.name).toBe("Parent 2");
  });

  it("removes parent when parentId is null", async () => {
    const parent = await db.noteFolder.create({
      data: {
        userId: testUser.id,
        name: "Parent Folder",
        context: "global",
      },
    });

    const folder = await db.noteFolder.create({
      data: {
        userId: testUser.id,
        name: "Child Folder",
        parentId: parent.id,
        context: "global",
      },
    });

    const result = await updateNoteFolderAction({
      folderId: folder.id,
      name: "Child Folder",
      parentId: null,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.folder.parentId).toBeNull();

    const updatedFolder = await db.noteFolder.findUnique({
      where: { id: folder.id },
    });

    expect(updatedFolder?.parentId).toBeNull();
  });

  it("updates only name when description is not provided", async () => {
    const folder = await db.noteFolder.create({
      data: {
        userId: testUser.id,
        name: "Original Name",
        description: "Original description",
        context: "global",
      },
    });

    const result = await updateNoteFolderAction({
      folderId: folder.id,
      name: "Updated Name",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.folder.name).toBe("Updated Name");
    // Description should remain unchanged
    expect(result.data?.folder.description).toBe("Original description");
  });

  it("returns user-friendly error when folder not found", async () => {
    const result = await updateNoteFolderAction({
      folderId: "non-existent-id",
      name: "Updated Name",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(/not found/i);
    expect(result.serverError).not.toContain("PrismaClient");
  });

  it("returns user-friendly error when user doesn't have permission", async () => {
    const otherUser = await createTestUser({
      email: `other-user-${Date.now()}@example.com`,
    });

    const folder = await db.noteFolder.create({
      data: {
        userId: otherUser.id,
        name: "Other User's Folder",
        context: "global",
      },
    });

    const result = await updateNoteFolderAction({
      folderId: folder.id,
      name: "Updated Name",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(/permission|don't have/i);
    expect(result.serverError).not.toContain("PrismaClient");
  });

  it("throws user-friendly error when user is not authenticated", async () => {
    const folder = await db.noteFolder.create({
      data: {
        userId: testUser.id,
        name: "Test Folder",
        context: "global",
      },
    });

    mockNoAuthSession();

    const result = await updateNoteFolderAction({
      folderId: folder.id,
      name: "Updated Name",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(
      /need.*logged|unauthorized|must.*sign/i,
    );
    expect(result.serverError).not.toContain("PrismaClient");
  });

  it("validates required fields", async () => {
    const result = await updateNoteFolderAction({
      folderId: "",
      name: "Updated Name",
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("folderId");
  });

  it("validates name length", async () => {
    const folder = await db.noteFolder.create({
      data: {
        userId: testUser.id,
        name: "Test Folder",
        context: "global",
      },
    });

    const longName = "a".repeat(101);
    const result = await updateNoteFolderAction({
      folderId: folder.id,
      name: longName,
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("name");
  });

  it("validates description length", async () => {
    const folder = await db.noteFolder.create({
      data: {
        userId: testUser.id,
        name: "Test Folder",
        context: "global",
      },
    });

    const longDescription = "a".repeat(501);
    const result = await updateNoteFolderAction({
      folderId: folder.id,
      name: "Test Folder",
      description: longDescription,
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("description");
  });
});
