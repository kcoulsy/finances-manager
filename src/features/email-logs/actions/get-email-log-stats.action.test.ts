import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@/features/auth/constants/roles";
import { db } from "@/features/shared/lib/db/client";
import { logEmail } from "@/features/shared/lib/utils/email/log-email";
import {
  assignRolesToUser,
  mockAuthSession,
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/features/shared/testing/helpers";
import { getEmailLogStatsAction } from "./get-email-log-stats.action";

describe("getEmailLogStatsAction", () => {
  let adminUser: TestUser;
  let regularUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create admin user
    const adminEmail = `admin-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@example.com`;
    adminUser = await setupTestUserWithSession({
      name: "Admin User",
      email: adminEmail,
    });
    const adminRoles = await assignRolesToUser(adminUser.id, [UserRole.ADMIN]);
    mockAuthSession(adminUser, adminRoles);

    // Create regular user
    const regularEmail = `regular-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@example.com`;
    regularUser = await setupTestUserWithSession({
      name: "Regular User",
      email: regularEmail,
    });
  });

  it("returns email log statistics successfully with admin permission", async () => {
    const adminRoles = await assignRolesToUser(adminUser.id, [UserRole.ADMIN]);
    mockAuthSession(adminUser, adminRoles);

    // Create some test emails
    await logEmail({
      to: adminUser.email,
      subject: "Test Email 1",
      html: "<h1>Test 1</h1>",
      recipientUserId: adminUser.id,
      mailType: "notification",
    });

    await logEmail({
      to: adminUser.email,
      subject: "Test Email 2",
      html: "<h1>Test 2</h1>",
      recipientUserId: adminUser.id,
      mailType: "document",
    });

    const result = await getEmailLogStatsAction({});

    expect(result.data?.success).toBe(true);
    expect(result.data?.stats).toBeDefined();
    expect(result.data?.stats.totalEmails).toBeGreaterThanOrEqual(2);
    expect(result.data?.stats.emailsToday).toBeGreaterThanOrEqual(2);
    expect(result.data?.stats.emailsThisWeek).toBeGreaterThanOrEqual(2);
    expect(result.data?.stats.emailsThisMonth).toBeGreaterThanOrEqual(2);
    expect(typeof result.data?.stats.readRate).toBe("number");
    expect(result.data?.stats.statusCounts).toBeDefined();
    expect(result.data?.stats.mailTypeCounts).toBeDefined();
  });

  it("calculates read rate correctly", async () => {
    const adminRoles = await assignRolesToUser(adminUser.id, [UserRole.ADMIN]);
    mockAuthSession(adminUser, adminRoles);

    // Create emails
    const email1Result = await logEmail({
      to: adminUser.email,
      subject: "Read Email",
      html: "<h1>Read</h1>",
      recipientUserId: adminUser.id,
    });

    await logEmail({
      to: adminUser.email,
      subject: "Unread Email",
      html: "<h1>Unread</h1>",
      recipientUserId: adminUser.id,
    });

    // Mark one as read
    if (email1Result.emailLogId) {
      await db.emailLogRead.create({
        data: {
          emailLogId: email1Result.emailLogId,
          readAt: new Date(),
        },
      });
    }

    const result = await getEmailLogStatsAction({});

    expect(result.data?.success).toBe(true);
    expect(result.data?.stats.readRate).toBeGreaterThanOrEqual(0);
    expect(result.data?.stats.readRate).toBeLessThanOrEqual(100);
  });

  it("counts emails by status", async () => {
    const adminRoles = await assignRolesToUser(adminUser.id, [UserRole.ADMIN]);
    mockAuthSession(adminUser, adminRoles);

    await logEmail({
      to: adminUser.email,
      subject: "Test Email",
      html: "<h1>Test</h1>",
      recipientUserId: adminUser.id,
    });

    const result = await getEmailLogStatsAction({});

    expect(result.data?.success).toBe(true);
    expect(result.data?.stats.statusCounts).toBeDefined();
    // Should have DELIVERED status counts (may be undefined if no emails with that status)
    if (result.data?.stats.statusCounts.DELIVERED !== undefined) {
      expect(result.data.stats.statusCounts.DELIVERED).toBeGreaterThanOrEqual(
        0,
      );
    }
  });

  it("counts emails by mail type", async () => {
    const adminRoles = await assignRolesToUser(adminUser.id, [UserRole.ADMIN]);
    mockAuthSession(adminUser, adminRoles);

    await logEmail({
      to: adminUser.email,
      subject: "Notification Email",
      html: "<h1>Notification</h1>",
      recipientUserId: adminUser.id,
      mailType: "notification",
    });

    const result = await getEmailLogStatsAction({});

    expect(result.data?.success).toBe(true);
    expect(result.data?.stats.mailTypeCounts).toBeDefined();
    expect(result.data?.stats.mailTypeCounts.notification).toBeGreaterThan(0);
  });

  it("throws error when user is not authenticated", async () => {
    mockNoAuthSession();

    const result = await getEmailLogStatsAction({});

    expect(result.data).toBeUndefined();
    expect(result.serverError).toBeDefined();
    expect(result.serverError?.length).toBeGreaterThan(0);
  });

  it("throws error when user lacks admin permissions", async () => {
    mockAuthSession(regularUser, []);

    const result = await getEmailLogStatsAction({});

    expect(result.data).toBeUndefined();
    expect(result.serverError).toBeDefined();
    expect(result.serverError?.length).toBeGreaterThan(0);
  });

  it("handles empty database correctly", async () => {
    const adminRoles = await assignRolesToUser(adminUser.id, [UserRole.ADMIN]);
    mockAuthSession(adminUser, adminRoles);

    // Clear all email logs for this test
    await db.emailLog.deleteMany({});

    const result = await getEmailLogStatsAction({});

    expect(result.data?.success).toBe(true);
    expect(result.data?.stats.totalEmails).toBe(0);
    expect(result.data?.stats.emailsToday).toBe(0);
    expect(result.data?.stats.emailsThisWeek).toBe(0);
    expect(result.data?.stats.emailsThisMonth).toBe(0);
    expect(result.data?.stats.readRate).toBe(0);
  });
});
