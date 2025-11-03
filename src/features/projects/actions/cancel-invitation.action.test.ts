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
import { cancelInvitationAction } from "./cancel-invitation.action";

describe("cancelInvitationAction", () => {
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

    otherUser = await createTestUser({
      name: "Other User",
      email: "other@example.com",
    });
  });

  it("cancels a pending invitation successfully", async () => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await db.projectInvitation.create({
      data: {
        projectId: testProject.id,
        email: "invited@example.com",
        userType: "Client",
        token: generateUniqueString("test-token"),
        status: "PENDING",
        expiresAt,
        invitedById: testUser.id,
      },
    });

    const result = await cancelInvitationAction({
      invitationId: invitation.id,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.message).toBe("Invitation cancelled");

    // Verify invitation was cancelled
    const updatedInvitation = await db.projectInvitation.findUnique({
      where: { id: invitation.id },
    });

    expect(updatedInvitation?.status).toBe("CANCELLED");
  });

  it("validates required invitationId", async () => {
    const result = await cancelInvitationAction({
      invitationId: "",
    } as Parameters<typeof cancelInvitationAction>[0]);

    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("invitationId");
  });

  it("throws error when user is not authenticated", async () => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await db.projectInvitation.create({
      data: {
        projectId: testProject.id,
        email: "invited@example.com",
        userType: "Client",
        token: generateUniqueString("test-token"),
        status: "PENDING",
        expiresAt,
        invitedById: testUser.id,
      },
    });

    mockNoAuthSession();

    const result = await cancelInvitationAction({
      invitationId: invitation.id,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("NEXT_REDIRECT");
    expect(result.serverError).toContain("/login");
  });

  it("throws error when invitation not found", async () => {
    const result = await cancelInvitationAction({
      invitationId: "non-existent-id",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("not found");
  });

  it("throws error when user does not own project", async () => {
    const otherUserProject = await db.project.create({
      data: {
        name: "Other User's Project",
        userId: otherUser.id,
      },
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await db.projectInvitation.create({
      data: {
        projectId: otherUserProject.id,
        email: "invited@example.com",
        userType: "Client",
        token: generateUniqueString("test-token"),
        status: "PENDING",
        expiresAt,
        invitedById: otherUser.id,
      },
    });

    const result = await cancelInvitationAction({
      invitationId: invitation.id,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("NEXT_REDIRECT");
    expect(result.serverError).toContain("/unauthorized");
  });

  it("throws error when invitation already accepted", async () => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await db.projectInvitation.create({
      data: {
        projectId: testProject.id,
        email: "invited@example.com",
        userType: "Client",
        token: generateUniqueString("test-token"),
        status: "ACCEPTED",
        expiresAt,
        invitedById: testUser.id,
        acceptedAt: new Date(),
      },
    });

    const result = await cancelInvitationAction({
      invitationId: invitation.id,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("already been accepted or cancelled");
  });

  it("throws error when invitation already cancelled", async () => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await db.projectInvitation.create({
      data: {
        projectId: testProject.id,
        email: "invited@example.com",
        userType: "Client",
        token: generateUniqueString("test-token"),
        status: "CANCELLED",
        expiresAt,
        invitedById: testUser.id,
      },
    });

    const result = await cancelInvitationAction({
      invitationId: invitation.id,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("already been accepted or cancelled");
  });

  it("returns user-friendly toast message on success", async () => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await db.projectInvitation.create({
      data: {
        projectId: testProject.id,
        email: "invited@example.com",
        userType: "Contractor",
        token: generateUniqueString("test-token"),
        status: "PENDING",
        expiresAt,
        invitedById: testUser.id,
      },
    });

    const result = await cancelInvitationAction({
      invitationId: invitation.id,
    });

    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.message).toBe("Invitation cancelled");
    expect(result.data?.toast?.description).toBe(
      "The invitation has been cancelled.",
    );
    expect(result.data?.toast?.type).toBe("success");
  });
});
