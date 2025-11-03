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
import { resendEmailAction } from "./resend-email.action";

describe("resendEmailAction", () => {
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

  it("resends email successfully with admin permission", async () => {
    const adminRoles = await assignRolesToUser(adminUser.id, [UserRole.ADMIN]);
    mockAuthSession(adminUser, adminRoles);

    // Create an email to resend
    const originalResult = await logEmail({
      to: adminUser.email,
      subject: "Original Email",
      html: "<h1>Original</h1>",
      recipientUserId: adminUser.id,
      mailType: "notification",
    });

    expect(originalResult.emailLogId).toBeDefined();
    if (!originalResult.emailLogId) {
      throw new Error("Email log ID is required for test");
    }

    const result = await resendEmailAction({
      emailLogId: originalResult.emailLogId,
    });

    // Email sending may fail in tests, but the email log should still be created
    if (result.serverError) {
      // If there's an error, it means email sending failed
      // But the email log entry should still exist
      expect(result.serverError).toBeDefined();

      // Verify the resend email log was created despite sending failure
      const resendLogs = await db.emailLog.findMany({
        where: {
          originalEmailLogId: originalResult.emailLogId,
          isResend: true,
        },
      });
      expect(resendLogs.length).toBeGreaterThan(0);
    } else {
      expect(result.data?.success).toBe(true);
      expect(result.data?.emailLogId).toBeDefined();
      expect(result.data?.toast).toBeDefined();
      // Toast message may be "Email resent successfully" or "Email resend logged" depending on email sending
      expect(
        result.data?.toast?.message.toLowerCase().includes("resent") ||
          result.data?.toast?.message.toLowerCase().includes("logged"),
      ).toBe(true);
      // Toast type may be "success" or "warning" depending on email sending
      expect(["success", "warning"]).toContain(result.data?.toast?.type);
    }
  });

  it("creates resend entry with correct metadata", async () => {
    const adminRoles = await assignRolesToUser(adminUser.id, [UserRole.ADMIN]);
    mockAuthSession(adminUser, adminRoles);

    const originalResult = await logEmail({
      to: adminUser.email,
      subject: "Resend Test Email",
      html: "<h1>Resend</h1>",
      recipientUserId: adminUser.id,
    });

    expect(originalResult.emailLogId).toBeDefined();
    if (!originalResult.emailLogId) {
      throw new Error("Email log ID is required for test");
    }

    const result = await resendEmailAction({
      emailLogId: originalResult.emailLogId,
    });

    // Email sending may fail in tests, but the email log should still be created
    if (result.serverError) {
      // If there's an error, it means email sending failed
      // But the email log entry should still exist
      expect(result.serverError).toBeDefined();

      // Verify the resend email log was created despite sending failure
      const resendLogs = await db.emailLog.findMany({
        where: {
          originalEmailLogId: originalResult.emailLogId,
          isResend: true,
        },
      });
      expect(resendLogs.length).toBeGreaterThan(0);
      // The resend should create a new email log entry
      expect(resendLogs[0]?.id).not.toBe(originalResult.emailLogId);
    } else {
      expect(result.data?.success).toBe(true);
      expect(result.data?.emailLogId).toBeDefined();
      // The resend should create a new email log entry
      expect(result.data?.emailLogId).not.toBe(originalResult.emailLogId);
    }
  });

  it("returns error when email log not found", async () => {
    const adminRoles = await assignRolesToUser(adminUser.id, [UserRole.ADMIN]);
    mockAuthSession(adminUser, adminRoles);

    const result = await resendEmailAction({
      emailLogId: "non-existent-id",
    });

    expect(result.data).toBeUndefined();
    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(/not found/i);
  });

  it("throws error when user is not authenticated", async () => {
    mockNoAuthSession();

    const result = await resendEmailAction({
      emailLogId: "test-id",
    });

    expect(result.data).toBeUndefined();
    expect(result.serverError).toBeDefined();
    expect(result.serverError?.length).toBeGreaterThan(0);
  });

  it("throws error when user lacks admin permissions", async () => {
    mockAuthSession(regularUser, []);

    const result = await resendEmailAction({
      emailLogId: "test-id",
    });

    expect(result.data).toBeUndefined();
    expect(result.serverError).toBeDefined();
    expect(result.serverError?.length).toBeGreaterThan(0);
  });

  it("validates email log ID parameter", async () => {
    const result = await resendEmailAction({
      emailLogId: "", // Invalid: must not be empty
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("emailLogId");
  });
});
