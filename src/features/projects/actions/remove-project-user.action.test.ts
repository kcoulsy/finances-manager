import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/features/shared/lib/db/client";
import { sendEmail } from "@/features/shared/lib/utils/email";
import {
  createTestUser,
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/features/shared/testing/helpers";
import { removeProjectUserAction } from "./remove-project-user.action";

// Mock the email utility
vi.mock("@/features/shared/lib/utils/email", () => ({
  sendEmail: vi.fn(),
}));

describe("removeProjectUserAction", () => {
  let testUser: TestUser;
  let otherUser: TestUser;
  let projectUser: TestUser;
  let testProject: { id: string; name: string; userId: string };

  setupTestHooks();

  beforeEach(async () => {
    vi.clearAllMocks();
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

  it("removes a user from project successfully", async () => {
    // Add user to project
    await db.projectUser.create({
      data: {
        projectId: testProject.id,
        userId: projectUser.id,
        userType: "Client",
      },
    });

    const result = await removeProjectUserAction({
      projectId: testProject.id,
      userId: projectUser.id,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.message).toBe("User removed successfully");

    // Verify user was removed from project
    const projectUserRecord = await db.projectUser.findUnique({
      where: {
        projectId_userId: {
          projectId: testProject.id,
          userId: projectUser.id,
        },
      },
    });

    expect(projectUserRecord).toBeNull();

    // Verify email was sent to removed user
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const emailCall = vi.mocked(sendEmail).mock.calls[0]?.[0];
    expect(emailCall).toBeDefined();
    expect(emailCall?.to).toBe(projectUser.email);
    expect(emailCall?.subject).toContain("removed from");
    expect(emailCall?.subject).toContain("Test Project");
    expect(emailCall?.html).toContain("Project User");
    expect(emailCall?.html).toContain("Test Project");
    expect(emailCall?.html).toContain("Client");

    // Verify notification was created for removed user
    const notification = await db.notification.findFirst({
      where: {
        userId: projectUser.id,
      },
    });

    expect(notification).toBeDefined();
    expect(notification?.title).toContain("Removed from");
    expect(notification?.title).toContain("Test Project");
    expect(notification?.subtitle).toContain("removed you from");
    expect(notification?.link).toBe("/projects");
    expect(notification?.read).toBe(false);
  });

  it("validates required fields", async () => {
    const result = await removeProjectUserAction({
      projectId: "",
      userId: "",
    } as Parameters<typeof removeProjectUserAction>[0]);

    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("projectId");
    expect(result.validationErrors).toHaveProperty("userId");
  });

  it("throws error when user is not authenticated", async () => {
    mockNoAuthSession();

    const result = await removeProjectUserAction({
      projectId: testProject.id,
      userId: projectUser.id,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("logged in");
  });

  it("throws error when project not found", async () => {
    const result = await removeProjectUserAction({
      projectId: "non-existent-id",
      userId: projectUser.id,
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

    // Add a user to other user's project
    await db.projectUser.create({
      data: {
        projectId: otherUserProject.id,
        userId: projectUser.id,
        userType: "Client",
      },
    });

    const result = await removeProjectUserAction({
      projectId: otherUserProject.id,
      userId: projectUser.id,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("permission");
  });

  it("throws error when trying to remove project owner", async () => {
    const result = await removeProjectUserAction({
      projectId: testProject.id,
      userId: testUser.id,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("project owner");
  });

  it("throws error when user is not on the project", async () => {
    const result = await removeProjectUserAction({
      projectId: testProject.id,
      userId: projectUser.id,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("not on this project");
  });

  it("returns user-friendly toast message on success", async () => {
    await db.projectUser.create({
      data: {
        projectId: testProject.id,
        userId: projectUser.id,
        userType: "Employee",
      },
    });

    const result = await removeProjectUserAction({
      projectId: testProject.id,
      userId: projectUser.id,
    });

    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.message).toBe("User removed successfully");
    expect(result.data?.toast?.description).toContain("Project User");
    expect(result.data?.toast?.type).toBe("success");
  });
});
