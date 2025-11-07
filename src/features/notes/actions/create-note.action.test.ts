import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/features/shared/lib/db/client";
import {
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/features/shared/testing/helpers";
import { createNoteAction } from "./create-note.action";

describe("createNoteAction", () => {
  let testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    testUser = await setupTestUserWithSession();
  });

  it("creates a note successfully with minimal data", async () => {
    const result = await createNoteAction({
      content: "Test note content",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.note).toBeDefined();
    expect(result.data?.note.content).toBe("Test note content");
    expect(result.data?.note.userId).toBe(testUser.id);
    expect(result.data?.note.priority).toBe("NORMAL");
    expect(result.data?.note.status).toBe("ACTIVE");
    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.message).toBe("Note created successfully");
    expect(result.data?.toast?.type).toBe("success");

    const note = await db.note.findUnique({
      where: { id: result.data?.note.id },
    });

    expect(note).toBeDefined();
    expect(note?.content).toBe("Test note content");
    expect(note?.userId).toBe(testUser.id);
  });

  it("creates a note with all fields", async () => {
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

    const result = await createNoteAction({
      title: "Test Note Title",
      content: "Test note content with all fields",
      priority: "HIGH",
      status: "ACTIVE",
      categoryId: category.id,
      folderId: folder.id,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.note.title).toBe("Test Note Title");
    expect(result.data?.note.content).toBe("Test note content with all fields");
    expect(result.data?.note.priority).toBe("HIGH");
    expect(result.data?.note.status).toBe("ACTIVE");
    expect(result.data?.note.categoryId).toBe(category.id);
    expect(result.data?.note.folderId).toBe(folder.id);

    const note = await db.note.findUnique({
      where: { id: result.data?.note.id },
      include: { category: true, folder: true },
    });

    expect(note?.category?.name).toBe("Test Category");
    expect(note?.folder?.name).toBe("Test Folder");
  });

  it("creates a note with links", async () => {
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

    const result = await createNoteAction({
      content: "Test note with links",
      links: [
        { linkType: "Project", linkId: project.id },
        { linkType: "Contact", linkId: contact.id },
      ],
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.note.noteLinks).toBeDefined();
    expect(result.data?.note.noteLinks.length).toBe(2);

    const note = await db.note.findUnique({
      where: { id: result.data?.note.id },
      include: { noteLinks: true },
    });

    expect(note?.noteLinks).toHaveLength(2);
    expect(
      note?.noteLinks.some(
        (link) => link.linkType === "Project" && link.linkId === project.id,
      ),
    ).toBe(true);
    expect(
      note?.noteLinks.some(
        (link) => link.linkType === "Contact" && link.linkId === contact.id,
      ),
    ).toBe(true);
  });

  it("validates required fields", async () => {
    const result = await createNoteAction({
      content: "",
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("content");
  });

  it("validates content length", async () => {
    const longContent = "a".repeat(4001);
    const result = await createNoteAction({
      content: longContent,
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("content");
  });

  it("validates title length", async () => {
    const longTitle = "a".repeat(201);
    const result = await createNoteAction({
      title: longTitle,
      content: "Test content",
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("title");
  });

  it("throws user-friendly error when user is not authenticated", async () => {
    mockNoAuthSession();

    const result = await createNoteAction({
      content: "Test note content",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(
      /need.*logged|unauthorized|must.*sign/i,
    );
    expect(result.serverError).not.toContain("PrismaClient");
  });

  it("returns success toast with proper configuration", async () => {
    const result = await createNoteAction({
      content: "Test note content",
    });

    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.message).toBe("Note created successfully");
    expect(result.data?.toast?.type).toBe("success");
    expect(result.data?.toast?.description).toBe("Your note has been created.");
  });

  it("creates a note with legacy projectId field", async () => {
    const project = await db.project.create({
      data: {
        userId: testUser.id,
        name: "Test Project",
      },
    });

    const result = await createNoteAction({
      content: "Test note with project",
      projectId: project.id,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.note.projectId).toBe(project.id);

    const note = await db.note.findUnique({
      where: { id: result.data?.note.id },
      include: { project: true },
    });

    expect(note?.project?.name).toBe("Test Project");
  });

  it("creates a note with legacy contactId field", async () => {
    const contact = await db.contact.create({
      data: {
        userId: testUser.id,
        firstName: "Test",
        lastName: "Contact",
        email: `test-contact-${Date.now()}@example.com`,
        status: "PERSONAL",
      },
    });

    const result = await createNoteAction({
      content: "Test note with contact",
      contactId: contact.id,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.note.contactId).toBe(contact.id);

    const note = await db.note.findUnique({
      where: { id: result.data?.note.id },
      include: { contact: true },
    });

    expect(note?.contact?.firstName).toBe("Test");
  });
});
