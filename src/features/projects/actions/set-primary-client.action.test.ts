import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/features/shared/lib/db/client";
import {
  createTestUser,
  generateUniqueEmail,
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/features/shared/testing/helpers";
import { setPrimaryClientAction } from "./set-primary-client.action";

describe("setPrimaryClientAction", () => {
  let testUser: TestUser;
  let clientUser: TestUser;
  let otherClientUser: TestUser;
  let contractorUser: TestUser;
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

    clientUser = await createTestUser({
      name: "Client User",
      email: generateUniqueEmail("client"),
    });

    otherClientUser = await createTestUser({
      name: "Other Client User",
      email: generateUniqueEmail("otherclient"),
    });

    contractorUser = await createTestUser({
      name: "Contractor User",
      email: generateUniqueEmail("contractor"),
    });

    // Add all users to project
    await db.projectUser.create({
      data: {
        projectId: testProject.id,
        userId: clientUser.id,
        userType: "Client",
      },
    });

    await db.projectUser.create({
      data: {
        projectId: testProject.id,
        userId: otherClientUser.id,
        userType: "Client",
      },
    });

    await db.projectUser.create({
      data: {
        projectId: testProject.id,
        userId: contractorUser.id,
        userType: "Contractor",
      },
    });
  });

  it("sets a Client user as primary client successfully", async () => {
    const result = await setPrimaryClientAction({
      projectId: testProject.id,
      userId: clientUser.id,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.message).toBe("Primary client updated");
    expect(result.data?.toast?.description).toContain("Client User");

    // Verify primary client was set
    const project = await db.project.findUnique({
      where: { id: testProject.id },
    });

    expect(project?.primaryClientId).toBe(clientUser.id);
  });

  it("changes primary client to another Client user", async () => {
    // Set initial primary client
    await db.project.update({
      where: { id: testProject.id },
      data: {
        primaryClientId: clientUser.id,
      },
    });

    const result = await setPrimaryClientAction({
      projectId: testProject.id,
      userId: otherClientUser.id,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.toast?.description).toContain("Other Client User");

    // Verify primary client was changed
    const project = await db.project.findUnique({
      where: { id: testProject.id },
    });

    expect(project?.primaryClientId).toBe(otherClientUser.id);
  });

  it("clears primary client when userId is not provided", async () => {
    // Set initial primary client
    await db.project.update({
      where: { id: testProject.id },
      data: {
        primaryClientId: clientUser.id,
      },
    });

    const result = await setPrimaryClientAction({
      projectId: testProject.id,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.toast?.message).toBe("Primary client cleared");
    expect(result.data?.toast?.description).toContain(
      "removed from this project",
    );

    // Verify primary client was cleared
    const project = await db.project.findUnique({
      where: { id: testProject.id },
    });

    expect(project?.primaryClientId).toBeNull();
  });

  it("returns error when user is not authenticated", async () => {
    mockNoAuthSession();

    const result = await setPrimaryClientAction({
      projectId: testProject.id,
      userId: clientUser.id,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("NEXT_REDIRECT");
    expect(result.serverError).toContain("/login");
  });

  it("returns error when project not found", async () => {
    const result = await setPrimaryClientAction({
      projectId: "non-existent-id",
      userId: clientUser.id,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("NEXT_NOT_FOUND");
  });

  it("returns error when user does not have permission", async () => {
    const otherUser = await createTestUser({
      name: "Other User",
      email: generateUniqueEmail("other"),
    });

    const otherUserProject = await db.project.create({
      data: {
        name: "Other User's Project",
        userId: otherUser.id,
      },
    });

    const result = await setPrimaryClientAction({
      projectId: otherUserProject.id,
      userId: clientUser.id,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).toContain("NEXT_REDIRECT");
    expect(result.serverError).toContain("/unauthorized");
  });

  it("returns error when user is not on the project", async () => {
    const nonProjectUser = await createTestUser({
      name: "Non Project User",
      email: generateUniqueEmail("nonproject"),
    });

    const result = await setPrimaryClientAction({
      projectId: testProject.id,
      userId: nonProjectUser.id,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(/not found.*project/i);
  });

  it("returns error when user is not a Client user type", async () => {
    const result = await setPrimaryClientAction({
      projectId: testProject.id,
      userId: contractorUser.id,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(
      /only clients.*primary client/i,
    );
  });

  it("validates required projectId", async () => {
    const result = await setPrimaryClientAction({
      projectId: "",
      userId: clientUser.id,
    } as Parameters<typeof setPrimaryClientAction>[0]);

    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("projectId");
  });

  it("handles database errors gracefully", async () => {
    // Delete the project to cause a foreign key constraint error
    await db.project.delete({
      where: { id: testProject.id },
    });

    const result = await setPrimaryClientAction({
      projectId: testProject.id,
      userId: clientUser.id,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.length).toBeGreaterThan(0);
  });
});
