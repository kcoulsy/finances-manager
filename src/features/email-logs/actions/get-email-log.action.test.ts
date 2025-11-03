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
import { getEmailLogAction } from "./get-email-log.action";

describe("getEmailLogAction", () => {
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

  it("returns email log successfully with admin permission", async () => {
    const adminRoles = await assignRolesToUser(adminUser.id, [UserRole.ADMIN]);
    mockAuthSession(adminUser, adminRoles);

    const emailResult = await logEmail({
      to: adminUser.email,
      subject: "Test Email",
      html: "<h1>Test</h1>",
      recipientUserId: adminUser.id,
      mailType: "notification",
    });

    expect(emailResult.emailLogId).toBeDefined();
    if (!emailResult.emailLogId) {
      throw new Error("Email log ID is required for test");
    }

    const result = await getEmailLogAction({
      emailLogId: emailResult.emailLogId,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.emailLog).toBeDefined();
    expect(result.data?.emailLog.id).toBe(emailResult.emailLogId);
    expect(result.data?.emailLog.subject).toBe("Test Email");
    expect(result.data?.emailLog.recipientEmail).toBe(adminUser.email);
    expect(result.data?.emailLog.mailType).toBe("notification");
  });

  it("includes read tracking information", async () => {
    const adminRoles = await assignRolesToUser(adminUser.id, [UserRole.ADMIN]);
    mockAuthSession(adminUser, adminRoles);

    const emailResult = await logEmail({
      to: adminUser.email,
      subject: "Read Tracking Email",
      html: "<h1>Test</h1>",
      recipientUserId: adminUser.id,
    });

    expect(emailResult.emailLogId).toBeDefined();
    if (!emailResult.emailLogId) {
      throw new Error("Email log ID is required for test");
    }

    // Create read entries
    await db.emailLogRead.create({
      data: {
        emailLogId: emailResult.emailLogId,
        readAt: new Date(),
        ipAddress: "192.168.1.1",
        browser: "Chrome",
        operatingSystem: "Windows",
      },
    });

    const result = await getEmailLogAction({
      emailLogId: emailResult.emailLogId,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.emailLog).toBeDefined();
    expect(result.data?.emailLog.readCount).toBe(1);
    expect(result.data?.emailLog.isRead).toBe(true);
    expect(result.data?.emailLog.reads).toBeDefined();
    expect(result.data?.emailLog.reads?.length).toBe(1);
    if (result.data?.emailLog.reads && result.data.emailLog.reads.length > 0) {
      expect(result.data.emailLog.reads[0].ipAddress).toBe("192.168.1.1");
      expect(result.data.emailLog.reads[0].browser).toBe("Chrome");
      expect(result.data.emailLog.reads[0].operatingSystem).toBe("Windows");
    }
  });

  it("includes recipient and sender user information when available", async () => {
    const adminRoles = await assignRolesToUser(adminUser.id, [UserRole.ADMIN]);
    mockAuthSession(adminUser, adminRoles);

    const emailResult = await logEmail({
      to: adminUser.email,
      subject: "User Info Email",
      html: "<h1>Test</h1>",
      recipientUserId: adminUser.id,
      recipientDisplayName: adminUser.name,
    });

    expect(emailResult.emailLogId).toBeDefined();
    if (!emailResult.emailLogId) {
      throw new Error("Email log ID is required for test");
    }

    const result = await getEmailLogAction({
      emailLogId: emailResult.emailLogId,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.emailLog.recipientDisplayName).toBeDefined();
    expect(result.data?.emailLog.senderDisplayName).toBeDefined();
  });

  it("includes resend information when email is a resend", async () => {
    const adminRoles = await assignRolesToUser(adminUser.id, [UserRole.ADMIN]);
    mockAuthSession(adminUser, adminRoles);

    // Create original email
    const originalResult = await logEmail({
      to: adminUser.email,
      subject: "Original Email",
      html: "<h1>Original</h1>",
      recipientUserId: adminUser.id,
    });

    expect(originalResult.emailLogId).toBeDefined();
    if (!originalResult.emailLogId) {
      throw new Error("Original email log ID is required for test");
    }

    // Create resend
    const resendResult = await logEmail({
      to: adminUser.email,
      subject: "Original Email",
      html: "<h1>Original</h1>",
      recipientUserId: adminUser.id,
      isResend: true,
      originalEmailLogId: originalResult.emailLogId,
    });

    expect(resendResult.emailLogId).toBeDefined();
    if (!resendResult.emailLogId) {
      throw new Error("Resend email log ID is required for test");
    }

    const result = await getEmailLogAction({
      emailLogId: resendResult.emailLogId,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.emailLog.isResend).toBe(true);
    expect(result.data?.emailLog.originalEmailLogId).toBe(
      originalResult.emailLogId,
    );
    expect(result.data?.emailLog.originalEmailLog).toBeDefined();
  });

  it("returns error when email log not found", async () => {
    const adminRoles = await assignRolesToUser(adminUser.id, [UserRole.ADMIN]);
    mockAuthSession(adminUser, adminRoles);

    const result = await getEmailLogAction({
      emailLogId: "non-existent-id",
    });

    expect(result.data).toBeUndefined();
    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(/not found/i);
  });

  it("throws error when user is not authenticated", async () => {
    mockNoAuthSession();

    const result = await getEmailLogAction({
      emailLogId: "test-id",
    });

    expect(result.data).toBeUndefined();
    expect(result.serverError).toBeDefined();
    expect(result.serverError?.length).toBeGreaterThan(0);
  });

  it("throws error when user lacks admin permissions", async () => {
    mockAuthSession(regularUser, []);

    const result = await getEmailLogAction({
      emailLogId: "test-id",
    });

    expect(result.data).toBeUndefined();
    expect(result.serverError).toBeDefined();
    expect(result.serverError?.length).toBeGreaterThan(0);
  });

  it("validates email log ID parameter", async () => {
    const result = await getEmailLogAction({
      emailLogId: "", // Invalid: must not be empty
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("emailLogId");
  });
});
