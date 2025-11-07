import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/features/shared/lib/db/client";
import { sendEmail } from "@/features/shared/lib/utils/email";
import {
  createTestUser,
  generateUniqueEmail,
  mockAuthSession,
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/features/shared/testing/helpers";
import { createProjectAction } from "./create-project.action";

// Mock the email utility
vi.mock("@/features/shared/lib/utils/email", () => ({
  sendEmail: vi.fn(),
}));

describe("createProjectAction", () => {
  let testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    testUser = await setupTestUserWithSession();
    vi.clearAllMocks();
    vi.mocked(sendEmail).mockResolvedValue({
      success: true,
      messageId: "test-message-id",
    });
  });

  it("creates a project successfully with valid data", async () => {
    const result = await createProjectAction({
      name: "My Test Project",
      description: "This is a test project description",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.project).toBeDefined();
    expect(result.data?.project.name).toBe("My Test Project");
    expect(result.data?.project.description).toBe(
      "This is a test project description",
    );
    expect(result.data?.project.userId).toBe(testUser.id);
    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.message).toBe("Project created successfully");

    const project = await db.project.findUnique({
      where: { id: result.data?.project.id },
    });

    expect(project).toBeDefined();
    expect(project?.name).toBe("My Test Project");
    expect(project?.description).toBe("This is a test project description");
    expect(project?.userId).toBe(testUser.id);
  });

  it("creates a project without description", async () => {
    const result = await createProjectAction({
      name: "Project Without Description",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.project).toBeDefined();
    expect(result.data?.project.name).toBe("Project Without Description");
    expect(result.data?.project.description).toBeNull();

    const project = await db.project.findUnique({
      where: { id: result.data?.project.id },
    });

    expect(project?.description).toBeNull();
  });

  it("validates required fields", async () => {
    const result = await createProjectAction({
      name: "",
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("name");
    expect(result.validationErrors?.name).toHaveProperty("_errors");
    expect(Array.isArray(result.validationErrors?.name?._errors)).toBe(true);
    expect(result.validationErrors?.name?._errors?.[0]).toBe(
      "Project name is required",
    );
  });

  it("validates name max length", async () => {
    const longName = "a".repeat(101); // 101 characters, max is 100

    const result = await createProjectAction({
      name: longName,
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("name");
    expect(result.validationErrors?.name).toHaveProperty("_errors");
    expect(Array.isArray(result.validationErrors?.name?._errors)).toBe(true);
    expect(result.validationErrors?.name?._errors?.[0]).toBe(
      "Project name must be less than 100 characters",
    );
  });

  it("validates description max length", async () => {
    const longDescription = "a".repeat(501); // 501 characters, max is 500

    const result = await createProjectAction({
      name: "Valid Project Name",
      description: longDescription,
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("description");
    expect(result.validationErrors?.description).toHaveProperty("_errors");
    expect(Array.isArray(result.validationErrors?.description?._errors)).toBe(
      true,
    );
    expect(result.validationErrors?.description?._errors?.[0]).toBe(
      "Description must be less than 500 characters",
    );
  });

  it("throws error when user is not authenticated", async () => {
    mockNoAuthSession();

    const result = await createProjectAction({
      name: "Test Project",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("Unauthorized");
  });

  it("throws error when session is invalid", async () => {
    mockNoAuthSession();

    const result = await createProjectAction({
      name: "Test Project",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("Unauthorized");
  });

  it("handles database errors gracefully", async () => {
    // Create a fresh user for this test to avoid interfering with other tests
    const errorTestUser = await setupTestUserWithSession();

    // Delete the user to cause a foreign key constraint error
    await db.user.delete({
      where: { id: errorTestUser.id },
    });

    // Update the session mock to use the deleted user ID
    mockAuthSession(errorTestUser);

    const result = await createProjectAction({
      name: "Test Project",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.length).toBeGreaterThan(0);
  });

  it("creates multiple projects for the same user", async () => {
    const project1 = await createProjectAction({
      name: "Project 1",
      description: "First project",
    });

    const project2 = await createProjectAction({
      name: "Project 2",
      description: "Second project",
    });

    expect(project1.data?.success).toBe(true);
    expect(project2.data?.success).toBe(true);

    const projects = await db.project.findMany({
      where: { userId: testUser.id },
    });

    expect(projects).toHaveLength(2);
    expect(projects.map((p: { name: string }) => p.name)).toContain(
      "Project 1",
    );
    expect(projects.map((p: { name: string }) => p.name)).toContain(
      "Project 2",
    );
  });

  it("creates a project with self as primary client", async () => {
    const result = await createProjectAction({
      name: "Project with Primary Client",
      description: "Project with self as primary client",
      primaryClientId: testUser.id,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.project).toBeDefined();
    expect(result.data?.project.name).toBe("Project with Primary Client");

    // Verify primary client is set
    const project = await db.project.findUnique({
      where: { id: result.data?.project.id },
      include: {
        primaryClient: true,
      },
    });

    expect(project?.primaryClientId).toBe(testUser.id);
    expect(project?.primaryClient?.id).toBe(testUser.id);
    expect(project).not.toBeNull();

    // Verify user was added to project as Client
    const projectUser = await db.projectUser.findUnique({
      where: {
        projectId_userId: {
          projectId: project?.id ?? "",
          userId: testUser.id,
        },
      },
    });

    expect(projectUser).toBeDefined();
    expect(projectUser?.userType).toBe("Client");

    expect(result.data?.toast?.description).toContain(
      "with you as the primary client",
    );
  });

  it("creates a project with another user as primary client and invites them", async () => {
    const primaryClientUser = await createTestUser({
      name: "Primary Client User",
      email: generateUniqueEmail("primary"),
    });

    const result = await createProjectAction({
      name: "Project with External Primary Client",
      description: "Project with another user as primary client",
      primaryClientId: primaryClientUser.id,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.project).toBeDefined();

    // Verify primary client is set
    const project = await db.project.findUnique({
      where: { id: result.data?.project.id },
      include: {
        primaryClient: true,
      },
    });

    expect(project?.primaryClientId).toBe(primaryClientUser.id);
    expect(project?.primaryClient?.id).toBe(primaryClientUser.id);

    expect(project).not.toBeNull();

    // Verify invitation was created
    const invitation = await db.projectInvitation.findFirst({
      where: {
        projectId: project?.id ?? "",
        email: primaryClientUser.email,
        status: "PENDING",
      },
    });

    expect(invitation).toBeDefined();
    expect(invitation?.userType).toBe("Client");
    expect(invitation?.userId).toBe(primaryClientUser.id);

    // Verify email was sent
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: primaryClientUser.email,
        subject: expect.stringContaining("invited to join"),
      }),
    );

    // Verify notification was created
    const notification = await db.notification.findFirst({
      where: {
        userId: primaryClientUser.id,
      },
    });

    expect(notification).toBeDefined();
    expect(notification?.title).toContain("invited to join");
    expect(notification?.title).toContain("primary client");

    expect(result.data?.toast?.description).toContain(
      "primary client has been invited",
    );
  });

  it("creates a project with primary client via email lookup", async () => {
    const primaryClientUser = await createTestUser({
      name: "Primary Client User",
      email: generateUniqueEmail("primary"),
    });

    const result = await createProjectAction({
      name: "Project with Email Primary Client",
      primaryClientId: `email:${primaryClientUser.email}`,
    });

    expect(result.data?.success).toBe(true);

    // Verify primary client is set
    const project = await db.project.findUnique({
      where: { id: result.data?.project.id },
    });

    expect(project?.primaryClientId).toBe(primaryClientUser.id);

    expect(project).not.toBeNull();

    // Verify invitation was created
    const invitation = await db.projectInvitation.findFirst({
      where: {
        projectId: project?.id ?? "",
        email: primaryClientUser.email,
      },
    });

    expect(invitation).toBeDefined();
  });

  it("returns error when primary client user not found", async () => {
    const result = await createProjectAction({
      name: "Project with Invalid Primary Client",
      primaryClientId: "non-existent-user-id",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(
      /primary client.*not found/i,
    );
  });

  it("returns error when primary client email not found", async () => {
    const result = await createProjectAction({
      name: "Project with Invalid Email",
      primaryClientId: "email:nonexistent@example.com",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(
      /primary client.*not found|must have a user account/i,
    );
  });
});
