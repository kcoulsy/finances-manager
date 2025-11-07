import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/features/shared/lib/db/client";
import {
  createTestUser,
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/features/shared/testing/helpers";
import { permanentlyDeleteNoteAction } from "./permanently-delete-note.action";

describe("permanentlyDeleteNoteAction", () => {
  let testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    testUser = await setupTestUserWithSession();
  });

  it("permanently deletes a note successfully", async () => {
    const note = await db.note.create({
      data: {
        userId: testUser.id,
        content: "Test note to permanently delete",
      },
    });

    const noteId = note.id;

    const result = await permanentlyDeleteNoteAction({
      noteId: note.id,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.message).toBe("Note permanently deleted");
    expect(result.data?.toast?.type).toBe("success");
    expect(result.data?.toast?.description).toContain("permanently deleted");

    const deletedNote = await db.note.findUnique({
      where: { id: noteId },
    });

    expect(deletedNote).toBeNull();
  });

  it("permanently deletes a note with projectId and revalidates path", async () => {
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

    const noteId = note.id;

    const result = await permanentlyDeleteNoteAction({
      noteId: note.id,
    });

    expect(result.data?.success).toBe(true);

    const deletedNote = await db.note.findUnique({
      where: { id: noteId },
    });

    expect(deletedNote).toBeNull();
  });

  it("permanently deletes a note with links", async () => {
    const project = await db.project.create({
      data: {
        userId: testUser.id,
        name: "Test Project",
      },
    });

    const note = await db.note.create({
      data: {
        userId: testUser.id,
        content: "Test note with links",
        noteLinks: {
          create: [{ linkType: "Project", linkId: project.id }],
        },
      },
    });

    const noteId = note.id;

    const result = await permanentlyDeleteNoteAction({
      noteId: note.id,
    });

    expect(result.data?.success).toBe(true);

    const deletedNote = await db.note.findUnique({
      where: { id: noteId },
    });

    expect(deletedNote).toBeNull();

    // Note links should be cascade deleted
    const noteLinks = await db.noteLink.findMany({
      where: { noteId },
    });

    expect(noteLinks).toHaveLength(0);
  });

  it("returns user-friendly error when note not found", async () => {
    const result = await permanentlyDeleteNoteAction({
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

    const result = await permanentlyDeleteNoteAction({
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

    const result = await permanentlyDeleteNoteAction({
      noteId: note.id,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(
      /need.*logged|unauthorized|must.*sign/i,
    );
    expect(result.serverError).not.toContain("PrismaClient");
  });

  it("validates noteId is required", async () => {
    const result = await permanentlyDeleteNoteAction({
      noteId: "",
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("noteId");
  });
});
