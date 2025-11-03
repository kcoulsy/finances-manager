import { headers } from "next/headers";
import { beforeAll, beforeEach, vi } from "vitest";
import { auth } from "@/features/shared/lib/auth/config";
import { db } from "@/features/shared/lib/db/client";

/**
 * Test user data
 */
export interface TestUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  image?: string | null;
}

/**
 * Creates a test user in the database
 */
export async function createTestUser(
  overrides?: Partial<{
    name: string;
    email: string;
    emailVerified: boolean;
  }>,
): Promise<TestUser> {
  // Use a more unique email to avoid conflicts from rapid test execution
  // Combine timestamp with high-resolution timer and random number for better uniqueness
  const hrTime =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const uniqueEmail =
    overrides?.email ??
    `test-${Date.now()}-${hrTime}-${Math.random().toString(36).substring(2, 15)}@example.com`;

  try {
    const user = await db.user.create({
      data: {
        name: overrides?.name ?? "Test User",
        email: uniqueEmail,
        emailVerified: overrides?.emailVerified ?? true,
      },
    });

    return user;
  } catch (error) {
    // If unique constraint fails, retry with a more unique email
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      const hrTimeRetry =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const retryEmail = `test-${Date.now()}-${hrTimeRetry}-${Math.random().toString(36).substring(2, 15)}-retry@example.com`;
      const user = await db.user.create({
        data: {
          name: overrides?.name ?? "Test User",
          email: retryEmail,
          emailVerified: overrides?.emailVerified ?? true,
        },
      });
      return user;
    }
    throw error;
  }
}

/**
 * Mocks the auth API to return a session for the given user
 */
export function mockAuthSession(user: TestUser, roles: string[] = []): void {
  // Mock headers() to return mock headers
  vi.mocked(headers).mockResolvedValue(new Headers());

  // Mock auth.api.getSession to return a valid session with roles
  vi.mocked(auth.api.getSession).mockResolvedValue({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      image: user.image ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    session: {
      id: "test-session-id",
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      token: "test-token",
      createdAt: new Date(),
      updatedAt: new Date(),
      ipAddress: null,
      userAgent: null,
    },
    roles, // Include roles in the session
  });
}

/**
 * Mocks the auth API to return no session (unauthenticated)
 */
export function mockNoAuthSession(): void {
  vi.mocked(headers).mockResolvedValue(new Headers());
  vi.mocked(auth.api.getSession).mockResolvedValue(null);
}

/**
 * Sets up a test user and mocks their session
 * Returns the created user
 */
export async function setupTestUserWithSession(
  overrides?: Partial<{
    name: string;
    email: string;
    emailVerified: boolean;
  }>,
  roles?: string[],
): Promise<TestUser> {
  const user = await createTestUser(overrides);
  mockAuthSession(user, roles);
  return user;
}

/**
 * Creates a role in the database
 */
export async function createTestRole(name: string) {
  const role = await db.role.upsert({
    where: { name },
    update: {},
    create: {
      name,
    },
  });
  return role;
}

/**
 * Assigns roles to a user
 */
export async function assignRolesToUser(userId: string, roleNames: string[]) {
  // Ensure roles exist
  for (const roleName of roleNames) {
    await createTestRole(roleName);
  }

  // Get role IDs
  const roles = await db.role.findMany({
    where: { name: { in: roleNames } },
  });

  // Create UserRole entries (handle duplicates manually)
  for (const role of roles) {
    await db.userRole.upsert({
      where: {
        userId_roleId: {
          userId,
          roleId: role.id,
        },
      },
      update: {},
      create: {
        userId,
        roleId: role.id,
      },
    });
  }

  // Fetch user with roles to get the role names for session
  const userWithRoles = await db.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: {
        include: {
          role: true,
        },
      },
    },
  });

  return (
    userWithRoles?.userRoles.map(
      (userRole: { role: { name: string } }) => userRole.role.name,
    ) || []
  );
}

/**
 * Generates a unique email address for testing contacts
 * @param prefix - A prefix to identify the test (e.g., "create", "update", "delete")
 * @returns A unique email address
 */
export function generateUniqueContactEmail(prefix: string): string {
  const hrTime =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  return `${prefix}-${Date.now()}-${hrTime}-${Math.random().toString(36).substring(2, 15)}@example.com`;
}

/**
 * Sets up beforeEach hooks for mock initialization
 * Call this once in your test file
 *
 * Note: This does NOT clean up data - cleanup only happens:
 * - Once at the start of the entire test suite (global setup)
 * - Once at the end of the entire test suite (global teardown)
 *
 * This prevents cleanup from interfering between test files or individual tests.
 */
export function setupTestHooks(): void {
  // Reset mocks at the start of each test file to ensure clean state
  // This does NOT cleanup data - that happens only in global setup/teardown
  beforeAll(async () => {
    vi.resetAllMocks();
    // Ensure headers mock is initialized
    vi.mocked(headers).mockResolvedValue(new Headers());
  });

  // Initialize headers mock before each test
  beforeEach(async () => {
    // Just ensure headers mock is initialized
    vi.mocked(headers).mockResolvedValue(new Headers());
  });
}
