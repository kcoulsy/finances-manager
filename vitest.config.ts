import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/shared/testing/setup.ts"],
    teardownFiles: ["./src/shared/testing/teardown.ts"],
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
