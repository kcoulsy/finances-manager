import "@testing-library/jest-dom";
import { execSync } from "node:child_process";
import { vi } from "vitest";

// Mock next/headers since it's a Next.js server API that doesn't work in Node.js
vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

// Mock the auth API - we'll use the real better-auth with test database,
// but need to mock it for testing purposes
vi.mock("@/features/shared/lib/auth/config", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/shared/lib/auth/config")
  >("@/features/shared/lib/auth/config");
  return {
    ...actual,
    auth: {
      ...actual.auth,
      api: {
        ...actual.auth.api,
        getSession: vi.fn(),
        signUpEmail: vi.fn(),
        signInEmail: vi.fn(),
        signOut: vi.fn(),
        changePassword: vi.fn(),
        resetPassword: vi.fn(),
        requestPasswordReset: vi.fn(),
        deleteUser: vi.fn(),
      },
    },
  };
});

// Mock Next.js navigation functions that throw errors
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    const error = new Error(`NEXT_REDIRECT: ${url}`) as Error & {
      digest?: string;
    };
    error.digest = `NEXT_REDIRECT;${url}`;
    throw error;
  }),
  notFound: vi.fn(() => {
    const error = new Error("NEXT_NOT_FOUND") as Error & { digest?: string };
    error.digest = "NEXT_NOT_FOUND";
    throw error;
  }),
}));

// Mock Next.js cache functions - revalidatePath is a no-op in tests
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// Ensure test database is set up
// Use dedicated test database - vitest.config.ts sets DATABASE_URL to test database
// Prefer TEST_DATABASE_URL if explicitly set, otherwise use the default test database
const testDbUrl =
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "file:./.test.db";
try {
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    stdio: "pipe",
    env: {
      ...process.env,
      DATABASE_URL: testDbUrl,
    },
  });
} catch (error) {
  // Ignore errors - database might already be set up
  console.warn("Database setup warning (this is usually fine):", error);
}

// Note: Cleanup is now handled by globalSetup (global-setup.ts)
// This file only handles mocks and database setup, not data cleanup
// Cleanup runs once at the start via globalSetup, which runs before any test files
