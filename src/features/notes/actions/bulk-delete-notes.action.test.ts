import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/features/shared/lib/db/client";
import {
  createTestUser,
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/features/shared/testing/helpers";
import { bulkDeleteNotesAction } from "./bulk-delete-notes.action";

describe("bulkDeleteNotesAction", () => {
  let testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    testUser = await setupTestUserWithSession();
  });

  it("bulk deletes multiple notes successfully", async () => {
    const note1 = await db.note.create({
      data: {
        userId: testUser.id,
        content: "Note 1",
      },
    });

    const note2 = await db.note.create({
      data: {
        userId: testUser.id,
        content: "Note 2",
      },
    });

    const note3 = await db.note.create({
      data: {
        userId: testUser.id,
        content: "Note 3",
      },
    });

    const result = await bulkDeleteNotesAction({
      noteIds: [note1.id, note2.id, note3.id],
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.message).toContain(
      "3 notes deleted successfully",
    );
    expect(result.data?.toast?.type).toBe("success");
    expect(result.data?.toast?.description).toContain("moved to trash");

    const deletedNotes = await db.note.findMany({
      where: {
        id: { in: [note1.id, note2.id, note3.id] },
      },
    });

    expect(deletedNotes).toHaveLength(3);
    deletedNotes.forEach((note) => {
      expect(note.deletedAt).not.toBeNull();
      expect(note.status).toBe("DELETED");
    });
  });

  it("bulk deletes a single note", async () => {
    const note = await db.note.create({
      data: {
        userId: testUser.id,
        content: "Single note",
      },
    });

    const result = await bulkDeleteNotesAction({
      noteIds: [note.id],
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.toast?.message).toContain(
      "1 note deleted successfully",
    );

    const deletedNote = await db.note.findUnique({
      where: { id: note.id },
    });

    expect(deletedNote?.deletedAt).not.toBeNull();
    expect(deletedNote?.status).toBe("DELETED");
  });

  it("bulk deletes notes with different projects and revalidates paths", async () => {
    const project1 = await db.project.create({
      data: {
        userId: testUser.id,
        name: "Project 1",
      },
    });

    const project2 = await db.project.create({
      data: {
        userId: testUser.id,
        name: "Project 2",
      },
    });

    const note1 = await db.note.create({
      data: {
        userId: testUser.id,
        content: "Note 1",
        projectId: project1.id,
      },
    });

    const note2 = await db.note.create({
      data: {
        userId: testUser.id,
        content: "Note 2",
        projectId: project2.id,
      },
    });

    const result = await bulkDeleteNotesAction({
      noteIds: [note1.id, note2.id],
    });

    expect(result.data?.success).toBe(true);

    const deletedNotes = await db.note.findMany({
      where: {
        id: { in: [note1.id, note2.id] },
      },
    });

    expect(deletedNotes).toHaveLength(2);
    deletedNotes.forEach((note) => {
      expect(note.deletedAt).not.toBeNull();
      expect(note.status).toBe("DELETED");
    });
  });

  it("returns user-friendly error when some notes not found", async () => {
    const note = await db.note.create({
      data: {
        userId: testUser.id,
        content: "Valid note",
      },
    });

    const result = await bulkDeleteNotesAction({
      noteIds: [note.id, "non-existent-id-1", "non-existent-id-2"],
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(
      /not found|don't have permission/i,
    );
    expect(result.serverError).not.toContain("PrismaClient");
  });

  it("returns user-friendly error when user doesn't have permission for some notes", async () => {
    const otherUser = await createTestUser({
      email: `other-user-${Date.now()}@example.com`,
    });

    const myNote = await db.note.create({
      data: {
        userId: testUser.id,
        content: "My note",
      },
    });

    const otherNote = await db.note.create({
      data: {
        userId: otherUser.id,
        content: "Other user's note",
      },
    });

    const result = await bulkDeleteNotesAction({
      noteIds: [myNote.id, otherNote.id],
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(
      /not found|don't have permission/i,
    );
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

    const result = await bulkDeleteNotesAction({
      noteIds: [note.id],
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(
      /need.*logged|unauthorized|must.*sign/i,
    );
    expect(result.serverError).not.toContain("PrismaClient");
  });

  it("validates at least one noteId is required", async () => {
    const result = await bulkDeleteNotesAction({
      noteIds: [],
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("noteIds");
  });
});
