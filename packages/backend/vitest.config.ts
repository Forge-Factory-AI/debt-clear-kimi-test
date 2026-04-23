import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      exclude: [
        "prisma/seed.ts",
        "src/index.ts",
        "**/*.test.ts",
        "**/*.d.ts",
        "node_modules/**",
      ],
    },
  },
});
