import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/features/shared/lib/db/client";
import {
  createTestUser,
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/features/shared/testing/helpers";
import { updateNoteAction } from "./update-note.action";

describe("updateNoteAction", () => {
  let testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    testUser = await setupTestUserWithSession();
  });

  it("updates a note successfully", async () => {
    const note = await db.note.create({
      data: {
        userId: testUser.id,
        content: "Original content",
        title: "Original title",
        priority: "NORMAL",
      },
    });

    const result = await updateNoteAction({
      noteId: note.id,
      content: "Updated content",
      title: "Updated title",
      priority: "HIGH",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.note).toBeDefined();
    expect(result.data?.note.content).toBe("Updated content");
    expect(result.data?.note.title).toBe("Updated title");
    expect(result.data?.note.priority).toBe("HIGH");
    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.message).toBe("Note updated successfully");
    expect(result.data?.toast?.type).toBe("success");

    const updatedNote = await db.note.findUnique({
      where: { id: note.id },
    });

    expect(updatedNote?.content).toBe("Updated content");
    expect(updatedNote?.title).toBe("Updated title");
    expect(updatedNote?.priority).toBe("HIGH");
  });

  it("updates note category", async () => {
    const category1 = await db.noteCategory.create({
      data: {
        userId: testUser.id,
        name: "Category 1",
        color: "BLUE",
      },
    });

    const category2 = await db.noteCategory.create({
      data: {
        userId: testUser.id,
        name: "Category 2",
        color: "RED",
      },
    });

    const note = await db.note.create({
      data: {
        userId: testUser.id,
        content: "Test note",
        categoryId: category1.id,
      },
    });

    const result = await updateNoteAction({
      noteId: note.id,
      content: "Test note",
      categoryId: category2.id,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.note.categoryId).toBe(category2.id);

    const updatedNote = await db.note.findUnique({
      where: { id: note.id },
      include: { category: true },
    });

    expect(updatedNote?.category?.name).toBe("Category 2");
  });

  it("updates note folder", async () => {
    const folder1 = await db.noteFolder.create({
      data: {
        userId: testUser.id,
        name: "Folder 1",
        context: "global",
      },
    });

    const folder2 = await db.noteFolder.create({
      data: {
        userId: testUser.id,
        name: "Folder 2",
        context: "global",
      },
    });

    const note = await db.note.create({
      data: {
        userId: testUser.id,
        content: "Test note",
        folderId: folder1.id,
      },
    });

    const result = await updateNoteAction({
      noteId: note.id,
      content: "Test note",
      folderId: folder2.id,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.note.folderId).toBe(folder2.id);

    const updatedNote = await db.note.findUnique({
      where: { id: note.id },
      include: { folder: true },
    });

    expect(updatedNote?.folder?.name).toBe("Folder 2");
  });

  it("removes category when categoryId is null", async () => {
    const category = await db.noteCategory.create({
      data: {
        userId: testUser.id,
        name: "Category",
        color: "BLUE",
      },
    });

    const note = await db.note.create({
      data: {
        userId: testUser.id,
        content: "Test note",
        categoryId: category.id,
      },
    });

    const result = await updateNoteAction({
      noteId: note.id,
      content: "Test note",
      categoryId: null,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.note.categoryId).toBeNull();

    const updatedNote = await db.note.findUnique({
      where: { id: note.id },
    });

    expect(updatedNote?.categoryId).toBeNull();
  });

  it("updates note links", async () => {
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
        content: "Test note",
        noteLinks: {
          create: [{ linkType: "Project", linkId: project1.id }],
        },
      },
    });

    const result = await updateNoteAction({
      noteId: note.id,
      content: "Test note",
      links: [
        { linkType: "Project", linkId: project2.id },
        { linkType: "Contact", linkId: contact.id },
      ],
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.note.noteLinks).toBeDefined();
    expect(result.data?.note.noteLinks.length).toBe(2);

    const updatedNote = await db.note.findUnique({
      where: { id: note.id },
      include: { noteLinks: true },
    });

    expect(updatedNote?.noteLinks).toHaveLength(2);
    expect(
      updatedNote?.noteLinks.some(
        (link) => link.linkType === "Project" && link.linkId === project2.id,
      ),
    ).toBe(true);
    expect(
      updatedNote?.noteLinks.some(
        (link) => link.linkType === "Contact" && link.linkId === contact.id,
      ),
    ).toBe(true);
    expect(
      updatedNote?.noteLinks.some((link) => link.linkId === project1.id),
    ).toBe(false);
  });

  it("removes all links when links is empty array", async () => {
    const project = await db.project.create({
      data: {
        userId: testUser.id,
        name: "Test Project",
      },
    });

    const note = await db.note.create({
      data: {
        userId: testUser.id,
        content: "Test note",
        noteLinks: {
          create: [{ linkType: "Project", linkId: project.id }],
        },
      },
    });

    const result = await updateNoteAction({
      noteId: note.id,
      content: "Test note",
      links: [],
    });

    expect(result.data?.success).toBe(true);

    const updatedNote = await db.note.findUnique({
      where: { id: note.id },
      include: { noteLinks: true },
    });

    expect(updatedNote?.noteLinks).toHaveLength(0);
  });

  it("returns user-friendly error when note not found", async () => {
    const result = await updateNoteAction({
      noteId: "non-existent-id",
      content: "Updated content",
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

    const result = await updateNoteAction({
      noteId: note.id,
      content: "Updated content",
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

    const result = await updateNoteAction({
      noteId: note.id,
      content: "Updated content",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(
      /need.*logged|unauthorized|must.*sign/i,
    );
    expect(result.serverError).not.toContain("PrismaClient");
  });

  it("validates required fields", async () => {
    const note = await db.note.create({
      data: {
        userId: testUser.id,
        content: "Test note",
      },
    });

    const result = await updateNoteAction({
      noteId: note.id,
      content: "",
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("content");
  });

  it("validates content length", async () => {
    const note = await db.note.create({
      data: {
        userId: testUser.id,
        content: "Test note",
      },
    });

    const longContent = "a".repeat(4001);
    const result = await updateNoteAction({
      noteId: note.id,
      content: longContent,
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("content");
  });

  it("validates title length", async () => {
    const note = await db.note.create({
      data: {
        userId: testUser.id,
        content: "Test note",
      },
    });

    const longTitle = "a".repeat(201);
    const result = await updateNoteAction({
      noteId: note.id,
      content: "Test content",
      title: longTitle,
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("title");
  });
});
