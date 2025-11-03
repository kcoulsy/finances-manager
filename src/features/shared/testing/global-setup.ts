import { PrismaClient } from "@prisma/client";

/**
 * Global setup - runs once at the start of the entire test suite
 * This runs in a separate Node.js process, so:
 * - Cannot use Vitest mocks
 * - Cannot share module instances with test files
 * - Can access environment variables and file system
 *
 * Returns a teardown function that runs once after all tests complete.
 * This replaces the need for a separate globalTeardown config option.
 */
export async function setup() {
  // Use test database URL (same as in vitest.config.ts)
  const testDbUrl =
    process.env.TEST_DATABASE_URL ||
    process.env.DATABASE_URL ||
    "file:./.test.db";

  // Create a fresh Prisma client instance for this process
  // Note: This is a separate instance from the one used in tests
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: testDbUrl,
      },
    },
  });

  await prisma.$disconnect();

  // Return teardown function that runs after all tests complete
  return async () => {
    const teardownPrisma = new PrismaClient({
      datasources: {
        db: {
          url: testDbUrl,
        },
      },
    });

    await teardownPrisma.$disconnect();
  };
}
