import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  // One output module per source file, so each icon tree-shakes on its own.
  unbundle: true,
  deps: {
    // Peer dependencies — never bundle them.
    neverBundle: ["react", "react/jsx-runtime", "motion"],
    // @jedd-icons/shared is an internal monorepo package — bundle it in so the
    // published package depends on no other Jedd package.
    alwaysBundle: ["@jedd-icons/shared"],
  },
});
