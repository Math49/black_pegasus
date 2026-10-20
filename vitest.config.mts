import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      include: ["src/domaine/**/*.ts"],
      exclude: ["src/domaine/**/*.test.ts"],
      thresholds: { lines: 95, functions: 95, branches: 95, statements: 95 },
    },
  },
});
