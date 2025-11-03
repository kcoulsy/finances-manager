import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/features/shared/lib/db/client";
import {
  createTestUser,
  generateUniqueString,
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/features/shared/testing/helpers";
import { listProjectUsersAction } from "./list-project-users.action";

describe("listProjectUsersAction", () => {
  let testUser: TestUser;
  let otherUser: TestUser;
  let projectUser: TestUser;
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

    otherUser = await createTestUser({
      name: "Other User",
      email: "other@example.com",
    });

    projectUser = await createTestUser({
      name: "Project User",
      email: "projectuser@example.com",
    });
  });

  it("lists project users and invitations successfully", async () => {
    // Add a user to the project
    await db.projectUser.create({
      data: {
        projectId: testProject.id,
        userId: projectUser.id,
        userType: "Client",
      },
    });

    // Create a pending invitation
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const uniqueToken = generateUniqueString("invitation-token");
    await db.projectInvitation.create({
      data: {
        projectId: testProject.id,
        email: "invited@example.com",
        userType: "Contractor",
        token: uniqueToken,
        status: "PENDING",
        expiresAt,
        invitedById: testUser.id,
      },
    });

    const result = await listProjectUsersAction({
      projectId: testProject.id,
      page: 1,
      limit: 10,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.entries).toBeDefined();
    expect(Array.isArray(result.data?.entries)).toBe(true);
    expect(result.data?.entries.length).toBeGreaterThanOrEqual(2);
    expect(result.data?.total).toBeGreaterThanOrEqual(2);

    // Check that both user and invitation are present
    const hasUser = result.data?.entries.some(
      (entry) => entry.type === "user" && entry.user?.id === projectUser.id,
    );
    const hasInvitation = result.data?.entries.some(
      (entry) =>
        entry.type === "invitation" && entry.email === "invited@example.com",
    );

    expect(hasUser).toBe(true);
    expect(hasInvitation).toBe(true);
  });

  it("returns empty array when no users or invitations", async () => {
    const result = await listProjectUsersAction({
      projectId: testProject.id,
      page: 1,
      limit: 10,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.entries).toBeDefined();
    expect(Array.isArray(result.data?.entries)).toBe(true);
    expect(result.data?.entries.length).toBe(0);
    expect(result.data?.total).toBe(0);
  });

  it("paginates results correctly", async () => {
    // Create multiple users
    for (let i = 0; i < 5; i++) {
      const user = await createTestUser({
        name: `User ${i}`,
        email: `user${i}@example.com`,
      });

      await db.projectUser.create({
        data: {
          projectId: testProject.id,
          userId: user.id,
          userType: "Client",
        },
      });
    }

    // Page 1
    const page1 = await listProjectUsersAction({
      projectId: testProject.id,
      page: 1,
      limit: 2,
    });

    expect(page1.data?.entries.length).toBe(2);
    expect(page1.data?.page).toBe(1);
    expect(page1.data?.limit).toBe(2);
    expect(page1.data?.total).toBe(5);
    expect(page1.data?.totalPages).toBe(3);

    // Page 2
    const page2 = await listProjectUsersAction({
      projectId: testProject.id,
      page: 2,
      limit: 2,
    });

    expect(page2.data?.entries.length).toBe(2);
    expect(page2.data?.page).toBe(2);
  });

  it("only shows pending invitations that haven't expired", async () => {
    // Create expired invitation
    const expiredAt = new Date();
    expiredAt.setDate(expiredAt.getDate() - 1);

    const expiredToken = generateUniqueString("expired-token");
    await db.projectInvitation.create({
      data: {
        projectId: testProject.id,
        email: "expired@example.com",
        userType: "Client",
        token: expiredToken,
        status: "PENDING",
        expiresAt: expiredAt,
        invitedById: testUser.id,
      },
    });

    // Create valid invitation
    const validAt = new Date();
    validAt.setDate(validAt.getDate() + 7);

    const validToken = generateUniqueString("valid-token");
    await db.projectInvitation.create({
      data: {
        projectId: testProject.id,
        email: "valid@example.com",
        userType: "Contractor",
        token: validToken,
        status: "PENDING",
        expiresAt: validAt,
        invitedById: testUser.id,
      },
    });

    const result = await listProjectUsersAction({
      projectId: testProject.id,
      page: 1,
      limit: 10,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.entries).toBeDefined();

    // Should only include valid invitation
    const hasExpired = result.data?.entries.some(
      (entry) =>
        entry.type === "invitation" && entry.email === "expired@example.com",
    );
    const hasValid = result.data?.entries.some(
      (entry) =>
        entry.type === "invitation" && entry.email === "valid@example.com",
    );

    expect(hasExpired).toBe(false);
    expect(hasValid).toBe(true);
  });

  it("does not show accepted or cancelled invitations", async () => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create accepted invitation
    const acceptedToken = generateUniqueString("accepted-token");
    await db.projectInvitation.create({
      data: {
        projectId: testProject.id,
        email: "accepted@example.com",
        userType: "Client",
        token: acceptedToken,
        status: "ACCEPTED",
        expiresAt,
        invitedById: testUser.id,
        acceptedAt: new Date(),
      },
    });

    // Create cancelled invitation
    const cancelledToken = generateUniqueString("cancelled-token");
    await db.projectInvitation.create({
      data: {
        projectId: testProject.id,
        email: "cancelled@example.com",
        userType: "Employee",
        token: cancelledToken,
        status: "CANCELLED",
        expiresAt,
        invitedById: testUser.id,
      },
    });

    // Create pending invitation
    const pendingToken = generateUniqueString("pending-token");
    await db.projectInvitation.create({
      data: {
        projectId: testProject.id,
        email: "pending@example.com",
        userType: "Legal",
        token: pendingToken,
        status: "PENDING",
        expiresAt,
        invitedById: testUser.id,
      },
    });

    const result = await listProjectUsersAction({
      projectId: testProject.id,
      page: 1,
      limit: 10,
    });

    expect(result.data?.success).toBe(true);

    // Should only include pending invitation
    const hasAccepted = result.data?.entries.some(
      (entry) =>
        entry.type === "invitation" && entry.email === "accepted@example.com",
    );
    const hasCancelled = result.data?.entries.some(
      (entry) =>
        entry.type === "invitation" && entry.email === "cancelled@example.com",
    );
    const hasPending = result.data?.entries.some(
      (entry) =>
        entry.type === "invitation" && entry.email === "pending@example.com",
    );

    expect(hasAccepted).toBe(false);
    expect(hasCancelled).toBe(false);
    expect(hasPending).toBe(true);
  });

  it("sorts entries by creation date descending", async () => {
    // Create users with delays to ensure different timestamps
    const user1 = await createTestUser({
      name: "User 1",
      email: "user1@example.com",
    });
    await db.projectUser.create({
      data: {
        projectId: testProject.id,
        userId: user1.id,
        userType: "Client",
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const user2 = await createTestUser({
      name: "User 2",
      email: "user2@example.com",
    });
    await db.projectUser.create({
      data: {
        projectId: testProject.id,
        userId: user2.id,
        userType: "Contractor",
      },
    });

    const result = await listProjectUsersAction({
      projectId: testProject.id,
      page: 1,
      limit: 10,
    });

    expect(result.data?.entries.length).toBeGreaterThanOrEqual(2);
    // Most recent should be first
    expect(result.data?.entries[0]?.createdAt.getTime()).toBeGreaterThanOrEqual(
      result.data?.entries[1]?.createdAt.getTime(),
    );
  });

  it("validates required projectId", async () => {
    const result = await listProjectUsersAction({
      projectId: "",
      page: 1,
      limit: 10,
    } as Parameters<typeof listProjectUsersAction>[0]);

    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("projectId");
  });

  it("throws error when user is not authenticated", async () => {
    mockNoAuthSession();

    const result = await listProjectUsersAction({
      projectId: testProject.id,
      page: 1,
      limit: 10,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("NEXT_REDIRECT");
    expect(result.serverError).toContain("/login");
  });

  it("throws error when project not found", async () => {
    const result = await listProjectUsersAction({
      projectId: "non-existent-id",
      page: 1,
      limit: 10,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("NEXT_NOT_FOUND");
  });

  it("throws error when user does not have permission", async () => {
    const otherUserProject = await db.project.create({
      data: {
        name: "Other User's Project",
        userId: otherUser.id,
      },
    });

    const result = await listProjectUsersAction({
      projectId: otherUserProject.id,
      page: 1,
      limit: 10,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("NEXT_REDIRECT");
    expect(result.serverError).toContain("/unauthorized");
  });

  it("allows project users to view users for the project", async () => {
    // Add testUser as a project user to otherUser's project
    const otherUserProject = await db.project.create({
      data: {
        name: "Other User's Project",
        userId: otherUser.id,
      },
    });

    await db.projectUser.create({
      data: {
        projectId: otherUserProject.id,
        userId: testUser.id,
        userType: "Client",
      },
    });

    const result = await listProjectUsersAction({
      projectId: otherUserProject.id,
      page: 1,
      limit: 10,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.entries).toBeDefined();
  });

  it("includes user information for project users", async () => {
    await db.projectUser.create({
      data: {
        projectId: testProject.id,
        userId: projectUser.id,
        userType: "Employee",
      },
    });

    const result = await listProjectUsersAction({
      projectId: testProject.id,
      page: 1,
      limit: 10,
    });

    expect(result.data?.success).toBe(true);
    const userEntry = result.data?.entries.find(
      (entry) => entry.type === "user" && entry.user?.id === projectUser.id,
    );

    expect(userEntry).toBeDefined();
    expect(userEntry?.type).toBe("user");
    expect(userEntry?.user).toBeDefined();
    expect(userEntry?.user?.name).toBe("Project User");
    expect(userEntry?.user?.email).toBe(projectUser.email);
    expect(userEntry?.userType).toBe("Employee");
  });

  it("includes user information for invitations with existing users", async () => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const uniqueToken = generateUniqueString("invitation-with-user-token");
    await db.projectInvitation.create({
      data: {
        projectId: testProject.id,
        email: projectUser.email,
        userId: projectUser.id,
        userType: "Legal",
        token: uniqueToken,
        status: "PENDING",
        expiresAt,
        invitedById: testUser.id,
      },
    });

    const result = await listProjectUsersAction({
      projectId: testProject.id,
      page: 1,
      limit: 10,
    });

    expect(result.data?.success).toBe(true);
    const invitationEntry = result.data?.entries.find(
      (entry) =>
        entry.type === "invitation" && entry.email === projectUser.email,
    );

    expect(invitationEntry).toBeDefined();
    expect(invitationEntry?.type).toBe("invitation");
    expect(invitationEntry?.user).toBeDefined();
    expect(invitationEntry?.user?.name).toBe("Project User");
    expect(invitationEntry?.email).toBe(projectUser.email);
    expect(invitationEntry?.invitation).toBeDefined();
  });

  it("shows email only for invitations without existing users", async () => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const uniqueToken = generateUniqueString("new-user-invitation-token");
    await db.projectInvitation.create({
      data: {
        projectId: testProject.id,
        email: "newuser@example.com",
        userType: "Contractor",
        token: uniqueToken,
        status: "PENDING",
        expiresAt,
        invitedById: testUser.id,
      },
    });

    const result = await listProjectUsersAction({
      projectId: testProject.id,
      page: 1,
      limit: 10,
    });

    expect(result.data?.success).toBe(true);
    const invitationEntry = result.data?.entries.find(
      (entry) =>
        entry.type === "invitation" && entry.email === "newuser@example.com",
    );

    expect(invitationEntry).toBeDefined();
    expect(invitationEntry?.type).toBe("invitation");
    expect(invitationEntry?.user).toBeNull();
    expect(invitationEntry?.email).toBe("newuser@example.com");
    expect(invitationEntry?.invitation).toBeDefined();
  });
});
