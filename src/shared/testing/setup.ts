import "@testing-library/jest-dom";
import { execSync } from "child_process";
import { vi } from "vitest";

// Mock next/headers since it's a Next.js server API that doesn't work in Node.js
vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

// Mock the auth API since it's an external service
vi.mock("@/features/shared/lib/auth/config", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

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
