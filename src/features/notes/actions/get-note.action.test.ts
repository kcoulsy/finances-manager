import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/features/shared/lib/db/client";
import {
  createTestUser,
  mockAuthSession,
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/features/shared/testing/helpers";
import { getNoteAction } from "./get-note.action";

describe("getNoteAction", () => {
  let testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    testUser = await setupTestUserWithSession();
  });

  it("gets a note successfully", async () => {
    const note = await db.note.create({
      data: {
        userId: testUser.id,
        content: "Test note content",
        title: "Test Note",
      },
    });

    const result = await getNoteAction({
      noteId: note.id,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.note).toBeDefined();
    expect(result.data?.note.id).toBe(note.id);
    expect(result.data?.note.content).toBe("Test note content");
    expect(result.data?.note.title).toBe("Test Note");
    expect(result.data?.note.userId).toBe(testUser.id);
  });

  it("gets a note with all relations", async () => {
    const category = await db.noteCategory.create({
      data: {
        userId: testUser.id,
        name: "Test Category",
        color: "BLUE",
      },
    });

    const folder = await db.noteFolder.create({
      data: {
        userId: testUser.id,
        name: "Test Folder",
        context: "global",
      },
    });

    const project = await db.project.create({
      data: {
        userId: testUser.id,
        name: "Test Project",
      },
    });

    const contact = await db.contact.create({
      data: {
        userId: testUser.id,
        firstName: "Test",
        lastName: "Contact",
        email: `test-contact-${Date.now()}@example.com`,
        status: "PERSONAL",
      },
    });

    const note = await db.note.create({
      data: {
        userId: testUser.id,
        content: "Test note with relations",
        categoryId: category.id,
        folderId: folder.id,
        projectId: project.id,
        contactId: contact.id,
      },
    });

    const result = await getNoteAction({
      noteId: note.id,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.note.category).toBeDefined();
    expect(result.data?.note.category?.name).toBe("Test Category");
    expect(result.data?.note.folder).toBeDefined();
    expect(result.data?.note.folder?.name).toBe("Test Folder");
    expect(result.data?.note.project).toBeDefined();
    expect(result.data?.note.project?.name).toBe("Test Project");
    expect(result.data?.note.contact).toBeDefined();
    expect(result.data?.note.contact?.firstName).toBe("Test");
  });

  it("gets a note with note links", async () => {
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

    const result = await getNoteAction({
      noteId: note.id,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.note.noteLinks).toBeDefined();
    expect(result.data?.note.noteLinks.length).toBe(1);
    expect(result.data?.note.noteLinks[0]?.linkType).toBe("Project");
    expect(result.data?.note.noteLinks[0]?.linkId).toBe(project.id);
  });

  it("returns user-friendly error when note not found", async () => {
    const result = await getNoteAction({
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

    const result = await getNoteAction({
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

    const result = await getNoteAction({
      noteId: note.id,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(
      /need.*logged|unauthorized|must.*sign/i,
    );
    expect(result.serverError).not.toContain("PrismaClient");
  });

  it("validates noteId is required", async () => {
    const result = await getNoteAction({
      noteId: "",
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("noteId");
  });
});
