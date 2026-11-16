import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      "@escalate/contracts": path.resolve(__dirname, "./packages/contracts/src/asset-vector.ts"),
      "server-only": path.resolve(__dirname, "./tests/mocks/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "tests/**/*.test.ts",
      "apps/**/*.test.ts",
      "packages/**/*.test.ts",
    ],
    exclude: [
      "node_modules/**",
      ".next/**",
      ".agents/**",
      "tests/m2-challenger-stress-iteration2.test.ts",
    ],
  },
});
