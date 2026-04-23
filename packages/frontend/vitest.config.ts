import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      exclude: [
        "src/main.tsx",
        "**/*.test.{ts,tsx}",
        "**/*.d.ts",
        "tailwind.config.js",
        "postcss.config.js",
        "vite.config.ts",
        "node_modules/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
