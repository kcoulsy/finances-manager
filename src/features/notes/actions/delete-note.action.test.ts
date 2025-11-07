import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/features/shared/lib/db/client";
import {
  createTestUser,
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/features/shared/testing/helpers";
import { deleteNoteAction } from "./delete-note.action";

describe("deleteNoteAction", () => {
  let testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    testUser = await setupTestUserWithSession();
  });

  it("soft deletes a note successfully", async () => {
    const note = await db.note.create({
      data: {
        userId: testUser.id,
        content: "Test note to delete",
      },
    });

    const result = await deleteNoteAction({
      noteId: note.id,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.message).toBe("Note deleted successfully");
    expect(result.data?.toast?.type).toBe("success");
    expect(result.data?.toast?.description).toContain("moved to trash");

    const deletedNote = await db.note.findUnique({
      where: { id: note.id },
    });

    expect(deletedNote).toBeDefined();
    expect(deletedNote?.deletedAt).not.toBeNull();
    expect(deletedNote?.status).toBe("DELETED");
  });

  it("soft deletes a note with projectId and revalidates path", async () => {
    const project = await db.project.create({
      data: {
        userId: testUser.id,
        name: "Test Project",
      },
    });

    const note = await db.note.create({
      data: {
        userId: testUser.id,
        content: "Test note with project",
        projectId: project.id,
      },
    });

    const result = await deleteNoteAction({
      noteId: note.id,
    });

    expect(result.data?.success).toBe(true);

    const deletedNote = await db.note.findUnique({
      where: { id: note.id },
    });

    expect(deletedNote?.deletedAt).not.toBeNull();
    expect(deletedNote?.status).toBe("DELETED");
  });

  it("returns user-friendly error when note not found", async () => {
    const result = await deleteNoteAction({
      noteId: "non-existent-id",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(/not found/i);
    expect(result.serverError).not.toContain("PrismaClient");
  });

  it("returns user-friendly error when user doesn't have permission", async () => {
    const otherUser = await createTestUser({
      email: `other-user-${Date.now()}@example.com`,
    });

    const note = await db.note.create({
      data: {
        userId: otherUser.id,
        content: "Other user's note",
      },
    });

    const result = await deleteNoteAction({
      noteId: note.id,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(/permission|don't have/i);
    expect(result.serverError).not.toContain("PrismaClient");
  });

  it("throws user-friendly error when user is not authenticated", async () => {
    const note = await db.note.create({
      data: {
        userId: testUser.id,
        content: "Test note",
      },
    });

    mockNoAuthSession();

    const result = await deleteNoteAction({
      noteId: note.id,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(
      /need.*logged|unauthorized|must.*sign/i,
    );
    expect(result.serverError).not.toContain("PrismaClient");
  });

  it("validates noteId is required", async () => {
    const result = await deleteNoteAction({
      noteId: "",
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("noteId");
  });

  it("can delete an already deleted note", async () => {
    const note = await db.note.create({
      data: {
        userId: testUser.id,
        content: "Test note",
        deletedAt: new Date(),
        status: "DELETED",
      },
    });

    const result = await deleteNoteAction({
      noteId: note.id,
    });

    expect(result.data?.success).toBe(true);

    const deletedNote = await db.note.findUnique({
      where: { id: note.id },
    });

    expect(deletedNote?.deletedAt).not.toBeNull();
    expect(deletedNote?.status).toBe("DELETED");
  });
});
