import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    silent: 'passed-only',
    globals: true,
    environment: "jsdom",
    globalSetup: ["./src/features/shared/testing/global-setup.ts"],
    setupFiles: ["./src/features/shared/testing/setup.ts"],
    // Run tests sequentially to avoid database state conflicts
    sequence: {
      shuffle: false,
      concurrent: false,
    },
    env: {
      // Use dedicated test database - never use regular DATABASE_URL
      DATABASE_URL: process.env.TEST_DATABASE_URL || "file:./.test.db",
    },
    include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: ["node_modules", ".next", "dist"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        ".next/",
        "dist/",
        "**/*.config.{js,ts}",
        "**/setup.ts",
        "**/*.d.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
