import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/features/shared/lib/db/client";
import {
  mockAuthSession,
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/shared/testing/helpers";
import { createNotificationAction } from "./create-notification.action";

describe("createNotificationAction", () => {
  let testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    testUser = await setupTestUserWithSession();
  });

  it("creates a notification successfully with all fields", async () => {
    const result = await createNotificationAction({
      userId: testUser.id,
      title: "Test Notification",
      subtitle: "This is a test subtitle",
      detail: "This is a test detail with **markdown**",
      link: "/dashboard",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.notification).toBeDefined();
    expect(result.data?.notification.title).toBe("Test Notification");
    expect(result.data?.notification.subtitle).toBe("This is a test subtitle");
    expect(result.data?.notification.detail).toBe(
      "This is a test detail with **markdown**",
    );
    expect(result.data?.notification.link).toBe("/dashboard");
    expect(result.data?.notification.read).toBe(false);
    expect(result.data?.notification.userId).toBe(testUser.id);

    const notification = await db.notification.findUnique({
      where: { id: result.data?.notification.id },
    });

    expect(notification).toBeDefined();
    expect(notification?.title).toBe("Test Notification");
    expect(notification?.subtitle).toBe("This is a test subtitle");
    expect(notification?.detail).toBe("This is a test detail with **markdown**");
    expect(notification?.link).toBe("/dashboard");
    expect(notification?.read).toBe(false);
    expect(notification?.userId).toBe(testUser.id);
  });

  it("creates a notification with only required fields", async () => {
    const result = await createNotificationAction({
      userId: testUser.id,
      title: "Minimal Notification",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.notification).toBeDefined();
    expect(result.data?.notification.title).toBe("Minimal Notification");
    expect(result.data?.notification.subtitle).toBeNull();
    expect(result.data?.notification.detail).toBeNull();
    expect(result.data?.notification.link).toBeNull();
    expect(result.data?.notification.read).toBe(false);

    const notification = await db.notification.findUnique({
      where: { id: result.data?.notification.id },
    });

    expect(notification?.subtitle).toBeNull();
    expect(notification?.detail).toBeNull();
    expect(notification?.link).toBeNull();
  });

  it("validates required userId field", async () => {
    const result = await createNotificationAction({
      userId: "",
      title: "Test Notification",
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("userId");
    expect(result.validationErrors?.userId).toHaveProperty("_errors");
    expect(Array.isArray(result.validationErrors?.userId?._errors)).toBe(true);
    expect(result.validationErrors?.userId?._errors?.[0]).toBe(
      "User ID is required",
    );
  });

  it("validates required title field", async () => {
    const result = await createNotificationAction({
      userId: testUser.id,
      title: "",
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("title");
    expect(result.validationErrors?.title).toHaveProperty("_errors");
    expect(Array.isArray(result.validationErrors?.title?._errors)).toBe(true);
    expect(result.validationErrors?.title?._errors?.[0]).toBe(
      "Title is required",
    );
  });

  it("validates title max length", async () => {
    const longTitle = "a".repeat(201); // 201 characters, max is 200

    const result = await createNotificationAction({
      userId: testUser.id,
      title: longTitle,
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("title");
    expect(result.validationErrors?.title).toHaveProperty("_errors");
    expect(Array.isArray(result.validationErrors?.title?._errors)).toBe(true);
    expect(result.validationErrors?.title?._errors?.[0]).toBe(
      "Title must be less than 200 characters",
    );
  });

  it("validates subtitle max length", async () => {
    const longSubtitle = "a".repeat(301); // 301 characters, max is 300

    const result = await createNotificationAction({
      userId: testUser.id,
      title: "Valid Title",
      subtitle: longSubtitle,
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("subtitle");
    expect(result.validationErrors?.subtitle).toHaveProperty("_errors");
    expect(Array.isArray(result.validationErrors?.subtitle?._errors)).toBe(
      true,
    );
    expect(result.validationErrors?.subtitle?._errors?.[0]).toBe(
      "Subtitle must be less than 300 characters",
    );
  });

  // Note: The schema allows empty string for link (via .or(z.literal(""))), so we test that behavior
  it("allows empty string for link (converts to null)", async () => {
    const result = await createNotificationAction({
      userId: testUser.id,
      title: "Test Notification",
      link: "", // Empty string is allowed by schema
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.notification.link).toBeNull();
  });

  it("allows link to be undefined", async () => {
    const result = await createNotificationAction({
      userId: testUser.id,
      title: "Test Notification",
      // link is undefined, which should be allowed
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.notification.link).toBeNull();
  });

  it("throws error when user is not authenticated", async () => {
    mockNoAuthSession();

    const result = await createNotificationAction({
      userId: testUser.id,
      title: "Test Notification",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("Unauthorized");
  });

  it("throws error when user tries to create notification for another user", async () => {
    const uniqueEmail = `other-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@example.com`;
    const otherUser = await setupTestUserWithSession({
      email: uniqueEmail,
      name: "Other User",
    });

    // Switch back to testUser session
    mockAuthSession(testUser);

    const result = await createNotificationAction({
      userId: otherUser.id, // Trying to create notification for other user
      title: "Test Notification",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain(
      "You can only create notifications for yourself",
    );
  });

  it("creates multiple notifications for the same user", async () => {
    const notification1 = await createNotificationAction({
      userId: testUser.id,
      title: "First Notification",
    });

    const notification2 = await createNotificationAction({
      userId: testUser.id,
      title: "Second Notification",
    });

    expect(notification1.data?.success).toBe(true);
    expect(notification2.data?.success).toBe(true);

    const notifications = await db.notification.findMany({
      where: { userId: testUser.id },
    });

    expect(notifications.length).toBeGreaterThanOrEqual(2);
    expect(notifications.map((n) => n.title)).toContain("First Notification");
    expect(notifications.map((n) => n.title)).toContain("Second Notification");
  });

  it("creates notifications with read set to false by default", async () => {
    const result = await createNotificationAction({
      userId: testUser.id,
      title: "Unread Notification",
    });

    expect(result.data?.notification.read).toBe(false);

    const notification = await db.notification.findUnique({
      where: { id: result.data?.notification.id },
    });

    expect(notification?.read).toBe(false);
  });

  it("handles database errors gracefully", async () => {
    // Create a fresh user for this test to avoid interfering with other tests
    const errorTestUser = await setupTestUserWithSession();

    // Delete the user to cause a foreign key constraint error
    await db.user.delete({
      where: { id: errorTestUser.id },
    });

    // Update the session mock to use the deleted user ID
    mockAuthSession(errorTestUser);

    const result = await createNotificationAction({
      userId: errorTestUser.id,
      title: "Test Notification",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.length).toBeGreaterThan(0);
  });
});

