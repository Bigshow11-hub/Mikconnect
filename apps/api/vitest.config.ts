import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["test/**/*.test.ts", "src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/main.ts", "src/app.module.ts", "**/*.module.ts", "**/*.dto.ts"],
    },
  },
});
