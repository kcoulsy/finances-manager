import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/features/shared/lib/db/client";
import { sendEmail } from "@/features/shared/lib/utils/email";
import {
  createTestUser,
  generateUniqueEmail,
  generateUniqueString,
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/features/shared/testing/helpers";
import { inviteProjectUserAction } from "./invite-project-user.action";

// Mock the email utility
vi.mock("@/features/shared/lib/utils/email", () => ({
  sendEmail: vi.fn(),
}));

describe("inviteProjectUserAction", () => {
  let testUser: TestUser;
  let otherUser: TestUser;
  let testProject: { id: string; name: string; userId: string };

  setupTestHooks();

  beforeEach(async () => {
    testUser = await setupTestUserWithSession();
    testProject = await db.project.create({
      data: {
        name: "Test Project",
        description: "A test project",
        userId: testUser.id,
      },
    });

    // Use unique email to avoid conflicts between tests
    const otherUserEmail = generateUniqueEmail("other");
    otherUser = await createTestUser({
      name: "Other User",
      email: otherUserEmail,
    });

    // Reset email mock before each test
    vi.clearAllMocks();
    vi.mocked(sendEmail).mockResolvedValue({
      success: true,
      messageId: "test-message-id",
    });
  });

  it("invites a new user by email successfully", async () => {
    const result = await inviteProjectUserAction({
      projectId: testProject.id,
      email: "newuser@example.com",
      userType: "Client",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.invitation).toBeDefined();
    expect(result.data?.invitation.email).toBe("newuser@example.com");
    expect(result.data?.invitation.userType).toBe("Client");
    expect(result.data?.invitation.status).toBe("PENDING");
    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.message).toBe("Invitation sent successfully");

    // Verify invitation was created in database
    const invitation = await db.projectInvitation.findUnique({
      where: { id: result.data?.invitation.id },
    });

    expect(invitation).toBeDefined();
    expect(invitation?.email).toBe("newuser@example.com");
    expect(invitation?.projectId).toBe(testProject.id);

    // Verify email was sent with invitation link
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "newuser@example.com",
        subject: expect.stringContaining("Test Project"),
        html: expect.stringContaining("/invitations/accept?token="),
        text: expect.stringContaining("/invitations/accept?token="),
      }),
    );
  });

  it("invites an existing user and creates notification", async () => {
    const result = await inviteProjectUserAction({
      projectId: testProject.id,
      email: otherUser.email,
      userType: "Contractor",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.invitation).toBeDefined();
    expect(result.data?.invitation.userId).toBe(otherUser.id);

    // Verify notification was created
    const notification = await db.notification.findFirst({
      where: {
        userId: otherUser.id,
      },
    });

    expect(notification).toBeDefined();
    expect(notification?.title).toContain("Test Project");
    expect(notification?.link).toContain("/invitations/accept");
    expect(notification?.read).toBe(false);

    // Verify email was sent with invitation link
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: otherUser.email,
        subject: expect.stringContaining("Test Project"),
        html: expect.stringContaining("/invitations/accept?token="),
      }),
    );
  });

  it("validates required fields", async () => {
    const result = await inviteProjectUserAction({
      projectId: "",
      email: "",
      userType: "Client",
    } as Parameters<typeof inviteProjectUserAction>[0]);

    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("projectId");
    expect(result.validationErrors).toHaveProperty("email");
  });

  it("validates email format", async () => {
    const result = await inviteProjectUserAction({
      projectId: testProject.id,
      email: "invalid-email",
      userType: "Client",
    });

    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("email");
  });

  it("validates userType enum", async () => {
    const result = await inviteProjectUserAction({
      projectId: testProject.id,
      email: "test@example.com",
      userType: "InvalidType" as "Client" | "Contractor" | "Employee" | "Legal",
    });

    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("userType");
  });

  it("throws error when user is not authenticated", async () => {
    mockNoAuthSession();

    const result = await inviteProjectUserAction({
      projectId: testProject.id,
      email: "test@example.com",
      userType: "Client",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("logged in");
  });

  it("throws error when project not found", async () => {
    const result = await inviteProjectUserAction({
      projectId: "non-existent-id",
      email: "test@example.com",
      userType: "Client",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("Project not found");
  });

  it("throws error when user does not own project", async () => {
    const otherUserProject = await db.project.create({
      data: {
        name: "Other User's Project",
        userId: otherUser.id,
      },
    });

    const result = await inviteProjectUserAction({
      projectId: otherUserProject.id,
      email: "test@example.com",
      userType: "Client",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("permission");
  });

  it("throws error when user is already on the project", async () => {
    // Add user to project first
    await db.projectUser.create({
      data: {
        projectId: testProject.id,
        userId: otherUser.id,
        userType: "Client",
      },
    });

    const result = await inviteProjectUserAction({
      projectId: testProject.id,
      email: otherUser.email,
      userType: "Employee",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("already on the project");
  });

  it("throws error when invitation already exists", async () => {
    // Create a pending invitation first
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const uniqueToken = generateUniqueString("pending-token");
    await db.projectInvitation.create({
      data: {
        projectId: testProject.id,
        email: "pending@example.com",
        userType: "Client",
        token: uniqueToken,
        status: "PENDING",
        expiresAt,
        invitedById: testUser.id,
      },
    });

    const result = await inviteProjectUserAction({
      projectId: testProject.id,
      email: "pending@example.com",
      userType: "Employee",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("already been sent");
  });

  it("creates invitation with correct userType", async () => {
    const userTypes = ["Client", "Contractor", "Employee", "Legal"] as const;

    for (const userType of userTypes) {
      const email = `test-${userType.toLowerCase()}@example.com`;
      const result = await inviteProjectUserAction({
        projectId: testProject.id,
        email,
        userType,
      });

      expect(result.data?.success).toBe(true);
      expect(result.data?.invitation.userType).toBe(userType);

      // Clean up for next iteration
      await db.projectInvitation.deleteMany({
        where: { email },
      });
    }
  });

  it("creates invitation with expiration date 7 days from now", async () => {
    const beforeInvite = new Date();
    const result = await inviteProjectUserAction({
      projectId: testProject.id,
      email: "expiry-test@example.com",
      userType: "Client",
    });

    expect(result.data?.success).toBe(true);

    const invitation = await db.projectInvitation.findUnique({
      where: { id: result.data?.invitation.id },
    });

    expect(invitation).toBeDefined();
    expect(invitation?.expiresAt).toBeDefined();

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    const invitationExpiresAt = invitation.expiresAt;
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    // Check that expiration is approximately 7 days from now (within 1 minute tolerance)
    const diff = invitationExpiresAt.getTime() - sevenDaysFromNow.getTime();
    expect(Math.abs(diff)).toBeLessThan(60 * 1000); // 1 minute
    expect(invitationExpiresAt > beforeInvite).toBe(true);
  });
});
