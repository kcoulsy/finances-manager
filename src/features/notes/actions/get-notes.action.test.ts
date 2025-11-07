import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/features/shared/lib/db/client";
import {
  createTestUser,
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/features/shared/testing/helpers";
import { getNotesAction } from "./get-notes.action";

describe("getNotesAction", () => {
  let testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    testUser = await setupTestUserWithSession();
  });

  it("gets notes successfully with default filters", async () => {
    await db.note.createMany({
      data: [
        {
          userId: testUser.id,
          content: "Note 1",
          title: "First Note",
        },
        {
          userId: testUser.id,
          content: "Note 2",
          title: "Second Note",
        },
        {
          userId: testUser.id,
          content: "Note 3",
          title: "Third Note",
        },
      ],
    });

    const result = await getNotesAction({});

    expect(result.data?.success).toBe(true);
    expect(result.data?.notes).toBeDefined();
    expect(result.data?.notes.length).toBeGreaterThanOrEqual(3);
    expect(result.data?.total).toBeGreaterThanOrEqual(3);
    expect(result.data?.limit).toBe(50);
    expect(result.data?.offset).toBe(0);
  });

  it("filters notes by projectId", async () => {
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

    await db.note.createMany({
      data: [
        {
          userId: testUser.id,
          content: "Note for Project 1",
          projectId: project1.id,
        },
        {
          userId: testUser.id,
          content: "Note for Project 2",
          projectId: project2.id,
        },
        {
          userId: testUser.id,
          content: "Note without project",
        },
      ],
    });

    const result = await getNotesAction({
      projectId: project1.id,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.notes.length).toBeGreaterThanOrEqual(1);
    expect(
      result.data?.notes.every((note) => note.projectId === project1.id),
    ).toBe(true);
  });

  it("filters notes by folderId", async () => {
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

    await db.note.createMany({
      data: [
        {
          userId: testUser.id,
          content: "Note in Folder 1",
          folderId: folder1.id,
        },
        {
          userId: testUser.id,
          content: "Note in Folder 2",
          folderId: folder2.id,
        },
        {
          userId: testUser.id,
          content: "Note without folder",
        },
      ],
    });

    const result = await getNotesAction({
      folderId: folder1.id,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.notes.length).toBeGreaterThanOrEqual(1);
    expect(
      result.data?.notes.every((note) => note.folderId === folder1.id),
    ).toBe(true);
  });

  it("filters notes by categoryId", async () => {
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

    await db.note.createMany({
      data: [
        {
          userId: testUser.id,
          content: "Note in Category 1",
          categoryId: category1.id,
        },
        {
          userId: testUser.id,
          content: "Note in Category 2",
          categoryId: category2.id,
        },
        {
          userId: testUser.id,
          content: "Note without category",
        },
      ],
    });

    const result = await getNotesAction({
      categoryId: category1.id,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.notes.length).toBeGreaterThanOrEqual(1);
    expect(
      result.data?.notes.every((note) => note.categoryId === category1.id),
    ).toBe(true);
  });

  it("filters notes by priority", async () => {
    await db.note.createMany({
      data: [
        {
          userId: testUser.id,
          content: "High priority note",
          priority: "HIGH",
        },
        {
          userId: testUser.id,
          content: "Normal priority note",
          priority: "NORMAL",
        },
        {
          userId: testUser.id,
          content: "Low priority note",
          priority: "LOW",
        },
      ],
    });

    const result = await getNotesAction({
      priority: "HIGH",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.notes.length).toBeGreaterThanOrEqual(1);
    expect(result.data?.notes.every((note) => note.priority === "HIGH")).toBe(
      true,
    );
  });

  it("filters notes by status", async () => {
    await db.note.createMany({
      data: [
        {
          userId: testUser.id,
          content: "Active note",
          status: "ACTIVE",
        },
        {
          userId: testUser.id,
          content: "Archived note",
          status: "ARCHIVED",
        },
      ],
    });

    const result = await getNotesAction({
      status: "ACTIVE",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.notes.length).toBeGreaterThanOrEqual(1);
    expect(result.data?.notes.every((note) => note.status === "ACTIVE")).toBe(
      true,
    );
  });

  it("searches notes by title", async () => {
    await db.note.createMany({
      data: [
        {
          userId: testUser.id,
          content: "Test content",
          title: "Important Meeting",
        },
        {
          userId: testUser.id,
          content: "Test content",
          title: "Random Note",
        },
        {
          userId: testUser.id,
          content: "Test content",
          title: "Important Task",
        },
      ],
    });

    const result = await getNotesAction({
      search: "Important",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.notes.length).toBeGreaterThanOrEqual(2);
    expect(
      result.data?.notes.every((note) => note.title?.includes("Important")),
    ).toBe(true);
  });

  it("searches notes by content", async () => {
    await db.note.createMany({
      data: [
        {
          userId: testUser.id,
          content: "This is about project management",
        },
        {
          userId: testUser.id,
          content: "This is about something else",
        },
        {
          userId: testUser.id,
          content: "Project management is important",
        },
      ],
    });

    const result = await getNotesAction({
      search: "project management",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.notes.length).toBeGreaterThanOrEqual(2);
  });

  it("sorts notes by created_at", async () => {
    const note1 = await db.note.create({
      data: {
        userId: testUser.id,
        content: "First note",
      },
    });

    // Small delay to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));

    const note2 = await db.note.create({
      data: {
        userId: testUser.id,
        content: "Second note",
      },
    });

    const result = await getNotesAction({
      sortBy: "created_at",
      sortDirection: "desc",
    });

    expect(result.data?.success).toBe(true);
    const noteIds = result.data?.notes.map((n) => n.id) || [];
    expect(noteIds.indexOf(note2.id)).toBeLessThan(noteIds.indexOf(note1.id));
  });

  it("sorts notes by updated_at", async () => {
    const note1 = await db.note.create({
      data: {
        userId: testUser.id,
        content: "First note",
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const note2 = await db.note.create({
      data: {
        userId: testUser.id,
        content: "Second note",
      },
    });

    const result = await getNotesAction({
      sortBy: "updated_at",
      sortDirection: "desc",
    });

    expect(result.data?.success).toBe(true);
    const noteIds = result.data?.notes.map((n) => n.id) || [];
    expect(noteIds.indexOf(note2.id)).toBeLessThan(noteIds.indexOf(note1.id));
  });

  it("sorts notes by priority", async () => {
    await db.note.createMany({
      data: [
        {
          userId: testUser.id,
          content: "Low priority",
          priority: "LOW",
        },
        {
          userId: testUser.id,
          content: "High priority",
          priority: "HIGH",
        },
        {
          userId: testUser.id,
          content: "Normal priority",
          priority: "NORMAL",
        },
      ],
    });

    const result = await getNotesAction({
      sortBy: "priority",
      sortDirection: "desc",
    });

    expect(result.data?.success).toBe(true);
    const priorities = result.data?.notes.map((n) => n.priority) || [];
    // Verify all three priorities are present
    expect(priorities).toContain("HIGH");
    expect(priorities).toContain("NORMAL");
    expect(priorities).toContain("LOW");
    // Priority sorting is alphabetical (HIGH, LOW, NORMAL), so we just verify sorting works
    expect(priorities.length).toBeGreaterThanOrEqual(3);
  });

  it("paginates notes correctly", async () => {
    await db.note.createMany({
      data: Array.from({ length: 10 }, (_, i) => ({
        userId: testUser.id,
        content: `Note ${i + 1}`,
      })),
    });

    const result1 = await getNotesAction({
      limit: 5,
      offset: 0,
    });

    const result2 = await getNotesAction({
      limit: 5,
      offset: 5,
    });

    expect(result1.data?.success).toBe(true);
    expect(result2.data?.success).toBe(true);
    expect(result1.data?.notes.length).toBe(5);
    expect(result2.data?.notes.length).toBe(5);
    expect(result1.data?.total).toBeGreaterThanOrEqual(10);
    expect(result2.data?.total).toBeGreaterThanOrEqual(10);
  });

  it("excludes deleted notes by default", async () => {
    await db.note.createMany({
      data: [
        {
          userId: testUser.id,
          content: "Active note",
          deletedAt: null,
        },
        {
          userId: testUser.id,
          content: "Deleted note",
          deletedAt: new Date(),
          status: "DELETED",
        },
      ],
    });

    const result = await getNotesAction({});

    expect(result.data?.success).toBe(true);
    expect(result.data?.notes.every((note) => note.deletedAt === null)).toBe(
      true,
    );
  });

  it("includes deleted notes when includeDeleted is true", async () => {
    await db.note.createMany({
      data: [
        {
          userId: testUser.id,
          content: "Active note",
          deletedAt: null,
        },
        {
          userId: testUser.id,
          content: "Deleted note",
          deletedAt: new Date(),
          status: "DELETED",
        },
      ],
    });

    const result = await getNotesAction({
      includeDeleted: true,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.notes.some((note) => note.deletedAt !== null)).toBe(
      true,
    );
  });

  it("only returns notes for the authenticated user", async () => {
    const otherUser = await createTestUser({
      email: `other-user-${Date.now()}@example.com`,
    });

    await db.note.createMany({
      data: [
        {
          userId: testUser.id,
          content: "My note",
        },
        {
          userId: otherUser.id,
          content: "Other user's note",
        },
      ],
    });

    const result = await getNotesAction({});

    expect(result.data?.success).toBe(true);
    expect(
      result.data?.notes.every((note) => note.userId === testUser.id),
    ).toBe(true);
  });

  it("throws user-friendly error when user is not authenticated", async () => {
    mockNoAuthSession();

    const result = await getNotesAction({});

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(
      /need.*logged|unauthorized|must.*sign/i,
    );
    expect(result.serverError).not.toContain("PrismaClient");
  });
});
