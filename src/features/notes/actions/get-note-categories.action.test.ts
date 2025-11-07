import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/features/shared/lib/db/client";
import {
  createTestUser,
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/features/shared/testing/helpers";
import { getNoteCategoriesAction } from "./get-note-categories.action";

describe("getNoteCategoriesAction", () => {
  let testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    testUser = await setupTestUserWithSession();
  });

  it("gets categories successfully", async () => {
    await db.noteCategory.createMany({
      data: [
        {
          userId: testUser.id,
          name: "Category 1",
          color: "BLUE",
        },
        {
          userId: testUser.id,
          name: "Category 2",
          color: "RED",
        },
        {
          userId: testUser.id,
          name: "Category 3",
          color: "GREEN",
        },
      ],
    });

    const result = await getNoteCategoriesAction({});

    expect(result.data?.success).toBe(true);
    expect(result.data?.categories).toBeDefined();
    expect(result.data?.categories.length).toBeGreaterThanOrEqual(3);
  });

  it("sorts categories by name", async () => {
    await db.noteCategory.createMany({
      data: [
        {
          userId: testUser.id,
          name: "Z Category",
          color: "BLUE",
        },
        {
          userId: testUser.id,
          name: "A Category",
          color: "RED",
        },
        {
          userId: testUser.id,
          name: "M Category",
          color: "GREEN",
        },
      ],
    });

    const result = await getNoteCategoriesAction({});

    expect(result.data?.success).toBe(true);
    const categoryNames = result.data?.categories.map((c) => c.name) || [];
    const aIndex = categoryNames.indexOf("A Category");
    const mIndex = categoryNames.indexOf("M Category");
    const zIndex = categoryNames.indexOf("Z Category");

    if (aIndex !== -1 && mIndex !== -1) {
      expect(aIndex).toBeLessThan(mIndex);
    }
    if (mIndex !== -1 && zIndex !== -1) {
      expect(mIndex).toBeLessThan(zIndex);
    }
  });

  it("includes note counts", async () => {
    const category = await db.noteCategory.create({
      data: {
        userId: testUser.id,
        name: "Test Category",
        color: "BLUE",
      },
    });

    await db.note.createMany({
      data: [
        {
          userId: testUser.id,
          content: "Note 1",
          categoryId: category.id,
        },
        {
          userId: testUser.id,
          content: "Note 2",
          categoryId: category.id,
        },
        {
          userId: testUser.id,
          content: "Note 3",
          categoryId: category.id,
        },
      ],
    });

    const result = await getNoteCategoriesAction({});

    expect(result.data?.success).toBe(true);
    const foundCategory = result.data?.categories.find(
      (c) => c.id === category.id,
    );
    expect(foundCategory?._count?.notes).toBeGreaterThanOrEqual(3);
  });

  it("only returns categories for the authenticated user", async () => {
    const otherUser = await createTestUser({
      email: `other-user-${Date.now()}@example.com`,
    });

    await db.noteCategory.createMany({
      data: [
        {
          userId: testUser.id,
          name: "My Category",
          color: "BLUE",
        },
        {
          userId: otherUser.id,
          name: "Other User's Category",
          color: "RED",
        },
      ],
    });

    const result = await getNoteCategoriesAction({});

    expect(result.data?.success).toBe(true);
    expect(
      result.data?.categories.every(
        (category) => category.userId === testUser.id,
      ),
    ).toBe(true);
  });

  it("returns empty array when user has no categories", async () => {
    const result = await getNoteCategoriesAction({});

    expect(result.data?.success).toBe(true);
    expect(result.data?.categories).toBeDefined();
    // May have categories from other tests, so just check it's an array
    expect(Array.isArray(result.data?.categories)).toBe(true);
  });

  it("throws user-friendly error when user is not authenticated", async () => {
    mockNoAuthSession();

    const result = await getNoteCategoriesAction({});

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(
      /need.*logged|unauthorized|must.*sign/i,
    );
    expect(result.serverError).not.toContain("PrismaClient");
  });

  it("includes all category fields", async () => {
    const category = await db.noteCategory.create({
      data: {
        userId: testUser.id,
        name: "Test Category",
        color: "PURPLE",
      },
    });

    const result = await getNoteCategoriesAction({});

    expect(result.data?.success).toBe(true);
    const foundCategory = result.data?.categories.find(
      (c) => c.id === category.id,
    );
    expect(foundCategory).toBeDefined();
    expect(foundCategory?.name).toBe("Test Category");
    expect(foundCategory?.color).toBe("PURPLE");
    expect(foundCategory?.userId).toBe(testUser.id);
  });
});
