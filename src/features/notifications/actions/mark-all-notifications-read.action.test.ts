import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/features/shared/lib/db/client";
import {
  mockAuthSession,
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/features/shared/testing/helpers";
import { createNotificationAction } from "./create-notification.action";
import { markAllNotificationsReadAction } from "./mark-all-notifications-read.action";

describe("markAllNotificationsReadAction", () => {
  let testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    testUser = await setupTestUserWithSession();
  });

  it("marks all unread notifications as read", async () => {
    // Create multiple unread notifications
    const notification1 = await createNotificationAction({
      userId: testUser.id,
      title: "Notification 1",
    });

    const notification2 = await createNotificationAction({
      userId: testUser.id,
      title: "Notification 2",
    });

    const notification3 = await createNotificationAction({
      userId: testUser.id,
      title: "Notification 3",
    });

    // Verify they're all unread
    expect(notification1.data?.notification.read).toBe(false);
    expect(notification2.data?.notification.read).toBe(false);
    expect(notification3.data?.notification.read).toBe(false);

    const result = await markAllNotificationsReadAction({});

    expect(result.data?.success).toBe(true);
    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.message).toBe(
      "All notifications marked as read",
    );

    // Verify all are now read
    const updated1 = await db.notification.findUnique({
      where: { id: notification1.data?.notification.id },
    });

    const updated2 = await db.notification.findUnique({
      where: { id: notification2.data?.notification.id },
    });

    const updated3 = await db.notification.findUnique({
      where: { id: notification3.data?.notification.id },
    });

    expect(updated1?.read).toBe(true);
    expect(updated2?.read).toBe(true);
    expect(updated3?.read).toBe(true);
  });

  it("only marks notifications for the authenticated user", async () => {
    const uniqueEmail = `other-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@example.com`;
    const otherUser = await setupTestUserWithSession({
      email: uniqueEmail,
      name: "Other User",
    });

    // Switch back to testUser to create their notification
    mockAuthSession(testUser);

    const testUserNotification = await createNotificationAction({
      userId: testUser.id,
      title: "Test User Notification",
    });

    // Switch to otherUser to create their notification
    mockAuthSession(otherUser);

    const otherUserNotification = await createNotificationAction({
      userId: otherUser.id,
      title: "Other User Notification",
    });

    // Switch back to testUser session
    mockAuthSession(testUser);

    await markAllNotificationsReadAction({});

    // Verify only testUser's notification is marked as read
    expect(testUserNotification.data?.notification.id).toBeDefined();
    const updatedTestUser = await db.notification.findUnique({
      where: { id: testUserNotification.data!.notification.id },
    });

    expect(otherUserNotification.data?.notification.id).toBeDefined();
    const updatedOtherUser = await db.notification.findUnique({
      where: { id: otherUserNotification.data!.notification.id },
    });

    expect(updatedTestUser?.read).toBe(true);
    expect(updatedOtherUser?.read).toBe(false);
  });

  it("does not affect already read notifications", async () => {
    const notification1 = await createNotificationAction({
      userId: testUser.id,
      title: "Notification 1",
    });

    const notification2 = await createNotificationAction({
      userId: testUser.id,
      title: "Notification 2",
    });

    // Manually mark one as read
    await db.notification.update({
      where: { id: notification1.data?.notification.id },
      data: { read: true },
    });

    // Mark all as read
    await markAllNotificationsReadAction({});

    // Both should be read
    const updated1 = await db.notification.findUnique({
      where: { id: notification1.data?.notification.id },
    });

    const updated2 = await db.notification.findUnique({
      where: { id: notification2.data?.notification.id },
    });

    expect(updated1?.read).toBe(true);
    expect(updated2?.read).toBe(true);
  });

  it("handles case when user has no unread notifications", async () => {
    const result = await markAllNotificationsReadAction({});

    expect(result.data?.success).toBe(true);
    expect(result.data?.toast).toBeDefined();
  });

  it("throws error when user is not authenticated", async () => {
    mockNoAuthSession();

    const result = await markAllNotificationsReadAction({});

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("Unauthorized");
  });

  it("returns success toast with correct message", async () => {
    await createNotificationAction({
      userId: testUser.id,
      title: "Test Notification",
    });

    const result = await markAllNotificationsReadAction({});

    expect(result.data?.toast?.message).toBe(
      "All notifications marked as read",
    );
    expect(result.data?.toast?.type).toBe("success");
    expect(result.data?.toast?.description).toBe(
      "All notifications have been marked as read.",
    );
  });

  it("marks many notifications as read efficiently", async () => {
    // Create many notifications
    for (let i = 0; i < 10; i++) {
      await createNotificationAction({
        userId: testUser.id,
        title: `Notification ${i}`,
      });
    }

    const result = await markAllNotificationsReadAction({});

    expect(result.data?.success).toBe(true);

    // Verify all are read
    const notifications = await db.notification.findMany({
      where: { userId: testUser.id },
    });

    expect(notifications.length).toBe(10);
    notifications.forEach((notification) => {
      expect(notification.read).toBe(true);
    });
  });
});
