import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/features/shared/lib/db/client";
import {
  createTestUser,
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/features/shared/testing/helpers";
import { restoreNoteAction } from "./restore-note.action";

describe("restoreNoteAction", () => {
  let testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    testUser = await setupTestUserWithSession();
  });

  it("restores a deleted note successfully", async () => {
    const note = await db.note.create({
      data: {
        userId: testUser.id,
        content: "Deleted note",
        deletedAt: new Date(),
        status: "DELETED",
      },
    });

    const result = await restoreNoteAction({
      noteId: note.id,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.message).toBe("Note restored successfully");
    expect(result.data?.toast?.type).toBe("success");
    expect(result.data?.toast?.description).toContain("restored");

    const restoredNote = await db.note.findUnique({
      where: { id: note.id },
    });

    expect(restoredNote).toBeDefined();
    expect(restoredNote?.deletedAt).toBeNull();
    expect(restoredNote?.status).toBe("ACTIVE");
  });

  it("restores a note with projectId and revalidates path", async () => {
    const project = await db.project.create({
      data: {
        userId: testUser.id,
        name: "Test Project",
      },
    });

    const note = await db.note.create({
      data: {
        userId: testUser.id,
        content: "Deleted note with project",
        projectId: project.id,
        deletedAt: new Date(),
        status: "DELETED",
      },
    });

    const result = await restoreNoteAction({
      noteId: note.id,
    });

    expect(result.data?.success).toBe(true);

    const restoredNote = await db.note.findUnique({
      where: { id: note.id },
    });

    expect(restoredNote?.deletedAt).toBeNull();
    expect(restoredNote?.status).toBe("ACTIVE");
  });

  it("returns user-friendly error when note not found", async () => {
    const result = await restoreNoteAction({
      noteId: "non-existent-id",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(/not found/i);
    expect(result.serverError).not.toContain("PrismaClient");
  });

  it("returns user-friendly error when note is not deleted", async () => {
    const note = await db.note.create({
      data: {
        userId: testUser.id,
        content: "Active note",
        deletedAt: null,
        status: "ACTIVE",
      },
    });

    const result = await restoreNoteAction({
      noteId: note.id,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(
      /not deleted|is not deleted/i,
    );
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
        deletedAt: new Date(),
        status: "DELETED",
      },
    });

    const result = await restoreNoteAction({
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
        content: "Deleted note",
        deletedAt: new Date(),
        status: "DELETED",
      },
    });

    mockNoAuthSession();

    const result = await restoreNoteAction({
      noteId: note.id,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(
      /need.*logged|unauthorized|must.*sign/i,
    );
    expect(result.serverError).not.toContain("PrismaClient");
  });

  it("validates noteId is required", async () => {
    const result = await restoreNoteAction({
      noteId: "",
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("noteId");
  });
});
