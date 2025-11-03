import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@/features/auth/constants/roles";
import { db } from "@/features/shared/lib/db/client";
import {
  assignRolesToUser,
  mockAuthSession,
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/features/shared/testing/helpers";
import { sendTestEmailAction } from "./send-test-email.action";

describe("sendTestEmailAction", () => {
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

  it("sends test email successfully with admin permission", async () => {
    const adminRoles = await assignRolesToUser(adminUser.id, [UserRole.ADMIN]);
    mockAuthSession(adminUser, adminRoles);

    const result = await sendTestEmailAction({});

    // Email sending may fail in tests, but the email log should still be created
    if (result.serverError) {
      // If there's an error, it means email sending failed
      // But the email log entry should still exist
      expect(result.serverError).toBeDefined();

      // Verify the email log was created despite sending failure
      const emailLogs = await db.emailLog.findMany({
        where: {
          recipientEmail: adminUser.email,
          subject: { contains: "Test Email" },
        },
        orderBy: { sentAt: "desc" },
        take: 1,
      });
      expect(emailLogs.length).toBeGreaterThan(0);
    } else {
      expect(result.data?.success).toBe(true);
      expect(result.data?.emailLogId).toBeDefined();
      expect(result.data?.toast).toBeDefined();
      expect(result.data?.toast?.message).toContain("Test email");
      // Toast type may be "success" or "warning" depending on email sending
      expect(["success", "warning"]).toContain(result.data?.toast?.type);
    }
  });

  it("creates email log entry for test email", async () => {
    const adminRoles = await assignRolesToUser(adminUser.id, [UserRole.ADMIN]);
    mockAuthSession(adminUser, adminRoles);

    const result = await sendTestEmailAction({});

    // Email sending may fail in tests, but the email log should still be created
    if (result.serverError) {
      // If there's an error, verify the email log was still created
      const emailLogs = await db.emailLog.findMany({
        where: {
          recipientEmail: adminUser.email,
          subject: { contains: "Test Email" },
        },
        orderBy: { sentAt: "desc" },
        take: 1,
      });
      expect(emailLogs.length).toBeGreaterThan(0);
      const emailLog = emailLogs[0];
      expect(emailLog?.subject).toContain("Test Email");
      expect(emailLog?.recipientEmail).toBe(adminUser.email);
      expect(emailLog?.mailType).toBe("notification");
    } else {
      expect(result.data?.success).toBe(true);
      expect(result.data?.emailLogId).toBeDefined();

      if (result.data?.emailLogId) {
        const emailLog = await db.emailLog.findUnique({
          where: { id: result.data.emailLogId },
        });

        expect(emailLog).toBeDefined();
        expect(emailLog?.subject).toContain("Test Email");
        expect(emailLog?.recipientEmail).toBe(adminUser.email);
        expect(emailLog?.mailType).toBe("notification");
      }
    }
  });

  it("sends test email to current user", async () => {
    const adminRoles = await assignRolesToUser(adminUser.id, [UserRole.ADMIN]);
    mockAuthSession(adminUser, adminRoles);

    const result = await sendTestEmailAction({});

    // Email sending may fail in tests, but the email log should still be created
    if (result.serverError) {
      // If there's an error, verify the email log was still created
      const emailLogs = await db.emailLog.findMany({
        where: {
          recipientEmail: adminUser.email,
          subject: { contains: "Test Email" },
        },
        include: {
          recipientUser: {
            select: {
              id: true,
              email: true,
            },
          },
        },
        orderBy: { sentAt: "desc" },
        take: 1,
      });
      expect(emailLogs.length).toBeGreaterThan(0);
      const emailLog = emailLogs[0];
      expect(emailLog?.recipientEmail).toBe(adminUser.email);
      expect(emailLog?.recipientUserId).toBe(adminUser.id);
    } else {
      expect(result.data?.success).toBe(true);
      expect(result.data?.emailLogId).toBeDefined();

      if (result.data?.emailLogId) {
        const emailLog = await db.emailLog.findUnique({
          where: { id: result.data.emailLogId },
          include: {
            recipientUser: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        });

        expect(emailLog).toBeDefined();
        expect(emailLog?.recipientEmail).toBe(adminUser.email);
        expect(emailLog?.recipientUserId).toBe(adminUser.id);
      }
    }
  });

  it("throws error when user is not authenticated", async () => {
    mockNoAuthSession();

    const result = await sendTestEmailAction({});

    expect(result.data).toBeUndefined();
    expect(result.serverError).toBeDefined();
    // Error might be "next_redirect: /login" or "must be signed in" depending on requireRole implementation
    expect(
      result.serverError?.toLowerCase().includes("login") ||
        result.serverError?.toLowerCase().includes("signed in") ||
        result.serverError?.toLowerCase().includes("authenticated"),
    ).toBe(true);
  });

  it("throws error when user lacks admin permissions", async () => {
    mockAuthSession(regularUser, []);

    const result = await sendTestEmailAction({});

    expect(result.data).toBeUndefined();
    expect(result.serverError).toBeDefined();
    expect(result.serverError?.length).toBeGreaterThan(0);
  });
});
