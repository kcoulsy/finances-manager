import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/features/shared/lib/db/client";
import {
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/features/shared/testing/helpers";
import { createNoteCategoryAction } from "./create-note-category.action";

describe("createNoteCategoryAction", () => {
  let testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    testUser = await setupTestUserWithSession();
  });

  it("creates a category successfully with minimal data", async () => {
    const result = await createNoteCategoryAction({
      name: "Test Category",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.category).toBeDefined();
    expect(result.data?.category.name).toBe("Test Category");
    expect(result.data?.category.userId).toBe(testUser.id);
    expect(result.data?.category.color).toBe("GRAY");
    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.message).toBe("Category created successfully");
    expect(result.data?.toast?.type).toBe("success");
    expect(result.data?.toast?.description).toContain("Test Category");

    const category = await db.noteCategory.findUnique({
      where: { id: result.data?.category.id },
    });

    expect(category).toBeDefined();
    expect(category?.name).toBe("Test Category");
    expect(category?.userId).toBe(testUser.id);
  });

  it("creates a category with all fields", async () => {
    const result = await createNoteCategoryAction({
      name: "Test Category",
      color: "BLUE",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.category.name).toBe("Test Category");
    expect(result.data?.category.color).toBe("BLUE");

    const category = await db.noteCategory.findUnique({
      where: { id: result.data?.category.id },
    });

    expect(category?.color).toBe("BLUE");
  });

  it("creates multiple categories for the same user", async () => {
    const category1 = await createNoteCategoryAction({
      name: "Category 1",
      color: "BLUE",
    });

    const category2 = await createNoteCategoryAction({
      name: "Category 2",
      color: "RED",
    });

    expect(category1.data?.success).toBe(true);
    expect(category2.data?.success).toBe(true);

    const categories = await db.noteCategory.findMany({
      where: { userId: testUser.id },
    });

    expect(categories.length).toBeGreaterThanOrEqual(2);
    expect(categories.map((c) => c.name)).toContain("Category 1");
    expect(categories.map((c) => c.name)).toContain("Category 2");
  });

  it("validates required fields", async () => {
    const result = await createNoteCategoryAction({
      name: "",
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("name");
  });

  it("validates name length", async () => {
    const longName = "a".repeat(101);
    const result = await createNoteCategoryAction({
      name: longName,
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("name");
  });

  it("throws user-friendly error when user is not authenticated", async () => {
    mockNoAuthSession();

    const result = await createNoteCategoryAction({
      name: "Test Category",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(
      /need.*logged|unauthorized|must.*sign/i,
    );
    expect(result.serverError).not.toContain("PrismaClient");
  });

  it("returns success toast with proper configuration", async () => {
    const result = await createNoteCategoryAction({
      name: "Test Category",
      color: "BLUE",
    });

    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.message).toBe("Category created successfully");
    expect(result.data?.toast?.type).toBe("success");
    expect(result.data?.toast?.description).toContain("Test Category");
  });

  it("creates categories with different colors", async () => {
    const colors = ["BLUE", "RED", "GREEN", "PURPLE"] as const;

    for (const color of colors) {
      const result = await createNoteCategoryAction({
        name: `Category ${color}`,
        color,
      });

      expect(result.data?.success).toBe(true);
      expect(result.data?.category.color).toBe(color);
    }
  });
});
