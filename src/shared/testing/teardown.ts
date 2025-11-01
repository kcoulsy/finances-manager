import { cleanupTestData } from "./helpers";

/**
 * Global teardown - runs once after all test files complete
 * This cleans up all test data after the entire test suite finishes
 */
export async function teardown() {
  await cleanupTestData();
}

