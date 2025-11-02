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
import { deleteAllNotificationsAction } from "./delete-all-notifications.action";

describe("deleteAllNotificationsAction", () => {
  let testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    testUser = await setupTestUserWithSession();
  });

  it("deletes all notifications for the authenticated user", async () => {
    // Create multiple notifications
    await createNotificationAction({
      userId: testUser.id,
      title: "Notification 1",
    });

    await createNotificationAction({
      userId: testUser.id,
      title: "Notification 2",
    });

    await createNotificationAction({
      userId: testUser.id,
      title: "Notification 3",
    });

    // Verify they exist
    const beforeDelete = await db.notification.findMany({
      where: { userId: testUser.id },
    });

    expect(beforeDelete.length).toBe(3);

    const result = await deleteAllNotificationsAction({});

    expect(result.data?.success).toBe(true);
    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.message).toBe("All notifications deleted");

    // Verify all are deleted
    const afterDelete = await db.notification.findMany({
      where: { userId: testUser.id },
    });

    expect(afterDelete.length).toBe(0);
  });

  it("only deletes notifications for the authenticated user", async () => {
    const uniqueEmail = `other-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@example.com`;
    const otherUser = await setupTestUserWithSession({
      email: uniqueEmail,
      name: "Other User",
    });

    // Create notification for testUser
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

    // Switch back to testUser session before deleting
    mockAuthSession(testUser);

    // Delete all for testUser
    await deleteAllNotificationsAction({});

    // Verify only testUser's notification is deleted
    const testUserNotifications = await db.notification.findMany({
      where: { userId: testUser.id },
    });

    const otherUserNotifications = await db.notification.findMany({
      where: { userId: otherUser.id },
    });

    expect(testUserNotifications.length).toBe(0);
    expect(otherUserNotifications.length).toBe(1);
    expect(otherUserNotifications[0].id).toBe(
      otherUserNotification.data?.notification.id,
    );
  });

  it("handles case when user has no notifications", async () => {
    const result = await deleteAllNotificationsAction({});

    expect(result.data?.success).toBe(true);
    expect(result.data?.toast).toBeDefined();

    // Verify still no notifications
    const notifications = await db.notification.findMany({
      where: { userId: testUser.id },
    });

    expect(notifications.length).toBe(0);
  });

  it("deletes both read and unread notifications", async () => {
    const notification1 = await createNotificationAction({
      userId: testUser.id,
      title: "Unread Notification",
    });

    const notification2 = await createNotificationAction({
      userId: testUser.id,
      title: "Read Notification",
    });

    // Mark one as read
    await db.notification.update({
      where: { id: notification2.data?.notification.id },
      data: { read: true },
    });

    await deleteAllNotificationsAction({});

    // Verify both are deleted
    const notifications = await db.notification.findMany({
      where: { userId: testUser.id },
    });

    expect(notifications.length).toBe(0);
  });

  it("throws error when user is not authenticated", async () => {
    mockNoAuthSession();

    const result = await deleteAllNotificationsAction({});

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("Unauthorized");
  });

  it("returns success toast with correct message", async () => {
    await createNotificationAction({
      userId: testUser.id,
      title: "Test Notification",
    });

    const result = await deleteAllNotificationsAction({});

    expect(result.data?.toast?.message).toBe("All notifications deleted");
    expect(result.data?.toast?.type).toBe("success");
    expect(result.data?.toast?.description).toBe(
      "All notifications have been permanently deleted.",
    );
  });

  it("deletes many notifications efficiently", async () => {
    // Create many notifications
    for (let i = 0; i < 20; i++) {
      await createNotificationAction({
        userId: testUser.id,
        title: `Notification ${i}`,
      });
    }

    const beforeDelete = await db.notification.findMany({
      where: { userId: testUser.id },
    });

    expect(beforeDelete.length).toBe(20);

    const result = await deleteAllNotificationsAction({});

    expect(result.data?.success).toBe(true);

    const afterDelete = await db.notification.findMany({
      where: { userId: testUser.id },
    });

    expect(afterDelete.length).toBe(0);
  });

  it("can delete notifications and create new ones afterwards", async () => {
    // Create and delete
    await createNotificationAction({
      userId: testUser.id,
      title: "Old Notification",
    });

    await deleteAllNotificationsAction({});

    // Create new notification
    const newNotification = await createNotificationAction({
      userId: testUser.id,
      title: "New Notification",
    });

    expect(newNotification.data?.success).toBe(true);

    const notifications = await db.notification.findMany({
      where: { userId: testUser.id },
    });

    expect(notifications.length).toBe(1);
    expect(notifications[0].title).toBe("New Notification");
  });
});
