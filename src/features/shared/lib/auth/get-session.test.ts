import { beforeEach, describe, expect, it } from "vitest";
import {
  mockAuthSession,
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/features/shared/testing/helpers";
import { getSession } from "./get-session";

describe("getSession", () => {
  let testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    testUser = await setupTestUserWithSession();
  });

  it("returns session when user is authenticated", async () => {
    mockAuthSession(testUser);

    const session = await getSession();

    expect(session).toBeDefined();
    expect(session?.user).toBeDefined();
    expect(session?.user.id).toBe(testUser.id);
    expect(session?.user.email).toBe(testUser.email);
    expect(session?.user.name).toBe(testUser.name);
    expect(session?.session).toBeDefined();
  });

  it("returns null when user is not authenticated", async () => {
    mockNoAuthSession();

    const session = await getSession();

    expect(session).toBeNull();
  });

  it("returns session with roles when roles are included", async () => {
    const roles = ["ADMIN", "USER"];
    mockAuthSession(testUser, roles);

    const session = await getSession();

    expect(session).toBeDefined();
    expect(session?.roles).toBeDefined();
    expect(session?.roles).toEqual(roles);
  });

  it("returns session without roles when no roles are provided", async () => {
    mockAuthSession(testUser, []);

    const session = await getSession();

    expect(session).toBeDefined();
    expect(session?.roles).toBeDefined();
    expect(session?.roles).toEqual([]);
  });

  it("deduplicates session requests within the same request using React cache", async () => {
    mockAuthSession(testUser);

    // Call getSession multiple times
    const session1 = await getSession();
    const session2 = await getSession();
    const session3 = await getSession();

    // All should return the same session object (same reference)
    expect(session1).toBe(session2);
    expect(session2).toBe(session3);
  });

  it("returns session with all user properties", async () => {
    mockAuthSession(testUser);

    const session = await getSession();

    expect(session).toBeDefined();
    expect(session?.user.id).toBe(testUser.id);
    expect(session?.user.email).toBe(testUser.email);
    expect(session?.user.name).toBe(testUser.name);
    expect(session?.user.emailVerified).toBe(testUser.emailVerified);
    expect(session?.user.createdAt).toBeDefined();
    expect(session?.user.updatedAt).toBeDefined();
  });

  it("returns session with session properties", async () => {
    mockAuthSession(testUser);

    const session = await getSession();

    expect(session).toBeDefined();
    expect(session?.session).toBeDefined();
    expect(session?.session.id).toBe("test-session-id");
    expect(session?.session.userId).toBe(testUser.id);
    expect(session?.session.expiresAt).toBeDefined();
    expect(session?.session.token).toBe("test-token");
  });
});
