import { defineConfig } from "vitest/config";

// Tier 1 covers pure transforms only — all run in the default `node`
// environment. Generated icon sources are excluded so they are never collected.
export default defineConfig({
  test: {
    include: ["**/*.test.ts"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.output/**",
      "**/src/icons/**",
      "**/src/icons-*/**",
    ],
  },
});
