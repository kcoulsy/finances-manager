import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/features/shared/lib/db/client";
import {
  createTestUser,
  generateUniqueEmail,
  generateUniqueString,
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/features/shared/testing/helpers";
import { listPendingInvitationsAction } from "./list-pending-invitations.action";

describe("listPendingInvitationsAction", () => {
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
  });

  it("lists pending invitations for the authenticated user", async () => {
    // Create invitation for testUser
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const uniqueToken = generateUniqueString("test-token-1");
    await db.projectInvitation.create({
      data: {
        projectId: testProject.id,
        email: testUser.email,
        userId: testUser.id,
        userType: "Client",
        token: uniqueToken,
        status: "PENDING",
        expiresAt,
        invitedById: otherUser.id,
      },
    });

    const result = await listPendingInvitationsAction({
      page: 1,
      limit: 10,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.invitations).toBeDefined();
    expect(Array.isArray(result.data?.invitations)).toBe(true);
    expect(result.data?.invitations.length).toBe(1);
    expect(result.data?.invitations[0]?.email).toBe(testUser.email);
    expect(result.data?.invitations[0]?.status).toBe("PENDING");
    expect(result.data?.invitations[0]?.project.id).toBe(testProject.id);
  });

  it("returns empty array when user has no pending invitations", async () => {
    const result = await listPendingInvitationsAction({
      page: 1,
      limit: 10,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.invitations).toBeDefined();
    expect(Array.isArray(result.data?.invitations)).toBe(true);
    expect(result.data?.invitations.length).toBe(0);
    expect(result.data?.total).toBe(0);
  });

  it("only shows invitations for the authenticated user's email", async () => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Invitation for testUser (should appear)
    const token1 = generateUniqueString("test-token-1");
    await db.projectInvitation.create({
      data: {
        projectId: testProject.id,
        email: testUser.email,
        userId: testUser.id,
        userType: "Client",
        token: token1,
        status: "PENDING",
        expiresAt,
        invitedById: otherUser.id,
      },
    });

    // Invitation for other user (should not appear)
    await db.projectInvitation.create({
      data: {
        projectId: testProject.id,
        email: otherUser.email,
        userId: otherUser.id,
        userType: "Contractor",
        token: generateUniqueString("test-token-2"),
        status: "PENDING",
        expiresAt,
        invitedById: testUser.id,
      },
    });

    const result = await listPendingInvitationsAction({
      page: 1,
      limit: 10,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.invitations.length).toBe(1);
    expect(result.data?.invitations[0]?.email).toBe(testUser.email);
  });

  it("only shows pending invitations", async () => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create separate projects for each invitation to avoid unique constraint
    const project1 = await db.project.create({
      data: {
        name: "Project 1",
        userId: otherUser.id,
      },
    });

    const project2 = await db.project.create({
      data: {
        name: "Project 2",
        userId: otherUser.id,
      },
    });

    const project3 = await db.project.create({
      data: {
        name: "Project 3",
        userId: otherUser.id,
      },
    });

    // Pending invitation (should appear)
    const pendingToken = generateUniqueString("pending-token");
    await db.projectInvitation.create({
      data: {
        projectId: project1.id,
        email: testUser.email,
        userId: testUser.id,
        userType: "Client",
        token: pendingToken,
        status: "PENDING",
        expiresAt,
        invitedById: otherUser.id,
      },
    });

    // Accepted invitation (should not appear)
    const acceptedToken = generateUniqueString("accepted-token");
    await db.projectInvitation.create({
      data: {
        projectId: project2.id,
        email: testUser.email,
        userId: testUser.id,
        userType: "Contractor",
        token: acceptedToken,
        status: "ACCEPTED",
        expiresAt,
        invitedById: otherUser.id,
        acceptedAt: new Date(),
      },
    });

    // Cancelled invitation (should not appear)
    const cancelledToken = generateUniqueString("cancelled-token");
    await db.projectInvitation.create({
      data: {
        projectId: project3.id,
        email: testUser.email,
        userId: testUser.id,
        userType: "Employee",
        token: cancelledToken,
        status: "CANCELLED",
        expiresAt,
        invitedById: otherUser.id,
      },
    });

    const result = await listPendingInvitationsAction({
      page: 1,
      limit: 10,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.invitations.length).toBe(1);
    expect(result.data?.invitations[0]?.token).toBe(pendingToken);
  });

  it("only shows non-expired invitations", async () => {
    // Create separate projects for each invitation to avoid unique constraint
    const project1 = await db.project.create({
      data: {
        name: "Valid Project",
        userId: otherUser.id,
      },
    });

    const project2 = await db.project.create({
      data: {
        name: "Expired Project",
        userId: otherUser.id,
      },
    });

    // Valid invitation (should appear)
    const validAt = new Date();
    validAt.setDate(validAt.getDate() + 7);

    const validToken = generateUniqueString("valid-token");
    await db.projectInvitation.create({
      data: {
        projectId: project1.id,
        email: testUser.email,
        userId: testUser.id,
        userType: "Client",
        token: validToken,
        status: "PENDING",
        expiresAt: validAt,
        invitedById: otherUser.id,
      },
    });

    // Expired invitation (should not appear)
    const expiredAt = new Date();
    expiredAt.setDate(expiredAt.getDate() - 1);

    const expiredToken = generateUniqueString("expired-token");
    await db.projectInvitation.create({
      data: {
        projectId: project2.id,
        email: testUser.email,
        userId: testUser.id,
        userType: "Contractor",
        token: expiredToken,
        status: "PENDING",
        expiresAt: expiredAt,
        invitedById: otherUser.id,
      },
    });

    const result = await listPendingInvitationsAction({
      page: 1,
      limit: 10,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.invitations.length).toBe(1);
    expect(result.data?.invitations[0]?.token).toBe(validToken);
  });

  it("includes project information", async () => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.projectInvitation.create({
      data: {
        projectId: testProject.id,
        email: testUser.email,
        userId: testUser.id,
        userType: "Legal",
        token: generateUniqueString("test-token"),
        status: "PENDING",
        expiresAt,
        invitedById: otherUser.id,
      },
    });

    const result = await listPendingInvitationsAction({
      page: 1,
      limit: 10,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.invitations[0]?.project).toBeDefined();
    expect(result.data?.invitations[0]?.project.id).toBe(testProject.id);
    expect(result.data?.invitations[0]?.project.name).toBe("Test Project");
  });

  it("includes inviter information", async () => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.projectInvitation.create({
      data: {
        projectId: testProject.id,
        email: testUser.email,
        userId: testUser.id,
        userType: "Client",
        token: generateUniqueString("test-token"),
        status: "PENDING",
        expiresAt,
        invitedById: otherUser.id,
      },
    });

    const result = await listPendingInvitationsAction({
      page: 1,
      limit: 10,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.invitations[0]?.invitedBy).toBeDefined();
    expect(result.data?.invitations[0]?.invitedBy.id).toBe(otherUser.id);
    expect(result.data?.invitations[0]?.invitedBy.name).toBe("Other User");
    expect(result.data?.invitations[0]?.invitedBy.email).toBe(otherUser.email);
  });

  it("paginates results correctly", async () => {
    // Create multiple invitations
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    for (let i = 0; i < 5; i++) {
      const project = await db.project.create({
        data: {
          name: `Project ${i}`,
          userId: otherUser.id,
        },
      });

      const uniqueToken = generateUniqueString(`token-${i}`);
      await db.projectInvitation.create({
        data: {
          projectId: project.id,
          email: testUser.email,
          userId: testUser.id,
          userType: "Client",
          token: uniqueToken,
          status: "PENDING",
          expiresAt,
          invitedById: otherUser.id,
        },
      });
    }

    // Page 1
    const page1 = await listPendingInvitationsAction({
      page: 1,
      limit: 2,
    });

    expect(page1.data?.invitations.length).toBe(2);
    expect(page1.data?.page).toBe(1);
    expect(page1.data?.limit).toBe(2);
    expect(page1.data?.total).toBe(5);
    expect(page1.data?.totalPages).toBe(3);

    // Page 2
    const page2 = await listPendingInvitationsAction({
      page: 2,
      limit: 2,
    });

    expect(page2.data?.invitations.length).toBe(2);
    expect(page2.data?.page).toBe(2);
  });

  it("sorts invitations by creation date descending", async () => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitations with delays
    const project1 = await db.project.create({
      data: {
        name: "Project 1",
        userId: otherUser.id,
      },
    });

    const token1 = generateUniqueString("token-1");
    await db.projectInvitation.create({
      data: {
        projectId: project1.id,
        email: testUser.email,
        userId: testUser.id,
        userType: "Client",
        token: token1,
        status: "PENDING",
        expiresAt,
        invitedById: otherUser.id,
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const project2 = await db.project.create({
      data: {
        name: "Project 2",
        userId: otherUser.id,
      },
    });

    const token2 = generateUniqueString("token-2");
    await db.projectInvitation.create({
      data: {
        projectId: project2.id,
        email: testUser.email,
        userId: testUser.id,
        userType: "Contractor",
        token: token2,
        status: "PENDING",
        expiresAt,
        invitedById: otherUser.id,
      },
    });

    const result = await listPendingInvitationsAction({
      page: 1,
      limit: 10,
    });

    expect(result.data?.invitations.length).toBeGreaterThanOrEqual(2);
    // Most recent should be first
    expect(
      result.data?.invitations[0]?.createdAt.getTime(),
    ).toBeGreaterThanOrEqual(result.data?.invitations[1]?.createdAt.getTime());
  });

  it("throws error when user is not authenticated", async () => {
    mockNoAuthSession();

    const result = await listPendingInvitationsAction({
      page: 1,
      limit: 10,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("logged in");
  });

  it("handles invitations for email without existing user", async () => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation for email that doesn't have a user account
    const uniqueEmail = generateUniqueEmail("newuser");
    const uniqueToken = generateUniqueString("new-user-token");
    await db.projectInvitation.create({
      data: {
        projectId: testProject.id,
        email: uniqueEmail,
        userType: "Employee",
        token: uniqueToken,
        status: "PENDING",
        expiresAt,
        invitedById: otherUser.id,
      },
    });

    // Create a user with that email for testing
    await setupTestUserWithSession({
      name: "New User",
      email: uniqueEmail,
    });

    const result = await listPendingInvitationsAction({
      page: 1,
      limit: 10,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.invitations.length).toBe(1);
    expect(result.data?.invitations[0]?.email).toBe(uniqueEmail);
  });
});
