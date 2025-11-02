import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/features/shared/lib/db/client";
import {
  mockAuthSession,
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/shared/testing/helpers";
import { getNotificationsAction } from "./get-notifications.action";
import { createNotificationAction } from "./create-notification.action";

describe("getNotificationsAction", () => {
  let testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    testUser = await setupTestUserWithSession();
  });

  it("returns empty array when user has no notifications", async () => {
    const result = await getNotificationsAction({
      limit: 10,
      offset: 0,
      unreadOnly: false,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.notifications).toEqual([]);
    expect(result.data?.unreadCount).toBe(0);
  });

  it("returns notifications for the authenticated user", async () => {
    // Create some notifications
    await createNotificationAction({
      userId: testUser.id,
      title: "First Notification",
    });

    await createNotificationAction({
      userId: testUser.id,
      title: "Second Notification",
    });

    const result = await getNotificationsAction({
      limit: 10,
      offset: 0,
      unreadOnly: false,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.notifications).toBeDefined();
    expect(result.data?.notifications.length).toBe(2);
    expect(result.data?.notifications[0].title).toBe("Second Notification"); // Most recent first
    expect(result.data?.notifications[1].title).toBe("First Notification");
    expect(result.data?.unreadCount).toBe(2);
  });

  it("returns notifications ordered by createdAt desc", async () => {
    const first = await createNotificationAction({
      userId: testUser.id,
      title: "First Notification",
    });

    // Wait a bit to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));

    const second = await createNotificationAction({
      userId: testUser.id,
      title: "Second Notification",
    });

    const result = await getNotificationsAction({
      limit: 10,
      offset: 0,
      unreadOnly: false,
    });

    expect(result.data?.notifications.length).toBe(2);
    // Most recent first
    expect(result.data?.notifications[0].id).toBe(second.data?.notification.id);
    expect(result.data?.notifications[1].id).toBe(first.data?.notification.id);
  });

  it("respects limit parameter", async () => {
    // Create 5 notifications
    for (let i = 0; i < 5; i++) {
      await createNotificationAction({
        userId: testUser.id,
        title: `Notification ${i}`,
      });
    }

    const result = await getNotificationsAction({
      limit: 3,
      offset: 0,
      unreadOnly: false,
    });

    expect(result.data?.notifications.length).toBe(3);
    expect(result.data?.unreadCount).toBe(5); // unreadCount should still be total
  });

  it("respects offset parameter", async () => {
    // Create 5 notifications
    for (let i = 0; i < 5; i++) {
      await createNotificationAction({
        userId: testUser.id,
        title: `Notification ${i}`,
      });
    }

    const firstPage = await getNotificationsAction({
      limit: 2,
      offset: 0,
      unreadOnly: false,
    });

    const secondPage = await getNotificationsAction({
      limit: 2,
      offset: 2,
      unreadOnly: false,
    });

    expect(firstPage.data?.notifications.length).toBe(2);
    expect(secondPage.data?.notifications.length).toBe(2);
    // They should have different notifications
    expect(firstPage.data?.notifications[0].id).not.toBe(
      secondPage.data?.notifications[0].id,
    );
  });

  it("filters to unread only when unreadOnly is true", async () => {
    // Create read and unread notifications
    const unread1 = await createNotificationAction({
      userId: testUser.id,
      title: "Unread Notification 1",
    });

    const unread2 = await createNotificationAction({
      userId: testUser.id,
      title: "Unread Notification 2",
    });

    // Mark one as read
    await db.notification.update({
      where: { id: unread1.data?.notification.id },
      data: { read: true },
    });

    const result = await getNotificationsAction({
      limit: 10,
      offset: 0,
      unreadOnly: true,
    });

    expect(result.data?.notifications.length).toBe(1);
    expect(result.data?.notifications[0].id).toBe(unread2.data?.notification.id);
    expect(result.data?.notifications[0].read).toBe(false);
    expect(result.data?.unreadCount).toBe(1);
  });

  it("returns correct unread count", async () => {
    // Create 3 unread notifications
    await createNotificationAction({
      userId: testUser.id,
      title: "Unread 1",
    });

    await createNotificationAction({
      userId: testUser.id,
      title: "Unread 2",
    });

    const unread3 = await createNotificationAction({
      userId: testUser.id,
      title: "Unread 3",
    });

    // Mark one as read
    await db.notification.update({
      where: { id: unread3.data?.notification.id },
      data: { read: true },
    });

    const result = await getNotificationsAction({
      limit: 10,
      offset: 0,
      unreadOnly: false,
    });

    expect(result.data?.unreadCount).toBe(2);
  });

  it("does not return notifications from other users", async () => {
    const uniqueEmail = `other-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@example.com`;
    const otherUser = await setupTestUserWithSession({
      email: uniqueEmail,
      name: "Other User",
    });

    // Create notification for other user
    await createNotificationAction({
      userId: otherUser.id,
      title: "Other User's Notification",
    });

    // Switch back to testUser session
    mockAuthSession(testUser);

    // Create notification for test user
    await createNotificationAction({
      userId: testUser.id,
      title: "My Notification",
    });

    const result = await getNotificationsAction({
      limit: 10,
      offset: 0,
      unreadOnly: false,
    });

    expect(result.data?.notifications.length).toBe(1);
    expect(result.data?.notifications[0].title).toBe("My Notification");
    expect(result.data?.unreadCount).toBe(1);
  });

  it("throws error when user is not authenticated", async () => {
    mockNoAuthSession();

    const result = await getNotificationsAction({
      limit: 10,
      offset: 0,
      unreadOnly: false,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("Unauthorized");
  });

  it("uses default values when optional parameters are not provided", async () => {
    await createNotificationAction({
      userId: testUser.id,
      title: "Test Notification",
    });

    const result = await getNotificationsAction({});

    expect(result.data?.success).toBe(true);
    expect(result.data?.notifications.length).toBe(1);
    expect(result.data?.unreadCount).toBe(1);
  });

  it("handles limit edge cases", async () => {
    // Create many notifications
    for (let i = 0; i < 15; i++) {
      await createNotificationAction({
        userId: testUser.id,
        title: `Notification ${i}`,
      });
    }

    const result = await getNotificationsAction({
      limit: 100, // Max allowed is 100
      offset: 0,
      unreadOnly: false,
    });

    expect(result.data?.notifications.length).toBe(15);
    expect(result.data?.unreadCount).toBe(15);
  });
});

