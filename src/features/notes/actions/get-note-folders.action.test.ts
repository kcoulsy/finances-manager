import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/features/shared/lib/db/client";
import {
  createTestUser,
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/features/shared/testing/helpers";
import { getNoteFoldersAction } from "./get-note-folders.action";

describe("getNoteFoldersAction", () => {
  let testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    testUser = await setupTestUserWithSession();
  });

  it("gets folders successfully with default filters", async () => {
    await db.noteFolder.createMany({
      data: [
        {
          userId: testUser.id,
          name: "Folder 1",
          context: "global",
        },
        {
          userId: testUser.id,
          name: "Folder 2",
          context: "global",
        },
        {
          userId: testUser.id,
          name: "Folder 3",
          context: "project",
        },
      ],
    });

    const result = await getNoteFoldersAction({});

    expect(result.data?.success).toBe(true);
    expect(result.data?.folders).toBeDefined();
    expect(result.data?.folders.length).toBeGreaterThanOrEqual(3);
  });

  it("filters folders by projectId", async () => {
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

    await db.noteFolder.createMany({
      data: [
        {
          userId: testUser.id,
          name: "Folder for Project 1",
          projectId: project1.id,
          context: "project",
        },
        {
          userId: testUser.id,
          name: "Folder for Project 2",
          projectId: project2.id,
          context: "project",
        },
        {
          userId: testUser.id,
          name: "Folder without project",
          context: "global",
        },
      ],
    });

    const result = await getNoteFoldersAction({
      projectId: project1.id,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.folders.length).toBeGreaterThanOrEqual(1);
    expect(
      result.data?.folders.every((folder) => folder.projectId === project1.id),
    ).toBe(true);
  });

  it("filters folders by context", async () => {
    await db.noteFolder.createMany({
      data: [
        {
          userId: testUser.id,
          name: "Global Folder",
          context: "global",
        },
        {
          userId: testUser.id,
          name: "Project Folder",
          context: "project",
        },
      ],
    });

    const result = await getNoteFoldersAction({
      context: "global",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.folders.length).toBeGreaterThanOrEqual(1);
    expect(
      result.data?.folders.every((folder) => folder.context === "global"),
    ).toBe(true);
  });

  it("filters folders by parentId", async () => {
    const parentFolder = await db.noteFolder.create({
      data: {
        userId: testUser.id,
        name: "Parent Folder",
        context: "global",
      },
    });

    await db.noteFolder.createMany({
      data: [
        {
          userId: testUser.id,
          name: "Child Folder 1",
          parentId: parentFolder.id,
          context: "global",
        },
        {
          userId: testUser.id,
          name: "Child Folder 2",
          parentId: parentFolder.id,
          context: "global",
        },
        {
          userId: testUser.id,
          name: "Root Folder",
          context: "global",
        },
      ],
    });

    const result = await getNoteFoldersAction({
      parentId: parentFolder.id,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.folders.length).toBeGreaterThanOrEqual(2);
    expect(
      result.data?.folders.every(
        (folder) => folder.parentId === parentFolder.id,
      ),
    ).toBe(true);
  });

  it("filters folders with null parentId (root folders)", async () => {
    const parentFolder = await db.noteFolder.create({
      data: {
        userId: testUser.id,
        name: "Parent Folder",
        context: "global",
      },
    });

    await db.noteFolder.createMany({
      data: [
        {
          userId: testUser.id,
          name: "Root Folder 1",
          context: "global",
        },
        {
          userId: testUser.id,
          name: "Root Folder 2",
          context: "global",
        },
        {
          userId: testUser.id,
          name: "Child Folder",
          parentId: parentFolder.id,
          context: "global",
        },
      ],
    });

    const result = await getNoteFoldersAction({
      parentId: null,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.folders.length).toBeGreaterThanOrEqual(2);
    expect(
      result.data?.folders.every((folder) => folder.parentId === null),
    ).toBe(true);
  });

  it("includes note and children counts", async () => {
    const folder = await db.noteFolder.create({
      data: {
        userId: testUser.id,
        name: "Test Folder",
        context: "global",
      },
    });

    await db.note.createMany({
      data: [
        {
          userId: testUser.id,
          content: "Note 1",
          folderId: folder.id,
        },
        {
          userId: testUser.id,
          content: "Note 2",
          folderId: folder.id,
        },
      ],
    });

    await db.noteFolder.create({
      data: {
        userId: testUser.id,
        name: "Child Folder",
        parentId: folder.id,
        context: "global",
      },
    });

    const result = await getNoteFoldersAction({});

    expect(result.data?.success).toBe(true);
    const foundFolder = result.data?.folders.find((f) => f.id === folder.id);
    expect(foundFolder?._count?.notes).toBeGreaterThanOrEqual(2);
    expect(foundFolder?._count?.children).toBeGreaterThanOrEqual(1);
  });

  it("sorts folders by sortOrder and name", async () => {
    await db.noteFolder.createMany({
      data: [
        {
          userId: testUser.id,
          name: "Z Folder",
          sortOrder: 0,
          context: "global",
        },
        {
          userId: testUser.id,
          name: "A Folder",
          sortOrder: 0,
          context: "global",
        },
        {
          userId: testUser.id,
          name: "B Folder",
          sortOrder: 1,
          context: "global",
        },
      ],
    });

    const result = await getNoteFoldersAction({});

    expect(result.data?.success).toBe(true);
    const folderNames = result.data?.folders.map((f) => f.name) || [];
    const aIndex = folderNames.indexOf("A Folder");
    const zIndex = folderNames.indexOf("Z Folder");
    const bIndex = folderNames.indexOf("B Folder");

    // A should come before Z (same sortOrder, sorted by name)
    if (aIndex !== -1 && zIndex !== -1) {
      expect(aIndex).toBeLessThan(zIndex);
    }
    // B should come after A and Z (higher sortOrder)
    if (bIndex !== -1 && aIndex !== -1 && zIndex !== -1) {
      expect(bIndex).toBeGreaterThan(aIndex);
      expect(bIndex).toBeGreaterThan(zIndex);
    }
  });

  it("only returns folders for the authenticated user", async () => {
    const otherUser = await createTestUser({
      email: `other-user-${Date.now()}@example.com`,
    });

    await db.noteFolder.createMany({
      data: [
        {
          userId: testUser.id,
          name: "My Folder",
          context: "global",
        },
        {
          userId: otherUser.id,
          name: "Other User's Folder",
          context: "global",
        },
      ],
    });

    const result = await getNoteFoldersAction({});

    expect(result.data?.success).toBe(true);
    expect(
      result.data?.folders.every((folder) => folder.userId === testUser.id),
    ).toBe(true);
  });

  it("throws user-friendly error when user is not authenticated", async () => {
    mockNoAuthSession();

    const result = await getNoteFoldersAction({});

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(
      /need.*logged|unauthorized|must.*sign/i,
    );
    expect(result.serverError).not.toContain("PrismaClient");
  });
});
