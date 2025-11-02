import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/features/shared/lib/db/client";
import {
  mockAuthSession,
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/shared/testing/helpers";
import { markNotificationReadAction } from "./mark-notification-read.action";
import { createNotificationAction } from "./create-notification.action";

describe("markNotificationReadAction", () => {
  let testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    testUser = await setupTestUserWithSession();
  });

  it("marks a notification as read successfully", async () => {
    const notification = await createNotificationAction({
      userId: testUser.id,
      title: "Test Notification",
    });

    expect(notification.data?.notification.read).toBe(false);

    const result = await markNotificationReadAction({
      notificationId: notification.data?.notification.id ?? "",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.notification).toBeDefined();
    expect(result.data?.notification.read).toBe(true);

    const updatedNotification = await db.notification.findUnique({
      where: { id: notification.data?.notification.id },
    });

    expect(updatedNotification?.read).toBe(true);
  });

  it("validates notificationId is required", async () => {
    const result = await markNotificationReadAction({
      notificationId: "",
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("notificationId");
    expect(result.validationErrors?.notificationId).toHaveProperty("_errors");
    expect(Array.isArray(result.validationErrors?.notificationId?._errors)).toBe(
      true,
    );
    expect(result.validationErrors?.notificationId?._errors?.[0]).toBe(
      "Notification ID is required",
    );
  });

  it("throws error when notification does not exist", async () => {
    const result = await markNotificationReadAction({
      notificationId: "non-existent-id",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("Notification not found");
  });

  it("throws error when user is not authenticated", async () => {
    const notification = await createNotificationAction({
      userId: testUser.id,
      title: "Test Notification",
    });

    mockNoAuthSession();

    const result = await markNotificationReadAction({
      notificationId: notification.data?.notification.id ?? "",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("Unauthorized");
  });

  it("throws error when user tries to mark another user's notification as read", async () => {
    const uniqueEmail = `other-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@example.com`;
    const otherUser = await setupTestUserWithSession({
      email: uniqueEmail,
      name: "Other User",
    });

    const notification = await createNotificationAction({
      userId: otherUser.id,
      title: "Other User's Notification",
    });

    // Switch back to testUser session
    mockAuthSession(testUser);

    const result = await markNotificationReadAction({
      notificationId: notification.data?.notification.id ?? "",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("Unauthorized");
  });

  it("does not error when marking already read notification as read", async () => {
    const notification = await createNotificationAction({
      userId: testUser.id,
      title: "Test Notification",
    });

    // Mark as read first time
    const firstResult = await markNotificationReadAction({
      notificationId: notification.data?.notification.id ?? "",
    });

    expect(firstResult.data?.success).toBe(true);
    expect(firstResult.data?.notification.read).toBe(true);

    // Mark as read second time - should still succeed
    const secondResult = await markNotificationReadAction({
      notificationId: notification.data?.notification.id ?? "",
    });

    expect(secondResult.data?.success).toBe(true);
    expect(secondResult.data?.notification.read).toBe(true);

    const updatedNotification = await db.notification.findUnique({
      where: { id: notification.data?.notification.id },
    });

    expect(updatedNotification?.read).toBe(true);
  });

  it("marks multiple notifications as read independently", async () => {
    const notification1 = await createNotificationAction({
      userId: testUser.id,
      title: "Notification 1",
    });

    const notification2 = await createNotificationAction({
      userId: testUser.id,
      title: "Notification 2",
    });

    // Mark first as read
    await markNotificationReadAction({
      notificationId: notification1.data?.notification.id ?? "",
    });

    // Verify second is still unread
    const unreadCheck = await db.notification.findUnique({
      where: { id: notification2.data?.notification.id },
    });

    expect(unreadCheck?.read).toBe(false);

    // Mark second as read
    await markNotificationReadAction({
      notificationId: notification2.data?.notification.id ?? "",
    });

    // Verify both are now read
    const finalCheck1 = await db.notification.findUnique({
      where: { id: notification1.data?.notification.id },
    });

    const finalCheck2 = await db.notification.findUnique({
      where: { id: notification2.data?.notification.id },
    });

    expect(finalCheck1?.read).toBe(true);
    expect(finalCheck2?.read).toBe(true);
  });
});

