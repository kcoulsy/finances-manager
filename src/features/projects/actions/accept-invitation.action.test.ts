import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/features/shared/lib/db/client";
import { sendEmail } from "@/features/shared/lib/utils/email";
import {
  createTestUser,
  generateUniqueEmail,
  generateUniqueString,
  mockAuthSession,
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/features/shared/testing/helpers";
import { acceptInvitationAction } from "./accept-invitation.action";

// Mock the email utility
vi.mock("@/features/shared/lib/utils/email", () => ({
  sendEmail: vi.fn(),
}));

describe("acceptInvitationAction", () => {
  let testUser: TestUser;
  let invitedUser: TestUser;
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
    const invitedUserEmail = generateUniqueEmail("invited");
    invitedUser = await createTestUser({
      name: "Invited User",
      email: invitedUserEmail,
    });

    // Reset email mock before each test
    vi.clearAllMocks();
    vi.mocked(sendEmail).mockResolvedValue({
      success: true,
      messageId: "test-message-id",
    });
  });

  it("accepts invitation successfully for existing user", async () => {
    // Create invitation
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const uniqueToken = generateUniqueString("test-token");
    const invitation = await db.projectInvitation.create({
      data: {
        projectId: testProject.id,
        email: invitedUser.email,
        userId: invitedUser.id,
        userType: "Client",
        token: uniqueToken,
        status: "PENDING",
        expiresAt,
        invitedById: testUser.id,
      },
    });

    // Switch to invited user's session
    mockAuthSession(invitedUser);

    const result = await acceptInvitationAction({
      token: uniqueToken,
    });

    expect(result.data?.success).toBe(true);
    if (!result.data) {
      throw new Error("Result data not returned");
    }
    if (!("project" in result.data) || !result.data.project) {
      throw new Error("Project not returned");
    }
    expect(result.data.project).toBeDefined();
    expect(result.data.project.id).toBe(testProject.id);
    expect(result.data.toast).toBeDefined();
    expect(result.data.toast?.message).toBe("Invitation accepted");

    // Verify user was added to project
    const projectUser = await db.projectUser.findUnique({
      where: {
        projectId_userId: {
          projectId: testProject.id,
          userId: invitedUser.id,
        },
      },
    });

    expect(projectUser).toBeDefined();
    expect(projectUser?.userType).toBe("Client");

    // Verify invitation was marked as accepted
    const updatedInvitation = await db.projectInvitation.findUnique({
      where: { id: invitation.id },
    });

    expect(updatedInvitation?.status).toBe("ACCEPTED");
    expect(updatedInvitation?.acceptedAt).toBeDefined();
    expect(updatedInvitation?.userId).toBe(invitedUser.id);

    // Verify email was sent to project owner with invitation acceptance details
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const emailCall = vi.mocked(sendEmail).mock.calls[0]?.[0];
    expect(emailCall).toBeDefined();
    expect(emailCall?.to).toBe(testUser.email);
    expect(emailCall?.subject).toContain("accepted your invitation");
    expect(emailCall?.html).toContain("Invited User");
    expect(emailCall?.html).toContain("Test Project");
    expect(emailCall?.html).toContain("Client");

    // Verify notification was created for project owner
    const notification = await db.notification.findFirst({
      where: {
        userId: testUser.id,
      },
    });

    expect(notification).toBeDefined();
    expect(notification?.title).toContain("joined");
    expect(notification?.title).toContain("Test Project");
    expect(notification?.subtitle).toContain("Invited User");
    expect(notification?.subtitle).toContain("Client");
    expect(notification?.link).toContain(`/projects/${testProject.id}/users`);
    expect(notification?.read).toBe(false);
  });

  it("accepts invitation for new user (email match)", async () => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const uniqueEmail = generateUniqueEmail("newuser");
    const uniqueToken = generateUniqueString("new-user-token");

    await db.projectInvitation.create({
      data: {
        projectId: testProject.id,
        email: uniqueEmail,
        userType: "Contractor",
        token: uniqueToken,
        status: "PENDING",
        expiresAt,
        invitedById: testUser.id,
      },
    });

    // Create and switch to user with matching email
    const newUser = await setupTestUserWithSession({
      name: "New User",
      email: uniqueEmail,
    });

    const result = await acceptInvitationAction({
      token: uniqueToken,
    });

    expect(result.data?.success).toBe(true);

    // Verify user was added to project
    const projectUser = await db.projectUser.findUnique({
      where: {
        projectId_userId: {
          projectId: testProject.id,
          userId: newUser.id,
        },
      },
    });

    expect(projectUser).toBeDefined();
    expect(projectUser?.userType).toBe("Contractor");

    // Verify email was sent to project owner with invitation acceptance details
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const emailCall = vi.mocked(sendEmail).mock.calls[0]?.[0];
    expect(emailCall).toBeDefined();
    expect(emailCall?.to).toBe(testUser.email);
    expect(emailCall?.subject).toContain("accepted your invitation");
    expect(emailCall?.html).toContain("New User");
    expect(emailCall?.html).toContain("Test Project");
    expect(emailCall?.html).toContain("Contractor");

    // Verify notification was created for project owner
    const notification = await db.notification.findFirst({
      where: {
        userId: testUser.id,
      },
    });

    expect(notification).toBeDefined();
    expect(notification?.title).toContain("joined");
    expect(notification?.link).toContain(`/projects/${testProject.id}/users`);
  });

  it("validates required token", async () => {
    const result = await acceptInvitationAction({
      token: "",
    } as Parameters<typeof acceptInvitationAction>[0]);

    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("token");
  });

  it("throws error when user is not authenticated", async () => {
    mockNoAuthSession();

    const uniqueToken = generateUniqueString("test-token");
    const result = await acceptInvitationAction({
      token: uniqueToken,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("logged in");
  });

  it("throws error when invitation not found", async () => {
    mockAuthSession(testUser);

    const result = await acceptInvitationAction({
      token: "non-existent-token",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("not found or invalid");
  });

  it("throws error when invitation not found with invalid token", async () => {
    mockAuthSession(testUser);

    const result = await acceptInvitationAction({
      token: generateUniqueString("non-existent"),
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("not found or invalid");
  });

  it("throws error when invitation already accepted", async () => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const uniqueToken = generateUniqueString("accepted-token");
    await db.projectInvitation.create({
      data: {
        projectId: testProject.id,
        email: invitedUser.email,
        userId: invitedUser.id,
        userType: "Client",
        token: uniqueToken,
        status: "ACCEPTED",
        expiresAt,
        invitedById: testUser.id,
        acceptedAt: new Date(),
      },
    });

    mockAuthSession(invitedUser);

    const result = await acceptInvitationAction({
      token: uniqueToken,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("already been used");
  });

  it("throws error when invitation expired", async () => {
    const expiredAt = new Date();
    expiredAt.setDate(expiredAt.getDate() - 1);

    const uniqueToken = generateUniqueString("expired-token");
    await db.projectInvitation.create({
      data: {
        projectId: testProject.id,
        email: invitedUser.email,
        userType: "Client",
        token: uniqueToken,
        status: "PENDING",
        expiresAt: expiredAt,
        invitedById: testUser.id,
      },
    });

    mockAuthSession(invitedUser);

    const result = await acceptInvitationAction({
      token: uniqueToken,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("expired");
  });

  it("throws error when email does not match", async () => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const uniqueToken = generateUniqueString("email-mismatch-token");
    const uniqueEmail = generateUniqueEmail("different");
    await db.projectInvitation.create({
      data: {
        projectId: testProject.id,
        email: uniqueEmail,
        userType: "Client",
        token: uniqueToken,
        status: "PENDING",
        expiresAt,
        invitedById: testUser.id,
      },
    });

    // User with different email
    mockAuthSession(invitedUser);

    const result = await acceptInvitationAction({
      token: uniqueToken,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("different email address");
  });

  it("handles case when user is already on project", async () => {
    // Add user to project first
    await db.projectUser.create({
      data: {
        projectId: testProject.id,
        userId: invitedUser.id,
        userType: "Employee",
      },
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const uniqueToken = generateUniqueString("already-on-token");
    const invitation = await db.projectInvitation.create({
      data: {
        projectId: testProject.id,
        email: invitedUser.email,
        userId: invitedUser.id,
        userType: "Client",
        token: uniqueToken,
        status: "PENDING",
        expiresAt,
        invitedById: testUser.id,
      },
    });

    mockAuthSession(invitedUser);

    const result = await acceptInvitationAction({
      token: uniqueToken,
    });

    expect(result.data?.success).toBe(true);
    if (!result.data) {
      throw new Error("Result data not returned");
    }
    if (!("message" in result.data)) {
      throw new Error("Message not returned");
    }
    expect(result.data.message).toContain("already on this project");

    // Verify invitation was still marked as accepted
    const updatedInvitation = await db.projectInvitation.findUnique({
      where: { id: invitation.id },
    });

    expect(updatedInvitation?.status).toBe("ACCEPTED");

    // Verify email was sent to project owner even when user already on project
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: testUser.email,
        subject: expect.stringContaining("accepted your invitation"),
      }),
    );

    // Verify notification was created for project owner
    const notification = await db.notification.findFirst({
      where: {
        userId: testUser.id,
      },
    });

    expect(notification).toBeDefined();
    expect(notification?.title).toContain("accepted invitation");
    expect(notification?.title).toContain("Test Project");
  });

  it("preserves userType from invitation when accepting", async () => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const uniqueToken = generateUniqueString("legal-token");
    await db.projectInvitation.create({
      data: {
        projectId: testProject.id,
        email: invitedUser.email,
        userId: invitedUser.id,
        userType: "Legal",
        token: uniqueToken,
        status: "PENDING",
        expiresAt,
        invitedById: testUser.id,
      },
    });

    mockAuthSession(invitedUser);

    await acceptInvitationAction({
      token: uniqueToken,
    });

    // Verify user type
    const projectUser = await db.projectUser.findUnique({
      where: {
        projectId_userId: {
          projectId: testProject.id,
          userId: invitedUser.id,
        },
      },
    });

    expect(projectUser?.userType).toBe("Legal");

    // Verify email was sent to project owner
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const emailCall = vi.mocked(sendEmail).mock.calls[0]?.[0];
    expect(emailCall).toBeDefined();
    expect(emailCall?.to).toBe(testUser.email);
    expect(emailCall?.subject).toContain("accepted your invitation");
    expect(emailCall?.html).toContain("Invited User");
    expect(emailCall?.html).toContain("Legal");

    // Verify notification was created for project owner
    const notification = await db.notification.findFirst({
      where: {
        userId: testUser.id,
      },
    });

    expect(notification).toBeDefined();
    expect(notification?.title).toContain("joined");
    expect(notification?.title).toContain("Test Project");
  });

  it("preserves userType from invitation when accepting after user already on project", async () => {
    // Add user to project first with different type
    await db.projectUser.create({
      data: {
        projectId: testProject.id,
        userId: invitedUser.id,
        userType: "Client",
      },
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const uniqueToken = generateUniqueString("legal-token-existing");
    await db.projectInvitation.create({
      data: {
        projectId: testProject.id,
        email: invitedUser.email,
        userId: invitedUser.id,
        userType: "Legal",
        token: uniqueToken,
        status: "PENDING",
        expiresAt,
        invitedById: testUser.id,
      },
    });

    mockAuthSession(invitedUser);

    await acceptInvitationAction({
      token: uniqueToken,
    });

    // Verify user type remains the same (doesn't change if already on project)
    const projectUser = await db.projectUser.findUnique({
      where: {
        projectId_userId: {
          projectId: testProject.id,
          userId: invitedUser.id,
        },
      },
    });

    // Type should remain Client, not change to Legal
    expect(projectUser?.userType).toBe("Client");

    // Verify email was sent to project owner
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: testUser.email,
        subject: expect.stringContaining("accepted your invitation"),
      }),
    );

    // Verify notification was created for project owner
    const notification = await db.notification.findFirst({
      where: {
        userId: testUser.id,
      },
    });

    expect(notification).toBeDefined();
  });

  it("sets first Client as primary client when accepting invitation and no primary client exists", async () => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const uniqueToken = generateUniqueString("primary-client-token");
    const clientUserEmail = generateUniqueEmail("primaryclient");

    await db.projectInvitation.create({
      data: {
        projectId: testProject.id,
        email: clientUserEmail,
        userType: "Client",
        token: uniqueToken,
        status: "PENDING",
        expiresAt,
        invitedById: testUser.id,
      },
    });

    // Create and switch to client user
    const clientUser = await setupTestUserWithSession({
      name: "Primary Client User",
      email: clientUserEmail,
    });

    // Verify project has no primary client
    const projectBefore = await db.project.findUnique({
      where: { id: testProject.id },
    });

    expect(projectBefore?.primaryClientId).toBeNull();

    const result = await acceptInvitationAction({
      token: uniqueToken,
    });

    expect(result.data?.success).toBe(true);

    // Verify user was added to project
    const projectUser = await db.projectUser.findUnique({
      where: {
        projectId_userId: {
          projectId: testProject.id,
          userId: clientUser.id,
        },
      },
    });

    expect(projectUser).toBeDefined();
    expect(projectUser?.userType).toBe("Client");

    // Verify primary client was set
    const projectAfter = await db.project.findUnique({
      where: { id: testProject.id },
    });

    expect(projectAfter?.primaryClientId).toBe(clientUser.id);
  });

  it("does not set primary client when accepting invitation as non-Client user type", async () => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const uniqueToken = generateUniqueString("contractor-token");
    const contractorEmail = generateUniqueEmail("contractor");

    await db.projectInvitation.create({
      data: {
        projectId: testProject.id,
        email: contractorEmail,
        userType: "Contractor",
        token: uniqueToken,
        status: "PENDING",
        expiresAt,
        invitedById: testUser.id,
      },
    });

    await setupTestUserWithSession({
      name: "Contractor User",
      email: contractorEmail,
    });

    const result = await acceptInvitationAction({
      token: uniqueToken,
    });

    expect(result.data?.success).toBe(true);

    // Verify primary client is NOT set
    const project = await db.project.findUnique({
      where: { id: testProject.id },
    });

    expect(project?.primaryClientId).toBeNull();
  });

  it("does not change primary client when project already has one", async () => {
    const existingPrimaryClient = await createTestUser({
      name: "Existing Primary Client",
      email: generateUniqueEmail("existing"),
    });

    // Set existing primary client
    await db.project.update({
      where: { id: testProject.id },
      data: {
        primaryClientId: existingPrimaryClient.id,
      },
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const uniqueToken = generateUniqueString("another-client-token");
    const anotherClientEmail = generateUniqueEmail("another");

    await db.projectInvitation.create({
      data: {
        projectId: testProject.id,
        email: anotherClientEmail,
        userType: "Client",
        token: uniqueToken,
        status: "PENDING",
        expiresAt,
        invitedById: testUser.id,
      },
    });

    await setupTestUserWithSession({
      name: "Another Client",
      email: anotherClientEmail,
    });

    const result = await acceptInvitationAction({
      token: uniqueToken,
    });

    expect(result.data?.success).toBe(true);

    // Verify primary client remains unchanged
    const project = await db.project.findUnique({
      where: { id: testProject.id },
    });

    expect(project?.primaryClientId).toBe(existingPrimaryClient.id);
  });
});
