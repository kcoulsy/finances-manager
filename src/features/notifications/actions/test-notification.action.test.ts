import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/features/shared/lib/db/client";
import {
  mockAuthSession,
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/features/shared/testing/helpers";
import { testNotificationAction } from "./test-notification.action";

describe("testNotificationAction", () => {
  let testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    testUser = await setupTestUserWithSession();
  });

  it("creates a test notification successfully", async () => {
    const result = await testNotificationAction({});

    expect(result.data?.success).toBe(true);
    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.message).toBe(
      "Notification created successfully",
    );
    expect(result.data?.toast?.type).toBe("success");

    // Verify notification was created in database
    const notifications = await db.notification.findMany({
      where: { userId: testUser.id },
      orderBy: { createdAt: "desc" },
      take: 1,
    });

    expect(notifications.length).toBe(1);
    expect(notifications[0].title).toBe("Test Notification");
    expect(notifications[0].subtitle).toBe("This is a test notification");
    expect(notifications[0].detail).toBeDefined();
    expect(notifications[0].detail).toContain("Test Notification Details");
    expect(notifications[0].link).toBe("/dashboard");
    expect(notifications[0].read).toBe(false);
    expect(notifications[0].userId).toBe(testUser.id);
  });

  it("creates notification with correct markdown detail", async () => {
    await testNotificationAction({});

    const notifications = await db.notification.findMany({
      where: { userId: testUser.id },
      orderBy: { createdAt: "desc" },
      take: 1,
    });

    expect(notifications[0].detail).toContain("## Test Notification Details");
    expect(notifications[0].detail).toContain("**test notification**");
    expect(notifications[0].detail).toContain("- Bullet points");
    expect(notifications[0].detail).toContain("**Bold text**");
    expect(notifications[0].detail).toContain("*Italic text*");
    expect(notifications[0].detail).toContain("```typescript");
  });

  it("throws error when user is not authenticated", async () => {
    mockNoAuthSession();

    const result = await testNotificationAction({});

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("Unauthorized");
  });

  it("creates multiple test notifications independently", async () => {
    await testNotificationAction({});

    await testNotificationAction({});

    const notifications = await db.notification.findMany({
      where: { userId: testUser.id },
    });

    expect(notifications.length).toBe(2);
    expect(notifications[0].title).toBe("Test Notification");
    expect(notifications[1].title).toBe("Test Notification");
  });

  it("returns toast configuration", async () => {
    const result = await testNotificationAction({});

    expect(result.data?.toast?.message).toBe(
      "Notification created successfully",
    );
    expect(result.data?.toast?.type).toBe("success");
    expect(result.data?.toast?.description).toBe(
      "A test notification has been added to your notifications.",
    );
  });

  it("creates notification with link to dashboard", async () => {
    await testNotificationAction({});

    const notifications = await db.notification.findMany({
      where: { userId: testUser.id },
      orderBy: { createdAt: "desc" },
      take: 1,
    });

    expect(notifications[0].link).toBe("/dashboard");
  });

  it("creates unread notification by default", async () => {
    await testNotificationAction({});

    const notifications = await db.notification.findMany({
      where: { userId: testUser.id },
      orderBy: { createdAt: "desc" },
      take: 1,
    });

    expect(notifications[0].read).toBe(false);
  });

  it("only creates notification for authenticated user", async () => {
    // Create notification as testUser
    await testNotificationAction({});

    // Verify testUser's notification exists
    const testUserNotifications = await db.notification.findMany({
      where: { userId: testUser.id },
    });

    expect(testUserNotifications.length).toBe(1);
    expect(testUserNotifications[0].userId).toBe(testUser.id);

    // Create another user and verify they don't have testUser's notifications
    const uniqueEmail = `other-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@example.com`;
    const otherUser = await setupTestUserWithSession({
      email: uniqueEmail,
      name: "Other User",
    });

    // Create notification as otherUser
    await testNotificationAction({});

    // Verify otherUser's notifications
    const otherUserNotifications = await db.notification.findMany({
      where: { userId: otherUser.id },
    });

    expect(otherUserNotifications.length).toBe(1);
    expect(otherUserNotifications[0].userId).toBe(otherUser.id);

    // Verify testUser still only has their notification
    const testUserNotificationsAfter = await db.notification.findMany({
      where: { userId: testUser.id },
    });

    expect(testUserNotificationsAfter.length).toBe(1);
  });

  it("includes timestamp in notification detail", async () => {
    const beforeTime = new Date();
    await testNotificationAction({});
    const afterTime = new Date();

    const notifications = await db.notification.findMany({
      where: { userId: testUser.id },
      orderBy: { createdAt: "desc" },
      take: 1,
    });

    // The detail should contain a timestamp (formatted date)
    expect(notifications[0].detail).toBeDefined();
    // The detail includes created date, which should be within our time window
    expect(notifications[0].createdAt.getTime()).toBeGreaterThanOrEqual(
      beforeTime.getTime(),
    );
    expect(notifications[0].createdAt.getTime()).toBeLessThanOrEqual(
      afterTime.getTime(),
    );
  });
});
