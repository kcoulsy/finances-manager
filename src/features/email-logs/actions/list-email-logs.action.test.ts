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
import { listEmailLogsAction } from "./list-email-logs.action";

describe("listEmailLogsAction", () => {
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

  it("returns email logs successfully with admin permission", async () => {
    // Ensure admin session is set up
    const adminRoles = await assignRolesToUser(adminUser.id, [UserRole.ADMIN]);
    mockAuthSession(adminUser, adminRoles);

    // Create test email logs
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
      mailType: "notification",
    });

    const result = await listEmailLogsAction({
      limit: 20,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.emailLogs).toBeDefined();
    expect(Array.isArray(result.data?.emailLogs)).toBe(true);
    expect(result.data?.emailLogs.length).toBeGreaterThanOrEqual(2);
    expect(result.data?.pagination).toBeDefined();
    expect(result.data?.pagination?.totalCount).toBeGreaterThanOrEqual(2);
  });

  it("filters email logs by status", async () => {
    const adminRoles = await assignRolesToUser(adminUser.id, [UserRole.ADMIN]);
    mockAuthSession(adminUser, adminRoles);

    // Create emails with different statuses
    await logEmail({
      to: adminUser.email,
      subject: "Sent Email",
      html: "<h1>Sent</h1>",
      recipientUserId: adminUser.id,
    });

    const result = await listEmailLogsAction({
      status: "DELIVERED",
      limit: 20,
    });

    expect(result.data?.success).toBe(true);
    if (result.data?.emailLogs.length > 0) {
      result.data.emailLogs.forEach((log) => {
        expect(log.status).toBe("DELIVERED");
      });
    }
  });

  it("filters email logs by mail type", async () => {
    const adminRoles = await assignRolesToUser(adminUser.id, [UserRole.ADMIN]);
    mockAuthSession(adminUser, adminRoles);

    await logEmail({
      to: adminUser.email,
      subject: "Notification Email",
      html: "<h1>Notification</h1>",
      recipientUserId: adminUser.id,
      mailType: "notification",
    });

    const result = await listEmailLogsAction({
      mailType: "notification",
      limit: 20,
    });

    expect(result.data?.success).toBe(true);
    if (result.data?.emailLogs.length > 0) {
      result.data.emailLogs.forEach((log) => {
        expect(log.mailType).toBe("notification");
      });
    }
  });

  it("searches email logs by subject", async () => {
    const adminRoles = await assignRolesToUser(adminUser.id, [UserRole.ADMIN]);
    mockAuthSession(adminUser, adminRoles);

    await logEmail({
      to: adminUser.email,
      subject: "Searchable Subject Test",
      html: "<h1>Searchable</h1>",
      recipientUserId: adminUser.id,
    });

    const result = await listEmailLogsAction({
      search: "Searchable Subject",
      limit: 20,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.emailLogs.length).toBeGreaterThan(0);
    const foundLog = result.data?.emailLogs.find(
      (log) => log.subject === "Searchable Subject Test",
    );
    expect(foundLog).toBeDefined();
  });

  it("searches email logs by recipient email", async () => {
    const adminRoles = await assignRolesToUser(adminUser.id, [UserRole.ADMIN]);
    mockAuthSession(adminUser, adminRoles);

    const searchEmail = `search-${Date.now()}@example.com`;
    await logEmail({
      to: searchEmail,
      subject: "Test Email",
      html: "<h1>Test</h1>",
    });

    const result = await listEmailLogsAction({
      search: searchEmail,
      limit: 20,
    });

    expect(result.data?.success).toBe(true);
    const foundLog = result.data?.emailLogs.find(
      (log) => log.recipientEmail === searchEmail,
    );
    expect(foundLog).toBeDefined();
  });

  it("filters email logs by read status - read", async () => {
    const adminRoles = await assignRolesToUser(adminUser.id, [UserRole.ADMIN]);
    mockAuthSession(adminUser, adminRoles);

    // Create an email and mark it as read
    const emailResult = await logEmail({
      to: adminUser.email,
      subject: "Read Email",
      html: "<h1>Read</h1>",
      recipientUserId: adminUser.id,
    });

    if (emailResult.emailLogId) {
      // Create a read entry
      await db.emailLogRead.create({
        data: {
          emailLogId: emailResult.emailLogId,
          readAt: new Date(),
        },
      });
    }

    const result = await listEmailLogsAction({
      readStatus: "read",
      limit: 20,
    });

    expect(result.data?.success).toBe(true);
    if (result.data?.emailLogs.length > 0) {
      result.data.emailLogs.forEach((log) => {
        expect(log.isRead).toBe(true);
      });
    }
  });

  it("filters email logs by read status - unread", async () => {
    const adminRoles = await assignRolesToUser(adminUser.id, [UserRole.ADMIN]);
    mockAuthSession(adminUser, adminRoles);

    await logEmail({
      to: adminUser.email,
      subject: "Unread Email",
      html: "<h1>Unread</h1>",
      recipientUserId: adminUser.id,
    });

    const result = await listEmailLogsAction({
      readStatus: "unread",
      limit: 20,
    });

    expect(result.data?.success).toBe(true);
    if (result.data?.emailLogs.length > 0) {
      result.data.emailLogs.forEach((log) => {
        expect(log.isRead).toBe(false);
      });
    }
  });

  it("filters email logs by date range", async () => {
    const adminRoles = await assignRolesToUser(adminUser.id, [UserRole.ADMIN]);
    mockAuthSession(adminUser, adminRoles);

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    await logEmail({
      to: adminUser.email,
      subject: "Today Email",
      html: "<h1>Today</h1>",
      recipientUserId: adminUser.id,
    });

    const result = await listEmailLogsAction({
      dateFrom: yesterday.toISOString(),
      dateTo: today.toISOString(),
      limit: 20,
    });

    expect(result.data?.success).toBe(true);
    // Should include the email we just created
    expect(result.data?.emailLogs.length).toBeGreaterThan(0);
  });

  it("handles cursor-based pagination", async () => {
    const adminRoles = await assignRolesToUser(adminUser.id, [UserRole.ADMIN]);
    mockAuthSession(adminUser, adminRoles);

    // Create multiple emails
    for (let i = 0; i < 5; i++) {
      await logEmail({
        to: adminUser.email,
        subject: `Pagination Email ${i}`,
        html: `<h1>Email ${i}</h1>`,
        recipientUserId: adminUser.id,
      });
    }

    const firstPage = await listEmailLogsAction({
      limit: 2,
    });

    expect(firstPage.data?.success).toBe(true);
    expect(firstPage.data?.emailLogs.length).toBe(2);
    expect(firstPage.data?.pagination?.hasMore).toBe(true);

    if (firstPage.data?.pagination?.nextCursor) {
      const secondPage = await listEmailLogsAction({
        cursor: firstPage.data.pagination.nextCursor,
        limit: 2,
      });

      expect(secondPage.data?.success).toBe(true);
      expect(secondPage.data?.emailLogs.length).toBeGreaterThan(0);
    }
  });

  it("throws error when user is not authenticated", async () => {
    mockNoAuthSession();

    const result = await listEmailLogsAction({
      limit: 20,
    });

    expect(result.data).toBeUndefined();
    expect(result.serverError).toBeDefined();
    expect(result.serverError?.length).toBeGreaterThan(0);
  });

  it("throws error when user lacks admin permissions", async () => {
    mockAuthSession(regularUser, []);

    const result = await listEmailLogsAction({
      limit: 20,
    });

    expect(result.data).toBeUndefined();
    expect(result.serverError).toBeDefined();
    expect(result.serverError?.length).toBeGreaterThan(0);
  });

  it("handles empty result set", async () => {
    const adminRoles = await assignRolesToUser(adminUser.id, [UserRole.ADMIN]);
    mockAuthSession(adminUser, adminRoles);

    const result = await listEmailLogsAction({
      search: "NonExistentEmailSubject12345",
      limit: 20,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.emailLogs.length).toBe(0);
    expect(result.data?.pagination?.totalCount).toBe(0);
  });

  it("validates limit parameter", async () => {
    const result = await listEmailLogsAction({
      limit: 101, // Invalid: max is 100
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("limit");
  });

  it("includes recipient and sender display names", async () => {
    const adminRoles = await assignRolesToUser(adminUser.id, [UserRole.ADMIN]);
    mockAuthSession(adminUser, adminRoles);

    await logEmail({
      to: adminUser.email,
      subject: "Test Email",
      html: "<h1>Test</h1>",
      recipientUserId: adminUser.id,
      recipientDisplayName: adminUser.name,
    });

    const result = await listEmailLogsAction({
      limit: 20,
    });

    expect(result.data?.success).toBe(true);
    const foundLog = result.data?.emailLogs.find(
      (log) => log.recipientEmail === adminUser.email,
    );
    expect(foundLog).toBeDefined();
    if (foundLog) {
      expect(foundLog.recipientDisplayName).toBeDefined();
      expect(foundLog.senderDisplayName).toBeDefined();
    }
  });

  it("sorts email logs by sentAt descending by default", async () => {
    const adminRoles = await assignRolesToUser(adminUser.id, [UserRole.ADMIN]);
    mockAuthSession(adminUser, adminRoles);

    // Create emails with slight delays
    await logEmail({
      to: adminUser.email,
      subject: "First Email",
      html: "<h1>First</h1>",
      recipientUserId: adminUser.id,
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    await logEmail({
      to: adminUser.email,
      subject: "Second Email",
      html: "<h1>Second</h1>",
      recipientUserId: adminUser.id,
    });

    const result = await listEmailLogsAction({
      limit: 20,
      sortBy: "sentAt",
      sortDirection: "desc",
    });

    expect(result.data?.success).toBe(true);
    if (result.data?.emailLogs.length >= 2) {
      const sentDates = result.data.emailLogs.map((log) =>
        new Date(log.sentAt).getTime(),
      );
      const sortedDates = [...sentDates].sort((a, b) => b - a);
      expect(sentDates).toEqual(sortedDates);
    }
  });
});
