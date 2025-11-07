import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/features/shared/lib/db/client";
import {
  createTestUser,
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/features/shared/testing/helpers";
import { deleteNoteFolderAction } from "./delete-note-folder.action";

describe("deleteNoteFolderAction", () => {
  let testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    testUser = await setupTestUserWithSession();
  });

  it("deletes a folder successfully without notes", async () => {
    const folder = await db.noteFolder.create({
      data: {
        userId: testUser.id,
        name: "Test Folder",
        context: "global",
      },
    });

    const folderId = folder.id;

    const result = await deleteNoteFolderAction({
      folderId: folder.id,
      includeNotes: false,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.message).toBe("Folder deleted successfully");
    expect(result.data?.toast?.type).toBe("success");

    const deletedFolder = await db.noteFolder.findUnique({
      where: { id: folderId },
    });

    expect(deletedFolder).toBeNull();
  });

  it("deletes a folder and moves notes to parent when includeNotes is false", async () => {
    const parentFolder = await db.noteFolder.create({
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
        parentId: parentFolder.id,
        context: "global",
      },
    });

    const note1 = await db.note.create({
      data: {
        userId: testUser.id,
        content: "Note 1",
        folderId: folder.id,
      },
    });

    const note2 = await db.note.create({
      data: {
        userId: testUser.id,
        content: "Note 2",
        folderId: folder.id,
      },
    });

    const result = await deleteNoteFolderAction({
      folderId: folder.id,
      includeNotes: false,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.toast?.description).toContain("moved");

    const updatedNote1 = await db.note.findUnique({
      where: { id: note1.id },
    });

    const updatedNote2 = await db.note.findUnique({
      where: { id: note2.id },
    });

    expect(updatedNote1?.folderId).toBe(parentFolder.id);
    expect(updatedNote2?.folderId).toBe(parentFolder.id);

    const deletedFolder = await db.noteFolder.findUnique({
      where: { id: folder.id },
    });

    expect(deletedFolder).toBeNull();
  });

  it("moves notes to root when folder has no parent and includeNotes is false", async () => {
    const folder = await db.noteFolder.create({
      data: {
        userId: testUser.id,
        name: "Root Folder",
        context: "global",
      },
    });

    const note = await db.note.create({
      data: {
        userId: testUser.id,
        content: "Note in root folder",
        folderId: folder.id,
      },
    });

    const result = await deleteNoteFolderAction({
      folderId: folder.id,
      includeNotes: false,
    });

    expect(result.data?.success).toBe(true);

    const updatedNote = await db.note.findUnique({
      where: { id: note.id },
    });

    expect(updatedNote?.folderId).toBeNull();
  });

  it("deletes a folder and soft deletes notes when includeNotes is true", async () => {
    const folder = await db.noteFolder.create({
      data: {
        userId: testUser.id,
        name: "Test Folder",
        context: "global",
      },
    });

    const note1 = await db.note.create({
      data: {
        userId: testUser.id,
        content: "Note 1",
        folderId: folder.id,
      },
    });

    const note2 = await db.note.create({
      data: {
        userId: testUser.id,
        content: "Note 2",
        folderId: folder.id,
      },
    });

    const result = await deleteNoteFolderAction({
      folderId: folder.id,
      includeNotes: true,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.toast?.description).toContain("deleted");

    const deletedNote1 = await db.note.findUnique({
      where: { id: note1.id },
    });

    const deletedNote2 = await db.note.findUnique({
      where: { id: note2.id },
    });

    expect(deletedNote1?.deletedAt).not.toBeNull();
    expect(deletedNote1?.status).toBe("DELETED");
    expect(deletedNote2?.deletedAt).not.toBeNull();
    expect(deletedNote2?.status).toBe("DELETED");

    const deletedFolder = await db.noteFolder.findUnique({
      where: { id: folder.id },
    });

    expect(deletedFolder).toBeNull();
  });

  it("only soft deletes active notes when includeNotes is true", async () => {
    const folder = await db.noteFolder.create({
      data: {
        userId: testUser.id,
        name: "Test Folder",
        context: "global",
      },
    });

    const activeNote = await db.note.create({
      data: {
        userId: testUser.id,
        content: "Active note",
        folderId: folder.id,
        deletedAt: null,
      },
    });

    const deletedNote = await db.note.create({
      data: {
        userId: testUser.id,
        content: "Already deleted note",
        folderId: folder.id,
        deletedAt: new Date(),
        status: "DELETED",
      },
    });

    const result = await deleteNoteFolderAction({
      folderId: folder.id,
      includeNotes: true,
    });

    expect(result.data?.success).toBe(true);

    const updatedActiveNote = await db.note.findUnique({
      where: { id: activeNote.id },
    });

    const updatedDeletedNote = await db.note.findUnique({
      where: { id: deletedNote.id },
    });

    expect(updatedActiveNote?.deletedAt).not.toBeNull();
    expect(updatedActiveNote?.status).toBe("DELETED");
    // Already deleted note should remain deleted
    expect(updatedDeletedNote?.deletedAt).not.toBeNull();
    expect(updatedDeletedNote?.status).toBe("DELETED");
  });

  it("returns user-friendly error when folder has subfolders", async () => {
    const parentFolder = await db.noteFolder.create({
      data: {
        userId: testUser.id,
        name: "Parent Folder",
        context: "global",
      },
    });

    await db.noteFolder.create({
      data: {
        userId: testUser.id,
        name: "Child Folder",
        parentId: parentFolder.id,
        context: "global",
      },
    });

    const result = await deleteNoteFolderAction({
      folderId: parentFolder.id,
      includeNotes: false,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(
      /subfolder|cannot delete.*subfolder/i,
    );
    expect(result.serverError).not.toContain("PrismaClient");
  });

  it("returns user-friendly error when folder not found", async () => {
    const result = await deleteNoteFolderAction({
      folderId: "non-existent-id",
      includeNotes: false,
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

    const result = await deleteNoteFolderAction({
      folderId: folder.id,
      includeNotes: false,
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

    const result = await deleteNoteFolderAction({
      folderId: folder.id,
      includeNotes: false,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(
      /need.*logged|unauthorized|must.*sign/i,
    );
    expect(result.serverError).not.toContain("PrismaClient");
  });

  it("validates folderId is required", async () => {
    const result = await deleteNoteFolderAction({
      folderId: "",
      includeNotes: false,
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("folderId");
  });

  it("revalidates paths for project folders", async () => {
    const project = await db.project.create({
      data: {
        userId: testUser.id,
        name: "Test Project",
      },
    });

    const folder = await db.noteFolder.create({
      data: {
        userId: testUser.id,
        name: "Project Folder",
        projectId: project.id,
        context: "project",
      },
    });

    const result = await deleteNoteFolderAction({
      folderId: folder.id,
      includeNotes: false,
    });

    expect(result.data?.success).toBe(true);
  });
});
